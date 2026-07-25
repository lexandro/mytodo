// Conversation prompts. The first turn carries the full context (workspace,
// brief, todo list, optional selected todo); follow-up turns run in the
// provider's RESUMED session, so they only carry what may have changed —
// the refreshed list snapshot — plus the user's message.
// Proposals stay optional here: a chat answer is prose, and the envelope is
// only needed when the AI actually wants to change todos.

import { groupCatalog, listSnapshot, modeSection, proposalActionDoc, todoSection } from "./ai-context-parts";
import type { AIMode, WorkspaceLink } from "./ai-types";
import type { DomainData } from "./types";

export interface ChatPromptParams {
  listId: string;
  /** Bound todo when the conversation was opened from one; null = list scope. */
  todoId: string | null;
  /** What the user typed for this turn. */
  message: string;
  mode: AIMode;
  /** false = the provider session is being resumed, context is already there. */
  firstTurn: boolean;
}

function chatRules(listId: string): string {
  return [
    "## How to answer",
    "Reply conversationally in plain text — this is a dialogue, and the user sees your prose as-is.",
    "Only if you want to CHANGE todos, append exactly one fenced ```json block at the very end:",
    "```",
    `{"summary": string, "proposals": ProposalAction[]}`,
    "```",
    "Without changes to propose, write no json block at all.",
    proposalActionDoc(listId),
  ].join("\n");
}

/**
 * One conversation turn's prompt. `firstTurn` decides how much context is
 * repeated: everything the session cannot already know.
 */
export function buildChatPrompt(
  data: DomainData,
  link: WorkspaceLink,
  params: ChatPromptParams,
): string {
  const message = params.message.trim();
  if (!params.firstTurn) {
    return [
      listSnapshot(data, params.listId, "Current todos in this list (refreshed)"),
      `## The user says\n${message}`,
    ].join("\n\n");
  }

  const list = data.lists.find((l) => l.id === params.listId);
  const todo = params.todoId === null ? undefined : data.todos.find((t) => t.id === params.todoId);
  const sections: string[] = [
    "You are an AI agent working inside myTODO, a local todo workspace app. The current working directory is the workspace linked to the user's todo list — work in it directly. The user is chatting with you about this list and workspace, and will keep replying, so keep answers focused and ask when something is ambiguous.",
    modeSection(params.mode),
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
  }
  sections.push(listSnapshot(data, params.listId));
  sections.push(groupCatalog(data, params.listId));
  sections.push(chatRules(params.listId));
  sections.push(`## The user says\n${message}`);
  return sections.filter((s) => s !== "").join("\n\n");
}
