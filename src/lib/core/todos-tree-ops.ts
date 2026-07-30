// Mutations that reshape the sub-item tree: nest under a todo, lift one level
// out, and apply a status to a whole subtree. Split from todos-ops.ts so both
// modules stay one responsibility — this one is about hierarchy, that one
// about a todo's own fields and lifecycle.

import { logActivity } from "./activity";
import { orderForDrop, orderForIndex } from "./scope";
import { canNest, subtreeOf } from "./todo-tree";
import { adoptSubtree, findTodo, scopeSiblings, setStatus } from "./todos-ops";
import type { DomainData, Todo, TodoStatus } from "./types";

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

interface ScopeStep {
  todo: Todo;
  /** The scope without the todo itself — what the new order is measured against. */
  others: Todo[];
  /** The row it would trade places with. */
  neighbour: Todo;
}

/**
 * What Alt+↑ / Alt+↓ would do to one todo, or undefined when it is already at
 * the edge of its own scope.
 *
 * "Above/below" means what the user sees: pinned rows live in their own
 * section, so a pinned todo swaps with pinned neighbours only, and an unpinned
 * one never trades places with a row rendered elsewhere. The order value is
 * still computed against the full scope, so nothing else shifts.
 *
 * Split out from the mutation so a caller can ask BEFORE touching anything —
 * a block move must not half-happen (core/bulk-move.ts).
 */
function scopeStep(data: DomainData, id: string, direction: "up" | "down"): ScopeStep | undefined {
  const todo = findTodo(data, id);
  if (todo === undefined || todo.trashed || todo.archived) return undefined;
  const siblings = scopeSiblings(data, todo.listId, todo.groupId, todo.parentId);
  const pinned = todo.pinLocal || todo.pinGlobal;
  const peers = siblings.filter((t) => (t.pinLocal || t.pinGlobal) === pinned);
  const index = peers.findIndex((t) => t.id === id);
  if (index === -1) return undefined;
  const neighbour = peers[direction === "up" ? index - 1 : index + 1];
  if (neighbour === undefined) return undefined; // already at the edge
  return { todo, others: siblings.filter((t) => t.id !== id), neighbour };
}

/** Whether Alt+↑ / Alt+↓ has anywhere to put this todo. */
export function canMoveInScope(data: DomainData, id: string, direction: "up" | "down"): boolean {
  return scopeStep(data, id, direction) !== undefined;
}

/** Alt+↑ / Alt+↓: one step up or down inside the todo's own scope. */
export function moveTodoInScope(
  data: DomainData,
  id: string,
  direction: "up" | "down",
  now: number,
): boolean {
  const step = scopeStep(data, id, direction);
  if (step === undefined) return false;
  step.todo.order = orderForDrop(
    step.others,
    step.neighbour.id,
    direction === "up" ? "before" : "after",
  );
  step.todo.updatedAt = now;
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
