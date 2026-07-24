// Proposal parsing: unknown JSON → strongly-typed AIProposal (aiprompt §25).
// Used both for persisted run rows and for normalized provider output.
// Parsing is lenient at the collection level (an invalid entry is dropped,
// the rest survive) but strict per entry — a proposal either matches its
// kind's full shape or it is rejected. Domain validation (existing ids,
// group depth, archive semantics) happens separately at apply time.

import type { AIProposal, ProposalAction } from "./ai-types";
import { isTodoStatus } from "./types";

function str(v: unknown): v is string {
  return typeof v === "string";
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** Strict shape check for one action; null = unusable. */
export function parseProposalAction(raw: unknown): ProposalAction | null {
  if (typeof raw !== "object" || raw === null) return null;
  const v = raw as Record<string, unknown>;
  switch (v.kind) {
    case "createTodo":
      if (!str(v.listId) || !str(v.title) || v.title.trim() === "") return null;
      return {
        kind: "createTodo",
        listId: v.listId,
        groupId: strOrNull(v.groupId),
        title: v.title.trim(),
        description: str(v.description) ? v.description : "",
      };
    case "updateTodo": {
      if (!str(v.todoId)) return null;
      const title = strOrNull(v.title);
      const description = str(v.description) ? v.description : null;
      if (title === null && description === null) return null; // empty update
      return { kind: "updateTodo", todoId: v.todoId, title, description };
    }
    case "changeStatus":
      if (!str(v.todoId) || !isTodoStatus(v.status)) return null;
      return { kind: "changeStatus", todoId: v.todoId, status: v.status };
    case "addSubtask":
      if (!str(v.todoId) || !str(v.text) || v.text.trim() === "") return null;
      return { kind: "addSubtask", todoId: v.todoId, text: v.text.trim() };
    case "updateSubtask": {
      if (!str(v.subtaskId)) return null;
      const text = strOrNull(v.text);
      const checked = typeof v.checked === "boolean" ? v.checked : null;
      if (text === null && checked === null) return null;
      return { kind: "updateSubtask", subtaskId: v.subtaskId, text, checked };
    }
    case "moveTodo":
      if (!str(v.todoId) || !str(v.listId)) return null;
      return { kind: "moveTodo", todoId: v.todoId, listId: v.listId, groupId: strOrNull(v.groupId) };
    case "archiveTodo":
      if (!str(v.todoId)) return null;
      return { kind: "archiveTodo", todoId: v.todoId };
    default:
      return null; // unknown kind — never crash on new/garbled provider output
  }
}

/** One reviewable proposal row; null = dropped. */
export function parseProposal(raw: unknown): AIProposal | null {
  if (typeof raw !== "object" || raw === null) return null;
  const v = raw as Record<string, unknown>;
  if (!str(v.id) || !str(v.label) || v.label === "") return null;
  const action = parseProposalAction(v.action);
  if (action === null) return null;
  return {
    id: v.id,
    label: v.label,
    recommended: typeof v.recommended === "boolean" ? v.recommended : false,
    applied: typeof v.applied === "boolean" ? v.applied : false,
    action,
  };
}

export function parseProposals(raw: unknown): AIProposal[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseProposal).filter((p): p is AIProposal => p !== null);
}
