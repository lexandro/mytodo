// Action layer: UI events → domain mutations (store.apply) + UI state +
// toasts. Components call these and stay thin.

import { formatEmojiName, parseEmojiName } from "$lib/core/emoji";
import { createGroup, deleteGroup, renameGroup, toggleGroupCollapsed } from "$lib/core/groups-ops";
import { createList, deleteList, renameList, reorderList } from "$lib/core/lists-ops";
import { createTodo, cycleStatus, findTodo, moveTodo, reorderTodo, setStatus, trashTodo } from "$lib/core/todos-ops";
import { detailOpened } from "./ai-actions";
import { aiConfig } from "./ai-config.svelte";
import { store } from "./store.svelte";
import { ui } from "./ui.svelte";

// ── selection / navigation ──────────────────────────────────────────────────

export function selectTodo(id: string, paneIndex?: number): void {
  ui.selectedId = id;
  if (paneIndex !== undefined) ui.activePane = paneIndex;
}

export function openDetails(id: string, paneIndex?: number): void {
  selectTodo(id, paneIndex);
  ui.detailOpen = true;
  ui.detailTab = "details";
  detailOpened(); // narrow windows: detail and AI panel never show together
}

export function switchList(listId: string, paneIndex = ui.activePane): void {
  ui.view = "main";
  ui.updatePane(paneIndex, { listId, pickerOpen: false });
}

// ── todo actions ────────────────────────────────────────────────────────────

/**
 * Quick add: Enter creates into the selected todo's group when the selection
 * lives in this pane's list (INTERACTIONS.md), else the list root.
 */
export function quickAdd(paneIndex: number, title: string, openDetail: boolean): boolean {
  const trimmed = title.trim();
  const listId = ui.panes[paneIndex].listId;
  if (trimmed === "" || listId === null) return false;
  const selected = ui.selectedId !== null ? findTodo(store.data, ui.selectedId) : undefined;
  const groupId =
    selected !== undefined && selected.listId === listId && !selected.archived && !selected.trashed
      ? selected.groupId
      : null;
  let newId = "";
  store.apply("add todo", (data) => {
    newId = createTodo(data, listId, groupId, trimmed, Date.now()).id;
  });
  ui.updatePane(paneIndex, { quickDraft: "" });
  if (openDetail) openDetails(newId, paneIndex);
  return true;
}

export function cycleTodoStatus(id: string): void {
  store.apply("status change", (data) => cycleStatus(data, id, Date.now()));
}

/** Ctrl+Enter: toggle Done ↔ Open on the selected todo. */
export function toggleSelectedDone(): void {
  const id = ui.selectedId;
  if (id === null) return;
  const todo = findTodo(store.data, id);
  if (todo === undefined) return;
  const target = todo.status === "done" ? "open" : "done";
  store.apply("status change", (data) => setStatus(data, id, target, Date.now()));
}

export function trashTodoAction(id: string): void {
  store.apply("delete", (data) => trashTodo(data, id, Date.now()));
  if (ui.selectedId === id) ui.selectedId = null;
  ui.ctxMenu = null;
  ui.showToast("Todo moved to Trash", true);
}

export function moveTodoAction(id: string, listId: string, groupId: string | null, toastMsg: string): void {
  store.apply("move", (data) => moveTodo(data, id, listId, groupId, Date.now()));
  ui.ctxMenu = null;
  ui.clearDragState();
  ui.showToast(toastMsg, true);
}

export function reorderTodoAction(id: string, targetId: string, pos: "before" | "after"): void {
  store.apply("move", (data) => reorderTodo(data, id, targetId, pos, Date.now()));
  ui.clearDragState();
  ui.showToast("Moved", true);
}

export function dropTodoIntoGroup(todoId: string, groupId: string): void {
  const group = store.data.groups.find((g) => g.id === groupId);
  if (group === undefined) return;
  store.apply("move", (data) => {
    moveTodo(data, todoId, group.listId, group.id, Date.now());
    const g = data.groups.find((x) => x.id === groupId);
    if (g !== undefined) g.collapsed = false; // drop expands the group
  });
  ui.clearDragState();
  ui.showToast(`Moved into ${group.name}`, true);
}

// ── undo ────────────────────────────────────────────────────────────────────

export function undoAction(): void {
  const label = store.undo();
  ui.ctxMenu = null;
  ui.showToast(label === null ? "Nothing to undo" : `Undone — ${label}`);
}

// ── list actions ────────────────────────────────────────────────────────────

/** Ctrl+Shift+N: create + arm inline rename, show in the active pane. */
export function newList(): void {
  let id = "";
  store.apply("new list", (data) => {
    id = createList(data, "New list", "📝").id;
  });
  ui.renaming = { type: "list", id, value: formatEmojiName("📝", "New list") };
  switchList(id);
}

export function deleteListAction(id: string): void {
  store.apply("delete list", (data) => deleteList(data, id, Date.now()));
  aiConfig.removeForList(id); // workspace link is config, not undoable data
  // panes showing the deleted list fall back to Inbox
  const inbox = store.data.lists.find((l) => l.fixed);
  ui.panes.forEach((pane, i) => {
    if (pane.listId === id) ui.updatePane(i, { listId: inbox?.id ?? null });
  });
  ui.ctxMenu = null;
  ui.showToast("List deleted — its todos moved to Trash", true);
}

export function reorderListAction(id: string, targetId: string, pos: "before" | "after"): void {
  store.apply("reorder lists", (data) => reorderList(data, id, targetId, pos));
  ui.clearDragState();
  ui.showToast("Lists reordered", true);
}

// ── group actions ───────────────────────────────────────────────────────────

export function newGroup(listId: string, parentId: string | null): void {
  let id: string | null = null;
  store.apply("add group", (data) => {
    id = createGroup(data, listId, parentId, "New group")?.id ?? null;
  });
  if (id !== null) ui.renaming = { type: "group", id, value: "New group" };
  ui.ctxMenu = null;
}

export function deleteGroupAction(id: string): void {
  store.apply("delete group", (data) => deleteGroup(data, id));
  ui.ctxMenu = null;
  ui.showToast("Group deleted — todos kept", true);
}

export function toggleGroupAction(id: string): void {
  store.apply("toggle group", (data) => toggleGroupCollapsed(data, id), { undoable: false });
}

// ── inline rename ───────────────────────────────────────────────────────────

export function armRename(type: "list" | "group", id: string): void {
  const item =
    type === "list"
      ? store.data.lists.find((l) => l.id === id)
      : store.data.groups.find((g) => g.id === id);
  if (item === undefined) return;
  ui.renaming = { type, id, value: formatEmojiName(item.emoji, item.name) };
  ui.ctxMenu = null;
}

export function commitRename(): void {
  const renaming = ui.renaming;
  if (renaming === null) return;
  const value = renaming.value.trim();
  ui.renaming = null;
  if (value === "") return;
  const { emoji, name } = parseEmojiName(value);
  store.apply("rename", (data) => {
    if (renaming.type === "list") renameList(data, renaming.id, name, emoji ?? undefined);
    else renameGroup(data, renaming.id, name, emoji ?? undefined);
  });
}

export function cancelRename(): void {
  ui.renaming = null;
}
