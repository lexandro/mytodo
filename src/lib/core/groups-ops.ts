// Group operations. The 3-level depth cap is enforced HERE — every caller
// (UI, drag & drop, import) goes through these functions.

import { newId } from "./ids";
import { orderForDrop, orderForIndex, sortedByOrder } from "./scope";
import { MAX_GROUP_DEPTH, type DomainData, type Group } from "./types";

/** 1-based depth of a group (root group = 1). 0 for unknown ids. */
export function groupDepth(data: DomainData, groupId: string | null): number {
  let depth = 0;
  let current = groupId;
  while (current !== null) {
    const group = data.groups.find((g) => g.id === current);
    if (group === undefined) break;
    depth += 1;
    current = group.parentId;
  }
  return depth;
}

/** Height of the subtree rooted at `groupId` (leaf group = 1). */
export function subtreeHeight(data: DomainData, groupId: string): number {
  const children = data.groups.filter((g) => g.parentId === groupId);
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map((c) => subtreeHeight(data, c.id)));
}

function siblingsOf(data: DomainData, listId: string, parentId: string | null, excludeId?: string): Group[] {
  return sortedByOrder(
    data.groups.filter(
      (g) => g.listId === listId && g.parentId === parentId && g.id !== excludeId,
    ),
  );
}

/** Creates a group; returns null when the depth cap would be exceeded. */
export function createGroup(
  data: DomainData,
  listId: string,
  parentId: string | null,
  name: string,
  emoji = "",
): Group | null {
  if (groupDepth(data, parentId) + 1 > MAX_GROUP_DEPTH) return null;
  const siblings = siblingsOf(data, listId, parentId);
  const group: Group = {
    id: newId(),
    listId,
    parentId,
    name,
    emoji,
    order: orderForIndex(siblings, siblings.length),
    collapsed: false,
  };
  data.groups.push(group);
  return group;
}

export function renameGroup(data: DomainData, id: string, name: string, emoji?: string): void {
  const group = data.groups.find((g) => g.id === id);
  if (group === undefined) return;
  group.name = name;
  if (emoji !== undefined) group.emoji = emoji;
}

export function toggleGroupCollapsed(data: DomainData, id: string): void {
  const group = data.groups.find((g) => g.id === id);
  if (group === undefined) return;
  group.collapsed = !group.collapsed;
}

/**
 * Deletes a group without losing content: child groups re-parent to the
 * grandparent, todos move up the same way (design: "move-content workflow";
 * the whole action is one undo step).
 */
export function deleteGroup(data: DomainData, id: string): void {
  const group = data.groups.find((g) => g.id === id);
  if (group === undefined) return;
  for (const child of data.groups) {
    if (child.parentId === id) child.parentId = group.parentId;
  }
  for (const todo of data.todos) {
    if (todo.groupId === id) todo.groupId = group.parentId;
  }
  data.groups = data.groups.filter((g) => g.id !== id);
}

/**
 * Moves a group under a new parent (same or another list). Returns false and
 * does nothing when the move would break the depth cap or create a cycle.
 */
export function moveGroup(
  data: DomainData,
  id: string,
  targetListId: string,
  newParentId: string | null,
): boolean {
  const group = data.groups.find((g) => g.id === id);
  if (group === undefined) return false;
  // cycle guard: cannot move under itself or its own descendant
  let cursor = newParentId;
  while (cursor !== null) {
    if (cursor === id) return false;
    cursor = data.groups.find((g) => g.id === cursor)?.parentId ?? null;
  }
  if (groupDepth(data, newParentId) + subtreeHeight(data, id) > MAX_GROUP_DEPTH) return false;

  const moveSubtreeToList = (groupId: string): void => {
    const node = data.groups.find((g) => g.id === groupId);
    if (node === undefined) return;
    node.listId = targetListId;
    for (const todo of data.todos) {
      if (todo.groupId === groupId) todo.listId = targetListId;
    }
    for (const child of data.groups.filter((g) => g.parentId === groupId)) {
      moveSubtreeToList(child.id);
    }
  };

  const siblings = siblingsOf(data, targetListId, newParentId, id);
  group.parentId = newParentId;
  group.order = orderForIndex(siblings, siblings.length);
  moveSubtreeToList(id);
  return true;
}

/** Drag-reorder among current siblings. */
export function reorderGroup(
  data: DomainData,
  id: string,
  targetId: string,
  position: "before" | "after",
): void {
  const group = data.groups.find((g) => g.id === id);
  const target = data.groups.find((g) => g.id === targetId);
  if (group === undefined || target === undefined || id === targetId) return;
  if (group.listId !== target.listId || group.parentId !== target.parentId) return;
  const siblings = siblingsOf(data, group.listId, group.parentId, id);
  group.order = orderForDrop(siblings, targetId, position);
}
