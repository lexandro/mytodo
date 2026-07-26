// Mutations that reshape the sub-item tree: nest under a todo, lift one level
// out, and apply a status to a whole subtree. Split from todos-ops.ts so both
// modules stay one responsibility — this one is about hierarchy, that one
// about a todo's own fields and lifecycle.

import { logActivity } from "./activity";
import { orderForDrop, orderForIndex } from "./scope";
import { canNest, subtreeOf } from "./todo-tree";
import { adoptSubtree, findTodo, scopeSiblings, setStatus } from "./todos-ops";
import type { DomainData, TodoStatus } from "./types";

/**
 * Makes `id` a sub-item of `parentId`, appended after the parent's existing
 * children. Refuses cycles and anything past the depth cap (see canNest).
 * Returns true when the tree actually changed.
 */
export function nestTodo(data: DomainData, id: string, parentId: string, now: number): boolean {
  const todo = findTodo(data, id);
  const parent = findTodo(data, parentId);
  if (todo === undefined || parent === undefined) return false;
  if (todo.parentId === parentId) return false;
  if (!canNest(data, id, parentId)) return false;
  const siblings = scopeSiblings(data, parent.listId, parent.groupId, parentId, id);
  todo.listId = parent.listId;
  todo.groupId = parent.groupId;
  todo.parentId = parentId;
  todo.order = orderForIndex(siblings, siblings.length);
  todo.updatedAt = now;
  adoptSubtree(data, todo, now);
  logActivity(data, id, "moved", `Made a sub-item of "${parent.title}"`, now);
  return true;
}

/**
 * Lifts `id` one level out: it becomes the next sibling of its former parent.
 * Its own sub-items ride along, so the branch keeps its shape.
 */
export function outdentTodo(data: DomainData, id: string, now: number): boolean {
  const todo = findTodo(data, id);
  if (todo === undefined || todo.parentId === null) return false;
  const parent = findTodo(data, todo.parentId);
  if (parent === undefined) {
    todo.parentId = null; // orphan: repair rather than refuse
    todo.updatedAt = now;
    return true;
  }
  const siblings = scopeSiblings(data, parent.listId, parent.groupId, parent.parentId, id);
  todo.parentId = parent.parentId;
  todo.order = orderForDrop(siblings, parent.id, "after");
  todo.updatedAt = now;
  logActivity(data, id, "moved", `Lifted out of "${parent.title}"`, now);
  return true;
}

/** Caret click: hides or shows the sub-items. View state, never undoable. */
export function toggleTodoCollapsed(data: DomainData, id: string): void {
  const todo = findTodo(data, id);
  if (todo === undefined) return;
  todo.collapsed = !todo.collapsed;
}

/**
 * Context-menu "… with sub-items": one status for the whole subtree, inside a
 * single undo step. Returns the ids that actually changed — the caller
 * repositions exactly those (state/status-placement.ts).
 */
export function setStatusDeep(
  data: DomainData,
  id: string,
  status: TodoStatus,
  now: number,
): string[] {
  const changed: string[] = [];
  for (const member of subtreeOf(data, id)) {
    if (member.trashed) continue;
    if (setStatus(data, member.id, status, now)) changed.push(member.id);
  }
  return changed;
}
