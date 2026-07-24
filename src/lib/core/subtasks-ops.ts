// Subtask operations — a flat ordered checklist under a todo. No status
// enum, no description, no nesting (daprompt §17). Mutations write the
// todo's activity log.

import { logActivity } from "./activity";
import { newId } from "./ids";
import { orderForDrop, orderForIndex, sortedByOrder } from "./scope";
import { findTodo } from "./todos-ops";
import type { DomainData, Subtask } from "./types";

function siblings(data: DomainData, todoId: string, excludeId?: string): Subtask[] {
  return sortedByOrder(data.subtasks.filter((s) => s.todoId === todoId && s.id !== excludeId));
}

function touchTodo(data: DomainData, todoId: string, now: number): void {
  const todo = findTodo(data, todoId);
  if (todo !== undefined) todo.updatedAt = now;
}

export function addSubtask(data: DomainData, todoId: string, text: string, now: number): Subtask | null {
  const trimmed = text.trim();
  if (trimmed === "" || findTodo(data, todoId) === undefined) return null;
  const scope = siblings(data, todoId);
  const subtask: Subtask = {
    id: newId(),
    todoId,
    text: trimmed,
    checked: false,
    order: orderForIndex(scope, scope.length),
  };
  data.subtasks.push(subtask);
  touchTodo(data, todoId, now);
  logActivity(data, todoId, "subtask", `Added subtask "${trimmed}"`, now);
  return subtask;
}

export function editSubtask(data: DomainData, id: string, text: string): void {
  const subtask = data.subtasks.find((s) => s.id === id);
  const trimmed = text.trim();
  if (subtask === undefined || trimmed === "" || subtask.text === trimmed) return;
  subtask.text = trimmed;
}

export function toggleSubtask(data: DomainData, id: string, now: number): void {
  const subtask = data.subtasks.find((s) => s.id === id);
  if (subtask === undefined) return;
  subtask.checked = !subtask.checked;
  touchTodo(data, subtask.todoId, now);
  logActivity(
    data,
    subtask.todoId,
    "subtask",
    `${subtask.checked ? "Completed" : "Reopened"} subtask "${subtask.text}"`,
    now,
  );
}

export function removeSubtask(data: DomainData, id: string, now: number): void {
  const subtask = data.subtasks.find((s) => s.id === id);
  if (subtask === undefined) return;
  data.subtasks = data.subtasks.filter((s) => s.id !== id);
  touchTodo(data, subtask.todoId, now);
  logActivity(data, subtask.todoId, "subtask", `Removed subtask "${subtask.text}"`, now);
}

/** Drag-reorder within the todo's checklist. */
export function reorderSubtask(data: DomainData, id: string, targetId: string, pos: "before" | "after"): void {
  const subtask = data.subtasks.find((s) => s.id === id);
  const target = data.subtasks.find((s) => s.id === targetId);
  if (subtask === undefined || target === undefined || id === targetId) return;
  if (subtask.todoId !== target.todoId) return;
  subtask.order = orderForDrop(siblings(data, subtask.todoId, id), targetId, pos);
}
