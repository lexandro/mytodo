// Proposal validation + application (aiprompt §26–§29). Validation enforces
// the SAME rules as manual edits; application goes through the normal
// domain ops, so activity logging, ordering and timestamps behave exactly
// like a hand-made change. The caller wraps applyProposals in ONE
// store.apply — that is what makes the batch a single undo step.

import { logActivity } from "./activity";
import type { AIProposal, ProposalAction } from "./ai-types";
import { addSubtask, editSubtask, toggleSubtask } from "./subtasks-ops";
import { setArchived, setDescription } from "./todos-detail-ops";
import { createTodo, findTodo, moveTodo, renameTodo, setStatus } from "./todos-ops";
import type { DomainData, Todo } from "./types";

/** Human error for an unusable proposal; null = valid. All checks mirror
 * manual-edit rules (§27); proposals may only touch the run's own list. */
export function validateProposal(
  data: DomainData,
  action: ProposalAction,
  runListId: string,
): string | null {
  const todoInRunList = (todoId: string): Todo | string => {
    const todo = findTodo(data, todoId);
    if (todo === undefined || todo.trashed) return "The referenced todo no longer exists.";
    if (todo.listId !== runListId) return "The referenced todo belongs to another list.";
    return todo;
  };
  const groupInList = (groupId: string | null): string | null => {
    if (groupId === null) return null;
    const group = data.groups.find((g) => g.id === groupId);
    if (group === undefined) return "The target group no longer exists.";
    if (group.listId !== runListId) return "The target group belongs to another list.";
    return null; // existing groups always satisfy the ≤3 depth cap
  };

  switch (action.kind) {
    case "createTodo": {
      if (action.listId !== runListId) return "Proposals may only create todos in this list.";
      return groupInList(action.groupId);
    }
    case "moveTodo": {
      const todo = todoInRunList(action.todoId);
      if (typeof todo === "string") return todo;
      if (action.listId !== runListId) return "Proposals may only move todos within this list.";
      return groupInList(action.groupId);
    }
    case "changeStatus": {
      const todo = todoInRunList(action.todoId);
      return typeof todo === "string" ? todo : null;
    }
    case "updateTodo": {
      const todo = todoInRunList(action.todoId);
      return typeof todo === "string" ? todo : null;
    }
    case "addSubtask": {
      const todo = todoInRunList(action.todoId);
      return typeof todo === "string" ? todo : null;
    }
    case "archiveTodo": {
      const todo = todoInRunList(action.todoId);
      if (typeof todo === "string") return todo;
      return todo.archived ? "This todo is already archived." : null;
    }
    case "updateSubtask": {
      const subtask = data.subtasks.find((s) => s.id === action.subtaskId);
      if (subtask === undefined) return "The referenced subtask no longer exists.";
      const owner = todoInRunList(subtask.todoId);
      return typeof owner === "string" ? owner : null;
    }
  }
}

/** Returns the id of the todo this action created, or null for the rest. */
function applyAction(data: DomainData, action: ProposalAction, now: number): string | null {
  switch (action.kind) {
    case "createTodo": {
      const todo = createTodo(data, action.listId, action.groupId, action.title, now);
      if (action.description !== "") setDescription(data, todo.id, action.description, now);
      return todo.id;
    }
    case "updateTodo":
      if (action.title !== null) renameTodo(data, action.todoId, action.title, now);
      if (action.description !== null) setDescription(data, action.todoId, action.description, now);
      break;
    case "changeStatus":
      setStatus(data, action.todoId, action.status, now);
      break;
    case "addSubtask":
      addSubtask(data, action.todoId, action.text, now);
      break;
    case "updateSubtask": {
      if (action.text !== null) editSubtask(data, action.subtaskId, action.text);
      const subtask = data.subtasks.find((s) => s.id === action.subtaskId);
      if (action.checked !== null && subtask !== undefined && subtask.checked !== action.checked) {
        toggleSubtask(data, action.subtaskId, now);
      }
      break;
    }
    case "moveTodo":
      moveTodo(data, action.todoId, action.listId, action.groupId, now);
      break;
    case "archiveTodo":
      setArchived(data, action.todoId, true, now);
      break;
  }
  return null;
}

/** The todo whose activity log records the AI-applied entry. */
function activityTargetId(data: DomainData, action: ProposalAction): string | null {
  switch (action.kind) {
    case "createTodo":
      return null; // createTodo already logs "Created" on the new todo
    case "updateSubtask": {
      const subtask = data.subtasks.find((s) => s.id === action.subtaskId);
      return subtask?.todoId ?? null;
    }
    default:
      return action.todoId;
  }
}

export interface ApplyOutcome {
  appliedIds: string[];
  /** Todos the batch created — the caller slots them per the Behavior setting. */
  createdTodoIds: string[];
  /** proposalId → human error for the ones that failed validation. */
  errors: Record<string, string>;
}

/**
 * Validates and applies the given proposals against the live data. Invalid
 * proposals are skipped with a visible error — they never half-apply (§27).
 * Run inside ONE store.apply so the whole batch is a single undo step (§29).
 */
export function applyProposals(
  data: DomainData,
  proposals: readonly AIProposal[],
  runListId: string,
  now: number,
): ApplyOutcome {
  const outcome: ApplyOutcome = { appliedIds: [], createdTodoIds: [], errors: {} };
  for (const proposal of proposals) {
    const error = validateProposal(data, proposal.action, runListId);
    if (error !== null) {
      outcome.errors[proposal.id] = error;
      continue;
    }
    const createdId = applyAction(data, proposal.action, now);
    if (createdId !== null) outcome.createdTodoIds.push(createdId);
    const targetId = activityTargetId(data, proposal.action);
    if (targetId !== null) {
      logActivity(data, targetId, "ai", `AI applied — ${proposal.label}`, now);
    }
    outcome.appliedIds.push(proposal.id);
  }
  return outcome;
}
