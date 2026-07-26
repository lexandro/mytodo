// Builds the visible row list of one pane: Pinned section → group tree →
// root todos → Archived section (prototype buildRows, made pure).
// The optional matcher (list filter, F6) force-expands groups and prunes
// branches without matches.
//
// Todos form a tree of their own (Todo.parentId): a todo renders UNDER its
// parent wherever that parent renders, so a subtree is never split across
// sections. Only a todo without a visible parent anchors a section.

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

/** A todo and the depth it renders at — one entry per visible row. */
interface PlacedTodo {
  todo: Todo;
  depth: number;
}

export function buildPaneRows(data: DomainData, input: PaneRowsInput): PaneRows {
  const { listId, matches } = input;
  const filtering = matches !== undefined;
  const rows: PaneRow[] = [];
  const visibleTodoIds: string[] = [];
  const live = data.todos.filter((t) => t.listId === listId && !t.trashed);
  const liveById = new Map(live.map((t) => [t.id, t]));
  const isPinned = (t: Todo): boolean => t.pinLocal || t.pinGlobal;

  const childrenOf = (todo: Todo): Todo[] =>
    live.filter((t) => t.parentId === todo.id && t.archived === todo.archived).sort(byOrder);

  // a parent stays visible when any of its sub-items matches — otherwise the
  // match would render with nothing to hang on
  const subtreeMatches = (todo: Todo): boolean => {
    if (!filtering || matches(todo)) return true;
    return childrenOf(todo).some(subtreeMatches);
  };

  /**
   * A todo renders under its parent whenever that parent renders in the same
   * section; a missing parent (or one sitting in another section) makes it an
   * anchor of its own.
   */
  const isAnchor = (todo: Todo): boolean => {
    if (todo.parentId === null) return true;
    const parent = liveById.get(todo.parentId);
    return parent === undefined || parent.archived !== todo.archived;
  };

  /** Flattens anchors and their sub-item trees into render order. */
  const place = (anchors: Todo[], depth: number): PlacedTodo[] =>
    anchors.flatMap((todo) => [
      { todo, depth },
      ...place(childrenOf(todo).filter(subtreeMatches), depth + 1),
    ]);

  const anchorsWhere = (filter: (t: Todo) => boolean): Todo[] =>
    live.filter((t) => isAnchor(t) && filter(t) && subtreeMatches(t)).sort(byOrder);

  const pushPlaced = (placed: PlacedTodo[]): void => {
    for (const { todo, depth } of placed) {
      rows.push({ kind: "todo", key: todo.id, todo, depth });
      visibleTodoIds.push(todo.id);
    }
  };

  // pinned section (local + global pins of this list); an unpinned sub-item of
  // a pinned todo travels with it rather than dangling in its group
  const pinned = place(anchorsWhere((t) => !t.archived && isPinned(t)), 0);
  if (pinned.length > 0) {
    rows.push({ kind: "section", key: "sec-pinned", label: "Pinned", count: pinned.length, toggleable: false, open: true });
    pushPlaced(pinned);
  }

  // group tree with its todos; filtering prunes non-matching branches. The
  // anchors are computed once per group — walk() and groupHasMatch() both ask.
  const anchorCache = new Map<string, Todo[]>();
  const groupAnchors = (groupId: string): Todo[] => {
    const cached = anchorCache.get(groupId);
    if (cached !== undefined) return cached;
    const anchors = anchorsWhere((t) => t.groupId === groupId && !t.archived && !isPinned(t));
    anchorCache.set(groupId, anchors);
    return anchors;
  };
  const groupHasMatch = (group: Group): boolean => {
    if (groupAnchors(group.id).length > 0) return true;
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
        pushPlaced(place(groupAnchors(group.id), depth + 1));
      }
    }
  };
  walk(null, 0);

  // root todos
  pushPlaced(place(anchorsWhere((t) => t.groupId === null && !t.archived && !isPinned(t)), 0));

  // archived section (collapsed by default; filtering opens it)
  const archived = place(anchorsWhere((t) => t.archived), 0);
  if (archived.length > 0) {
    const open = input.archivedOpen || filtering;
    rows.push({ kind: "section", key: "sec-archived", label: "Archived", count: archived.length, toggleable: true, open });
    if (open) pushPlaced(archived);
  }

  return { rows, visibleTodoIds };
}
