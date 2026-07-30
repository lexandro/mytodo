// The context menu of a multi-selection; state/menus.ts has the single-todo one.
// Same shape and the same order, every item acting on all selected rows — and a
// disabled header naming the count, so it is never ambiguous how much a click is
// about to touch.

import { STATUS_LABEL, locationPath } from "$lib/core/activity";
import { everyPinned } from "$lib/core/bulk-ops";
import { sortedLabels } from "$lib/core/labels";
import { labelName } from "$lib/core/label-names";
import { findTodo } from "$lib/core/todos-ops";
import type { TodoStatus } from "$lib/core/types";
import {
  copyTitlesSelectionAction, duplicateSelectionAction, setArchivedSelectionAction,
  setColorLabelSelectionAction, setStatusSelectionAction, togglePinSelectionAction,
  trashSelectionAction,
} from "./actions-bulk";
import { moveSelectionAction, moveSelectionInScopeAction } from "./actions-bulk-move";
import { store } from "./store.svelte";
import { ui, type CtxItem } from "./ui.svelte";

const STATUSES: readonly TodoStatus[] = ["open", "progress", "done", "cancelled"];

/** Replaces the open menu's items in place — the "…" items morph, never nest. */
function morphTo(items: () => CtxItem[]): () => void {
  return () => {
    const menu = ui.ctxMenu;
    if (menu !== null) ui.ctxMenu = { ...menu, items: items() };
  };
}

/** The focus row's list — group targets and label names are per list. */
function focusListId(): string | null {
  if (ui.selectedId === null) return null;
  return findTodo(store.data, ui.selectedId)?.listId ?? null;
}

function every(ids: readonly string[], match: (status: TodoStatus) => boolean): boolean {
  return ids.every((id) => {
    const todo = findTodo(store.data, id);
    return todo !== undefined && match(todo.status);
  });
}

export function selectionMenuItems(): CtxItem[] {
  const ids = ui.selectedIds;
  const allArchived = ids.every((id) => findTodo(store.data, id)?.archived === true);
  return [
    { label: `${ids.length} todos selected`, disabled: true, action: () => {} },
    { separator: true },
    ...STATUSES.map((status): CtxItem => ({
      // filled circle only when the whole selection already has that status
      label: `${every(ids, (s) => s === status) ? "●" : "○"}  ${STATUS_LABEL[status]}`,
      action: () => setStatusSelectionAction(status),
    })),
    { separator: true },
    {
      label: everyPinned(store.data, ids, "local") ? "Unpin from list" : "Pin to list",
      hint: "Ctrl+P",
      action: () => togglePinSelectionAction("local"),
    },
    {
      label: everyPinned(store.data, ids, "global") ? "Unpin globally" : "Pin globally",
      action: () => togglePinSelectionAction("global"),
    },
    { label: "Move up", hint: "Alt+↑", action: () => moveSelectionInScopeAction("up") },
    { label: "Move down", hint: "Alt+↓", action: () => moveSelectionInScopeAction("down") },
    { label: "Color…", action: morphTo(selectionColorItems) },
    { label: "Move to…", action: morphTo(selectionMoveItems) },
    { label: "Duplicate", action: () => duplicateSelectionAction() },
    { label: "Copy titles", action: () => void copyTitlesSelectionAction() },
    { separator: true },
    {
      label: allArchived ? "Restore from archive" : "Archive",
      action: () => setArchivedSelectionAction(!allArchived),
    },
    {
      label: `Delete (${ids.length})`,
      hint: "Del",
      danger: true,
      action: () => trashSelectionAction(),
    },
  ];
}

/** "Color…" morphs the menu into the todo palette, named as this list names it. */
export function selectionColorItems(): CtxItem[] {
  const listId = focusListId();
  const items: CtxItem[] = [
    { label: "Color", disabled: true, action: () => {} },
    { label: "○  None", action: () => setColorLabelSelectionAction(null) },
  ];
  for (const label of sortedLabels(store.data, "todo")) {
    items.push({
      label: `●  ${labelName(store.data, listId, label.id)}`,
      action: () => setColorLabelSelectionAction(label.id),
    });
  }
  return items;
}

/** "Move to…" morphs the menu into the list + group targets. */
export function selectionMoveItems(): CtxItem[] {
  const listId = focusListId();
  const items: CtxItem[] = [{ label: "Move to…", disabled: true, action: () => {} }];
  for (const list of store.data.lists) {
    items.push({
      label: list.emoji === "" ? list.name : `${list.emoji}  ${list.name}`,
      action: () => moveSelectionAction(list.id, null, list.name),
    });
  }
  if (listId === null) return items;
  for (const group of store.data.groups.filter((g) => g.listId === listId)) {
    const path = locationPath(store.data, listId, group.id).split(" / ").slice(1).join(" / ");
    items.push({
      label: `↳  ${path}`,
      action: () => moveSelectionAction(listId, group.id, group.name),
    });
  }
  return items;
}
