// Builds the visible row list of one pane: Pinned section → group tree →
// root todos → Archived section (prototype buildRows, made pure).
// The optional matcher (list filter, F6) force-expands groups and prunes
// branches without matches.

import { byOrder } from "./ordering";
import type { DomainData, Group, Todo } from "./types";

export type PaneRow =
  | { kind: "section"; key: string; label: string; count: number; toggleable: boolean; open: boolean }
  | { kind: "group"; key: string; group: Group; depth: number; count: number; open: boolean }
  | { kind: "todo"; key: string; todo: Todo; depth: number };

export interface PaneRowsInput {
  listId: string;
  /** Archived section open state for this list. */
  archivedOpen: boolean;
  /** Live filter (F6); undefined = no filtering. */
  matches?: (todo: Todo) => boolean;
}

export interface PaneRows {
  rows: PaneRow[];
  /** Todo ids in render order — drives ↑/↓ keyboard navigation. */
  visibleTodoIds: string[];
}

/** Open (non-done) todos in a group's subtree — the count badge on rows. */
export function groupSubtreeCount(data: DomainData, groupId: string): number {
  let count = data.todos.filter(
    (t) => t.groupId === groupId && !t.trashed && !t.archived,
  ).length;
  for (const child of data.groups.filter((g) => g.parentId === groupId)) {
    count += groupSubtreeCount(data, child.id);
  }
  return count;
}

/** Open+in-progress count shown next to list names/tabs. */
export function listOpenCount(data: DomainData, listId: string): number {
  return data.todos.filter(
    (t) =>
      t.listId === listId &&
      !t.trashed &&
      !t.archived &&
      (t.status === "open" || t.status === "progress"),
  ).length;
}

export function buildPaneRows(data: DomainData, input: PaneRowsInput): PaneRows {
  const { listId, matches } = input;
  const filtering = matches !== undefined;
  const rows: PaneRow[] = [];
  const visibleTodoIds: string[] = [];
  const live = data.todos.filter((t) => t.listId === listId && !t.trashed);
  const match = (t: Todo): boolean => !filtering || matches(t);
  const isPinned = (t: Todo): boolean => t.pinLocal || t.pinGlobal;

  const pushTodo = (todo: Todo, depth: number): void => {
    rows.push({ kind: "todo", key: todo.id, todo, depth });
    visibleTodoIds.push(todo.id);
  };
  const sortedTodos = (filter: (t: Todo) => boolean): Todo[] =>
    live.filter(filter).sort(byOrder);

  // pinned section (local + global pins of this list)
  const pinned = sortedTodos((t) => !t.archived && isPinned(t) && match(t));
  if (pinned.length > 0) {
    rows.push({ kind: "section", key: "sec-pinned", label: "Pinned", count: pinned.length, toggleable: false, open: true });
    pinned.forEach((t) => pushTodo(t, 0));
  }

  // group tree with its todos; filtering prunes non-matching branches
  const groupHasMatch = (group: Group): boolean => {
    if (live.some((t) => t.groupId === group.id && !t.archived && !isPinned(t) && match(t))) return true;
    return data.groups.some((g) => g.parentId === group.id && groupHasMatch(g));
  };
  const walk = (parentId: string | null, depth: number): void => {
    const children = data.groups
      .filter((g) => g.listId === listId && g.parentId === parentId)
      .sort(byOrder);
    for (const group of children) {
      if (filtering && !groupHasMatch(group)) continue;
      const open = filtering ? true : !group.collapsed;
      rows.push({
        kind: "group", key: group.id, group, depth,
        count: groupSubtreeCount(data, group.id), open,
      });
      if (open) {
        walk(group.id, depth + 1);
        sortedTodos((t) => t.groupId === group.id && !t.archived && !isPinned(t) && match(t))
          .forEach((t) => pushTodo(t, depth + 1));
      }
    }
  };
  walk(null, 0);

  // root todos
  sortedTodos((t) => t.groupId === null && !t.archived && !isPinned(t) && match(t))
    .forEach((t) => pushTodo(t, 0));

  // archived section (collapsed by default; filtering opens it)
  const archived = sortedTodos((t) => t.archived && match(t));
  if (archived.length > 0) {
    const open = input.archivedOpen || filtering;
    rows.push({ kind: "section", key: "sec-archived", label: "Archived", count: archived.length, toggleable: true, open });
    if (open) archived.forEach((t) => pushTodo(t, 0));
  }

  return { rows, visibleTodoIds };
}
