// List operations — pure mutations on a DomainData draft, called inside
// store.apply(). Guards live here so every caller (UI, shortcut, import)
// gets the same rules.

import { newId } from "./ids";
import { clearListLabelNames } from "./label-names";
import { orderForDrop, orderForIndex, sortedByOrder } from "./scope";
import type { DomainData, List } from "./types";

export function createList(data: DomainData, name: string, emoji = ""): List {
  const sorted = sortedByOrder(data.lists);
  const list: List = {
    id: newId(),
    name,
    emoji,
    fixed: false,
    colorLabelId: null,
    order: orderForIndex(sorted, sorted.length),
  };
  data.lists.push(list);
  return list;
}

/** Sets (or with null clears) the list's color from the "list" palette. */
export function setListColor(data: DomainData, id: string, colorLabelId: string | null): void {
  const list = data.lists.find((l) => l.id === id);
  if (list === undefined) return;
  list.colorLabelId = colorLabelId;
}

export function renameList(data: DomainData, id: string, name: string, emoji?: string): void {
  const list = data.lists.find((l) => l.id === id);
  if (list === undefined) return;
  list.name = name;
  if (emoji !== undefined) list.emoji = emoji;
}

/**
 * Deleting a list never destroys todos: they move to the Inbox root as
 * trashed items (prototype behavior — "List deleted — its todos moved to
 * Trash"), so Undo and Trash-restore both keep working. Inbox is protected.
 */
export function deleteList(data: DomainData, id: string, now: number): void {
  const list = data.lists.find((l) => l.id === id);
  if (list === undefined || list.fixed) return;
  const inbox = data.lists.find((l) => l.fixed);
  if (inbox === undefined) return; // never happens: Inbox is bootstrapped
  data.lists = data.lists.filter((l) => l.id !== id);
  data.groups = data.groups.filter((g) => g.listId !== id);
  clearListLabelNames(data, id); // the DB cascades these; keep memory in step
  for (const todo of data.todos) {
    if (todo.listId !== id) continue;
    todo.listId = inbox.id;
    todo.groupId = null;
    todo.trashed = true;
    todo.trashedAt = now;
    todo.updatedAt = now;
  }
}

/** Drag-reorder in the rail: drop before/after another list. */
export function reorderList(
  data: DomainData,
  id: string,
  targetId: string,
  position: "before" | "after",
): void {
  const list = data.lists.find((l) => l.id === id);
  if (list === undefined || id === targetId) return;
  const siblings = sortedByOrder(data.lists.filter((l) => l.id !== id));
  list.order = orderForDrop(siblings, targetId, position);
}
