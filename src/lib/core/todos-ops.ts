// Todo operations — creation, status, rename, move, reorder, soft delete.
// Every mutation that matters writes an activity entry (daprompt §23).

import { STATUS_LABEL, locationPath, logActivity } from "./activity";
import { newId } from "./ids";
import { orderForDrop, orderForIndex, sortedByOrder } from "./scope";
import { isSelfOrAncestor, subtreeOf } from "./todo-tree";
import type { DomainData, Todo, TodoStatus } from "./types";

/**
 * Visible (non-trashed, non-archived) todos of one ordering scope, sorted.
 * A scope is one list + group + parent todo: sub-items order among themselves,
 * not against their parent's siblings.
 */
export function scopeSiblings(
  data: DomainData,
  listId: string,
  groupId: string | null,
  parentId: string | null,
  excludeId?: string,
): Todo[] {
  return sortedByOrder(
    data.todos.filter(
      (t) =>
        t.listId === listId &&
        t.groupId === groupId &&
        t.parentId === parentId &&
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
  const siblings = scopeSiblings(data, listId, groupId, null);
  const todo: Todo = {
    id: newId(),
    listId,
    groupId,
    parentId: null,
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

/** Returns true when the status actually changed — callers hang follow-up
 * work (status-driven repositioning) off that. */
export function setStatus(data: DomainData, id: string, status: TodoStatus, now: number): boolean {
  const todo = findTodo(data, id);
  if (todo === undefined || todo.status === status) return false;
  const summary = `${STATUS_LABEL[todo.status]} → ${STATUS_LABEL[status]}`;
  todo.status = status;
  touch(todo, now);
  logActivity(data, id, "status", summary, now);
  return true;
}

/** Status circle click: Open → In Progress → Done → Open (never Cancelled). */
export function cycleStatus(data: DomainData, id: string, now: number): boolean {
  const todo = findTodo(data, id);
  if (todo === undefined) return false;
  const next: Record<TodoStatus, TodoStatus> = {
    open: "progress",
    progress: "done",
    done: "open",
    cancelled: "open",
  };
  return setStatus(data, id, next[todo.status], now);
}

/**
 * Sub-items follow their parent everywhere: a subtree is one thing to move,
 * trash or archive. Only the root's own placement (order, parentId) is the
 * caller's business — the descendants just inherit the destination.
 */
export function adoptSubtree(data: DomainData, root: Todo, now: number): void {
  for (const descendant of subtreeOf(data, root.id)) {
    if (descendant.id === root.id) continue;
    descendant.listId = root.listId;
    descendant.groupId = root.groupId;
    touch(descendant, now);
  }
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
  if (todo.listId === listId && todo.groupId === groupId && todo.parentId === null) return;
  const siblings = scopeSiblings(data, listId, groupId, null, id);
  todo.listId = listId;
  todo.groupId = groupId;
  // an explicit move lands at the destination's top level, never under a todo
  todo.parentId = null;
  todo.order = orderForIndex(siblings, siblings.length);
  touch(todo, now);
  adoptSubtree(data, todo, now);
  logActivity(data, id, "moved", `Moved to ${locationPath(data, listId, groupId)}`, now);
}

/**
 * Drop before/after a target todo. Adopts the target's list/group AND parent,
 * so the same gesture covers reorder, cross-group/cross-list placement and
 * landing next to a sub-item. Dropping a todo inside its own subtree is a
 * no-op — that would orphan the branch it is standing on.
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
  if (isSelfOrAncestor(data, targetId, id)) return;
  const crossScope = todo.listId !== target.listId || todo.groupId !== target.groupId;
  const siblings = scopeSiblings(data, target.listId, target.groupId, target.parentId, id);
  todo.listId = target.listId;
  todo.groupId = target.groupId;
  todo.parentId = target.parentId;
  todo.order = orderForDrop(siblings, targetId, position);
  touch(todo, now);
  adoptSubtree(data, todo, now);
  if (crossScope) {
    logActivity(data, id, "moved", `Moved to ${locationPath(data, target.listId, target.groupId)}`, now);
  }
}

/** Soft delete: keeps location for restore; hidden everywhere but Trash. */
export function trashTodo(data: DomainData, id: string, now: number): void {
  const todo = findTodo(data, id);
  if (todo === undefined || todo.trashed) return;
  // the whole subtree goes: a sub-item cannot outlive the todo it hangs on
  for (const member of subtreeOf(data, id)) {
    if (member.trashed) continue;
    member.trashed = true;
    member.trashedAt = now;
    touch(member, now);
  }
}

/**
 * Restore from Trash; falls back to list root if the group is gone, and to the
 * top level if the parent todo is gone or still trashed — a restored sub-item
 * must never hang off nothing.
 */
export function restoreTodo(data: DomainData, id: string, now: number): void {
  const todo = findTodo(data, id);
  if (todo === undefined || !todo.trashed) return;
  todo.trashed = false;
  todo.trashedAt = null;
  if (todo.groupId !== null && !data.groups.some((g) => g.id === todo.groupId)) {
    todo.groupId = null;
  }
  if (todo.parentId !== null) {
    const parent = findTodo(data, todo.parentId);
    if (parent === undefined || parent.trashed) todo.parentId = null;
  }
  if (!data.lists.some((l) => l.id === todo.listId)) {
    const inbox = data.lists.find((l) => l.fixed);
    if (inbox !== undefined) todo.listId = inbox.id;
  }
  touch(todo, now);
}

/** Deletes the todo and its whole subtree — sub-items have no life of their own. */
export function deleteTodoPermanently(data: DomainData, id: string): void {
  const ids = new Set(subtreeOf(data, id).map((t) => t.id));
  if (ids.size === 0) ids.add(id);
  data.todos = data.todos.filter((t) => !ids.has(t.id));
  data.subtasks = data.subtasks.filter((s) => !ids.has(s.todoId));
  data.activity = data.activity.filter((a) => !ids.has(a.todoId));
}

export function emptyTrash(data: DomainData): void {
  for (const todo of data.todos.filter((t) => t.trashed)) {
    deleteTodoPermanently(data, todo.id);
  }
}
