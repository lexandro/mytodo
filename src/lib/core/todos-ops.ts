// Todo operations — creation, status, rename, move, reorder, soft delete.
// Every mutation that matters writes an activity entry (daprompt §23).

import { STATUS_LABEL, locationPath, logActivity } from "./activity";
import { newId } from "./ids";
import { orderForDrop, orderForIndex, sortedByOrder } from "./scope";
import type { DomainData, Todo, TodoStatus } from "./types";

/** Visible (non-trashed, non-archived) todos of one group scope, sorted. */
function scopeSiblings(data: DomainData, listId: string, groupId: string | null, excludeId?: string): Todo[] {
  return sortedByOrder(
    data.todos.filter(
      (t) =>
        t.listId === listId &&
        t.groupId === groupId &&
        !t.trashed &&
        !t.archived &&
        t.id !== excludeId,
    ),
  );
}

export function createTodo(
  data: DomainData,
  listId: string,
  groupId: string | null,
  title: string,
  now: number,
): Todo {
  const siblings = scopeSiblings(data, listId, groupId);
  const todo: Todo = {
    id: newId(),
    listId,
    groupId,
    title,
    description: "",
    status: "open",
    emoji: "",
    colorLabelId: null,
    pinLocal: false,
    pinGlobal: false,
    archived: false,
    trashed: false,
    trashedAt: null,
    order: orderForIndex(siblings, siblings.length),
    createdAt: now,
    updatedAt: now,
  };
  data.todos.push(todo);
  logActivity(data, todo.id, "created", "Created", now);
  return todo;
}

export function findTodo(data: DomainData, id: string): Todo | undefined {
  return data.todos.find((t) => t.id === id);
}

function touch(todo: Todo, now: number): void {
  todo.updatedAt = now;
}

export function renameTodo(data: DomainData, id: string, title: string, now: number): void {
  const todo = findTodo(data, id);
  if (todo === undefined || todo.title === title) return;
  todo.title = title;
  touch(todo, now);
  logActivity(data, id, "renamed", "Renamed", now);
}

export function setStatus(data: DomainData, id: string, status: TodoStatus, now: number): void {
  const todo = findTodo(data, id);
  if (todo === undefined || todo.status === status) return;
  const summary = `${STATUS_LABEL[todo.status]} → ${STATUS_LABEL[status]}`;
  todo.status = status;
  touch(todo, now);
  logActivity(data, id, "status", summary, now);
}

/** Status circle click: Open → In Progress → Done → Open (never Cancelled). */
export function cycleStatus(data: DomainData, id: string, now: number): void {
  const todo = findTodo(data, id);
  if (todo === undefined) return;
  const next: Record<TodoStatus, TodoStatus> = {
    open: "progress",
    progress: "done",
    done: "open",
    cancelled: "open",
  };
  setStatus(data, id, next[todo.status], now);
}

/** Move to another list/group (drop "into", context-menu Move to…, Alt+←). */
export function moveTodo(
  data: DomainData,
  id: string,
  listId: string,
  groupId: string | null,
  now: number,
): void {
  const todo = findTodo(data, id);
  if (todo === undefined) return;
  if (todo.listId === listId && todo.groupId === groupId) return;
  const siblings = scopeSiblings(data, listId, groupId, id);
  todo.listId = listId;
  todo.groupId = groupId;
  todo.order = orderForIndex(siblings, siblings.length);
  touch(todo, now);
  logActivity(data, id, "moved", `Moved to ${locationPath(data, listId, groupId)}`, now);
}

/**
 * Drop before/after a target todo. Adopts the target's list/group, so the
 * same gesture covers reorder and cross-group/cross-list placement.
 */
export function reorderTodo(
  data: DomainData,
  id: string,
  targetId: string,
  position: "before" | "after",
  now: number,
): void {
  const todo = findTodo(data, id);
  const target = findTodo(data, targetId);
  if (todo === undefined || target === undefined || id === targetId) return;
  const crossScope = todo.listId !== target.listId || todo.groupId !== target.groupId;
  const siblings = scopeSiblings(data, target.listId, target.groupId, id);
  todo.listId = target.listId;
  todo.groupId = target.groupId;
  todo.order = orderForDrop(siblings, targetId, position);
  touch(todo, now);
  if (crossScope) {
    logActivity(data, id, "moved", `Moved to ${locationPath(data, target.listId, target.groupId)}`, now);
  }
}

/** Soft delete: keeps location for restore; hidden everywhere but Trash. */
export function trashTodo(data: DomainData, id: string, now: number): void {
  const todo = findTodo(data, id);
  if (todo === undefined || todo.trashed) return;
  todo.trashed = true;
  todo.trashedAt = now;
  touch(todo, now);
}

/** Restore from Trash; falls back to list root if the group is gone. */
export function restoreTodo(data: DomainData, id: string, now: number): void {
  const todo = findTodo(data, id);
  if (todo === undefined || !todo.trashed) return;
  todo.trashed = false;
  todo.trashedAt = null;
  if (todo.groupId !== null && !data.groups.some((g) => g.id === todo.groupId)) {
    todo.groupId = null;
  }
  if (!data.lists.some((l) => l.id === todo.listId)) {
    const inbox = data.lists.find((l) => l.fixed);
    if (inbox !== undefined) todo.listId = inbox.id;
  }
  touch(todo, now);
}

export function deleteTodoPermanently(data: DomainData, id: string): void {
  data.todos = data.todos.filter((t) => t.id !== id);
  data.subtasks = data.subtasks.filter((s) => s.todoId !== id);
  data.activity = data.activity.filter((a) => a.todoId !== id);
}

export function emptyTrash(data: DomainData): void {
  for (const todo of data.todos.filter((t) => t.trashed)) {
    deleteTodoPermanently(data, todo.id);
  }
}
