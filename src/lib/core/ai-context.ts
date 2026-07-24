// AIContextBuilder (aiprompt §18): assembles the run prompt from the action,
// mode, workspace metadata, AI Brief and the relevant slice of todo data —
// NEVER the whole database. Also emits the output contract: which envelope
// blocks the action must produce and which proposal kinds it may use.
// The provider's own project instructions (CLAUDE.md etc.) are NOT read or
// merged here — the CLI runs in the workspace and picks them up natively (§19).

import { STATUS_LABEL, locationPath } from "./activity";
import { ACTION_MODES, type AIAction, type WorkspaceLink } from "./ai-types";
import type { DomainData, Subtask, Todo } from "./types";

/** Caps keeping run context bounded (§18: no full-DB dumps). */
export const MAX_SNAPSHOT_TODOS = 150;
const MAX_DESCRIPTION_CHARS = 2000;
const MAX_ACTIVITY_LINES = 5;

export interface RunPromptParams {
  action: AIAction;
  listId: string;
  todoId: string | null;
  /** Ask Workspace's single free-text question. */
  question: string | null;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n[…truncated]`;
}

function modeSection(action: AIAction): string {
  if (ACTION_MODES[action] === "execute") {
    return "Mode: EXECUTE. You may modify files inside this workspace to complete the task. Never touch anything outside the workspace directory.";
  }
  return "Mode: READ-ONLY. Inspect the workspace but do not create, modify or delete any files, and do not run commands that change state.";
}

function todoSection(data: DomainData, todo: Todo, subtasks: Subtask[]): string {
  const lines: string[] = [
    `## The selected todo`,
    `Title: ${todo.title}`,
    `Status: ${STATUS_LABEL[todo.status]}`,
    `Location: ${locationPath(data, todo.listId, todo.groupId)}`,
  ];
  if (todo.description !== "") {
    lines.push(`Description:\n${truncate(todo.description, MAX_DESCRIPTION_CHARS)}`);
  }
  if (subtasks.length > 0) {
    lines.push(
      "Subtasks:",
      ...subtasks.map((s) => `- [${s.checked ? "x" : " "}] ${s.text} (subtaskId: ${s.id})`),
    );
  }
  const recent = data.activity
    .filter((event) => event.todoId === todo.id)
    .slice(-MAX_ACTIVITY_LINES)
    .map((event) => `- ${event.summary}`);
  if (recent.length > 0) lines.push("Recent activity:", ...recent);
  return lines.join("\n");
}

/** Compact "[id] title — status" snapshot of the list (suggest/reconcile). */
function listSnapshot(data: DomainData, listId: string): string {
  const todos = data.todos
    .filter((t) => t.listId === listId && !t.trashed)
    .slice(0, MAX_SNAPSHOT_TODOS);
  if (todos.length === 0) return "## Current todos in this list\n(none)";
  const lines = todos.map((t) => {
    const flags = t.archived ? ", archived" : "";
    return `- [${t.id}] ${t.title} — ${STATUS_LABEL[t.status]}${flags}`;
  });
  return `## Current todos in this list\n${lines.join("\n")}`;
}

function groupCatalog(data: DomainData, listId: string): string {
  const groups = data.groups.filter((g) => g.listId === listId);
  if (groups.length === 0) return "";
  const lines = groups.map(
    (g) => `- [${g.id}] ${locationPath(data, listId, g.id)}`,
  );
  return `## Groups in this list (for moveTodo targets)\n${lines.join("\n")}`;
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
    "ProposalAction is one of:",
    "```",
    `{"kind": "createTodo", "listId": "${listId}", "groupId": string|null, "title": string, "description": string}
{"kind": "updateTodo", "todoId": string, "title": string|null, "description": string|null}
{"kind": "changeStatus", "todoId": string, "status": "open"|"progress"|"done"|"cancelled"}
{"kind": "addSubtask", "todoId": string, "text": string}
{"kind": "updateSubtask", "subtaskId": string, "text": string|null, "checked": boolean|null}
{"kind": "moveTodo", "todoId": string, "listId": "${listId}", "groupId": string|null}
{"kind": "archiveTodo", "todoId": string}`,
    "```",
    "Rules: reference todos/subtasks/groups ONLY by the ids given in brackets above. Proposals are suggestions — the user reviews them; nothing is applied automatically. Never propose anything else (no SQL, no shell commands as proposals).",
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
    modeSection(params.action),
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
