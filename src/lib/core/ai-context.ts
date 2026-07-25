// AIContextBuilder (aiprompt §18) for the PRESET actions: assembles the run
// prompt from the action, mode, workspace metadata, AI Brief and the relevant
// slice of todo data — NEVER the whole database. Also emits the output
// contract: which envelope blocks the action must produce and which proposal
// kinds it may use. The free-form conversation prompt lives in ai-chat.ts;
// the shared section builders in ai-context-parts.ts.
// The provider's own project instructions (CLAUDE.md etc.) are NOT read or
// merged here — the CLI runs in the workspace and picks them up natively (§19).

import {
  groupCatalog, listSnapshot, modeSection, proposalActionDoc, todoSection,
} from "./ai-context-parts";
import { ACTION_MODES, type AIAction, type WorkspaceLink } from "./ai-types";
import type { DomainData } from "./types";

export interface RunPromptParams {
  action: AIAction;
  listId: string;
  todoId: string | null;
  /** Ask Workspace's single free-text question. */
  question: string | null;
}

const ACTION_INSTRUCTIONS: Record<AIAction, string> = {
  investigate:
    "Investigate the workspace with respect to the selected todo: what is the current state, where is the relevant code/content, what is likely causing the problem or what is missing. Report findings; you may propose todo changes.",
  breakIntoSubtasks:
    "Break the selected todo into a practical, ordered set of subtasks based on what the workspace actually contains. Propose them as addSubtask proposals — do not implement anything.",
  planImplementation:
    "Produce a concrete implementation plan for the selected todo grounded in this workspace's real structure. Present the plan as findings (one step per finding); you may add proposals.",
  implement:
    "Implement the selected todo in this workspace. Make the necessary file changes. Summarize what you changed (mention changed files in findings); you may propose a status change reflecting the result.",
  verify:
    "Verify whether the selected todo is actually done, based on evidence in the workspace (implementation, tests, docs, git state if available). Fill the verdict block (complete | partial | incomplete | uncertain) with a one-line why, add checks (ok=true/false rows), and put a status suggestion into recommendation with a changeStatus proposal. Never change anything.",
  analyzeWorkspace:
    "Analyze this workspace generally: what it is, its current state, notable gaps or risks. The workspace may be code, documentation, marketing or anything else — adapt. Report a summary and findings.",
  suggestTodos:
    "Based on the workspace's actual state, suggest new todos that would be worth adding to this list. Avoid duplicating the existing todos listed above. Emit each as a createTodo proposal.",
  reconcile:
    "Compare the todo list above with the workspace's actual state. Fill the mapping block: one row per relevant todo with tone done (likely completed), missing (still missing), partial (partially completed) — plus tone new for work you found that has no todo. Propose concrete changes (changeStatus, createTodo, addSubtask, archiveTodo).",
  askWorkspace:
    "Answer the user's question below using this workspace's contents. Put the answer into the answer block. One question, one answer — no follow-up dialogue.",
  // chat never goes through this builder — see ai-chat.ts
  chat: "",
};

/** Envelope blocks each action is expected to fill. */
const ACTION_BLOCKS: Record<AIAction, string[]> = {
  investigate: ["summary", "findings", "proposals?"],
  breakIntoSubtasks: ["summary", "proposals (addSubtask)"],
  planImplementation: ["summary", "findings (plan steps)", "proposals?"],
  implement: ["summary", "findings (changed files)", "proposals?"],
  verify: ["summary", "verdict", "checks", "recommendation"],
  analyzeWorkspace: ["summary", "findings"],
  suggestTodos: ["summary", "proposals (createTodo)"],
  reconcile: ["summary", "mapping", "proposals"],
  askWorkspace: ["answer", "summary?"],
  chat: ["summary"],
};

function contractSection(action: AIAction, listId: string): string {
  return [
    "## Output contract",
    "End your reply with EXACTLY ONE fenced ```json block (the envelope). Everything outside it is ignored.",
    `Fill these fields: ${ACTION_BLOCKS[action].join(", ")}. Omit fields you have nothing for.`,
    "Envelope schema:",
    "```",
    `{
  "summary": string,
  "findings": string[],
  "checks": [{"ok": boolean, "text": string}],
  "mapping": [{"text": string, "tone": "done"|"missing"|"partial"|"new"}],
  "verdict": {"value": "complete"|"partial"|"incomplete"|"uncertain", "why": string},
  "recommendation": {"text": string, "proposal": ProposalAction},
  "answer": string,
  "proposals": ProposalAction[]
}`,
    "```",
    proposalActionDoc(listId),
  ].join("\n");
}

/**
 * The full run prompt. Pure assembly — the caller passes the domain slice;
 * filesystem truth (project instructions, code) is the CLI's own job.
 */
export function buildRunPrompt(
  data: DomainData,
  link: WorkspaceLink,
  params: RunPromptParams,
): string {
  const list = data.lists.find((l) => l.id === params.listId);
  const todo = params.todoId === null ? undefined : data.todos.find((t) => t.id === params.todoId);
  const sections: string[] = [
    "You are an AI agent working inside myTODO, a local todo workspace app. The current working directory is the workspace linked to the user's todo list — work in it directly.",
    modeSection(ACTION_MODES[params.action]),
    `Workspace type: ${link.type === "git" ? "Git repository" : "generic directory"}. Todo list: "${list?.name ?? "?"}".`,
  ];
  if (link.brief.trim() !== "") {
    sections.push(`## Workspace brief (from the user)\n${link.brief.trim()}`);
  }
  if (todo !== undefined) {
    const subtasks = data.subtasks
      .filter((s) => s.todoId === todo.id)
      .sort((a, b) => a.order - b.order);
    sections.push(todoSection(data, todo, subtasks));
    sections.push(`(todoId of the selected todo: ${todo.id})`);
    sections.push(groupCatalog(data, params.listId));
  }
  if (params.action === "suggestTodos" || params.action === "reconcile") {
    sections.push(listSnapshot(data, params.listId));
    sections.push(groupCatalog(data, params.listId));
  }
  sections.push(`## Your task\n${ACTION_INSTRUCTIONS[params.action]}`);
  if (params.action === "askWorkspace" && params.question !== null) {
    sections.push(`## The user's question\n${params.question.trim()}`);
  }
  sections.push(contractSection(params.action, params.listId));
  return sections.filter((s) => s !== "").join("\n\n");
}
