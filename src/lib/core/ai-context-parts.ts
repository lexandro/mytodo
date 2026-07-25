// Shared prompt sections used by both the preset-action prompt
// (ai-context.ts) and the chat prompt (ai-chat.ts). Pure string assembly —
// the caller decides which sections a given run needs, so no prompt ever
// dumps more of the database than its job requires (aiprompt §18).

import { STATUS_LABEL, locationPath } from "./activity";
import type { AIMode } from "./ai-types";
import type { DomainData, Subtask, Todo } from "./types";

/** Caps keeping run context bounded (§18: no full-DB dumps). */
export const MAX_SNAPSHOT_TODOS = 150;
const MAX_DESCRIPTION_CHARS = 2000;
const MAX_ACTIVITY_LINES = 5;

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n[…truncated]`;
}

export function modeSection(mode: AIMode): string {
  if (mode === "execute") {
    return "Mode: EXECUTE. You may modify files inside this workspace to complete the task. Never touch anything outside the workspace directory.";
  }
  return "Mode: READ-ONLY. Inspect the workspace but do not create, modify or delete any files, and do not run commands that change state.";
}

export function todoSection(data: DomainData, todo: Todo, subtasks: Subtask[]): string {
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

/** Compact "[id] title — status" snapshot of the list (suggest/reconcile/chat). */
export function listSnapshot(data: DomainData, listId: string, heading = "Current todos in this list"): string {
  const todos = data.todos
    .filter((t) => t.listId === listId && !t.trashed)
    .slice(0, MAX_SNAPSHOT_TODOS);
  if (todos.length === 0) return `## ${heading}\n(none)`;
  const lines = todos.map((t) => {
    const flags = t.archived ? ", archived" : "";
    return `- [${t.id}] ${t.title} — ${STATUS_LABEL[t.status]}${flags}`;
  });
  return `## ${heading}\n${lines.join("\n")}`;
}

export function groupCatalog(data: DomainData, listId: string): string {
  const groups = data.groups.filter((g) => g.listId === listId);
  if (groups.length === 0) return "";
  const lines = groups.map((g) => `- [${g.id}] ${locationPath(data, listId, g.id)}`);
  return `## Groups in this list (for moveTodo targets)\n${lines.join("\n")}`;
}

/** The only mutations the AI may ever propose (§25–26). */
export function proposalActionDoc(listId: string): string {
  return [
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
