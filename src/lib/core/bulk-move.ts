// Bulk placement: moving, reordering and nesting a whole selection. Everything
// here runs on the selection's ROOTS (core/todo-tree selectionRoots) — a parent
// and its own sub-item never place themselves independently, the branch travels
// as one. Row order in, row order out.

import { byOrder } from "./ordering";
import { isSelfOrAncestor, selectionRoots } from "./todo-tree";
import { findTodo, moveTodo, reorderTodo } from "./todos-ops";
import { canMoveInScope, moveTodoInScope, nestTodo } from "./todos-tree-ops";
import type { DomainData, Todo } from "./types";

/** Move to…: each root lands at the end of the destination, in row order. */
export function moveMany(
  data: DomainData,
  ids: readonly string[],
  listId: string,
  groupId: string | null,
  now: number,
): number {
  const pending = selectionRoots(data, ids).filter((id) => {
    const todo = findTodo(data, id);
    if (todo === undefined) return false;
    // already exactly here: a move would only churn the order
    return !(todo.listId === listId && todo.groupId === groupId && todo.parentId === null);
  });
  for (const id of pending) moveTodo(data, id, listId, groupId, now);
  return pending.length;
}

/**
 * Dropping a multi-selection before or after a row: the first root takes the
 * drop position and the rest chain after it, so the block arrives in row order.
 * The target itself is skipped, as is any root the target hangs under — a todo
 * cannot land inside its own subtree.
 */
export function reorderMany(
  data: DomainData,
  ids: readonly string[],
  targetId: string,
  position: "before" | "after",
  now: number,
): number {
  let previousId: string | null = null;
  let moved = 0;
  for (const id of selectionRoots(data, ids)) {
    if (id === targetId || isSelfOrAncestor(data, targetId, id)) continue;
    if (previousId === null) reorderTodo(data, id, targetId, position, now);
    else reorderTodo(data, id, previousId, "after", now);
    previousId = id;
    moved += 1;
  }
  return moved;
}

/**
 * Dropping a multi-selection ONTO a row. Roots that would break the depth cap
 * are counted as blocked rather than silently dropped — the caller says so.
 */
export function nestMany(
  data: DomainData,
  ids: readonly string[],
  parentId: string,
  now: number,
): { nested: number; blocked: number } {
  let nested = 0;
  let blocked = 0;
  for (const id of selectionRoots(data, ids)) {
    if (id === parentId) continue;
    const todo = findTodo(data, id);
    if (todo === undefined || todo.parentId === parentId) continue;
    if (nestTodo(data, id, parentId, now)) nested += 1;
    else blocked += 1;
  }
  return { nested, blocked };
}

/**
 * Alt+↑/↓ on a selection: the whole block steps one row, or nothing does.
 *
 * All-or-nothing is the point. Letting the rows that still CAN move go while
 * one of them sits at the edge would reshuffle the selection against itself —
 * two selected rows at the top of a list would just swap places and then keep
 * swapping, never moving anywhere.
 *
 * Moving down walks the roots bottom-up (and moving up walks them top-down),
 * otherwise the first row would step over the next one and the block would fold
 * onto itself. The order comes from the data, not from the caller's array, so a
 * selection that drifted out of row order still moves as one piece.
 */
export function moveManyInScope(
  data: DomainData,
  ids: readonly string[],
  direction: "up" | "down",
  now: number,
): number {
  const roots = selectionRoots(data, ids)
    .map((id) => findTodo(data, id))
    .filter((todo): todo is Todo => todo !== undefined)
    .sort(byOrder);
  if (roots.length === 0) return 0;
  if (!roots.every((todo) => canMoveInScope(data, todo.id, direction))) return 0;
  const sequence = direction === "down" ? [...roots].reverse() : roots;
  let moved = 0;
  for (const todo of sequence) {
    if (moveTodoInScope(data, todo.id, direction, now)) moved += 1;
  }
  return moved;
}
