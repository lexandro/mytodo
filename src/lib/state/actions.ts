// Action layer: UI events → domain mutations (store.apply) + UI state +
// toasts. Components call these and stay thin.

import { formatEmojiName, parseEmojiName } from "$lib/core/emoji";
import { createGroup, deleteGroup, renameGroup, toggleGroupCollapsed } from "$lib/core/groups-ops";
import { createList, deleteList, renameList, reorderList } from "$lib/core/lists-ops";
import { DEFAULT_SETTINGS_SECTION, type SettingsSectionId } from "$lib/core/settings-sections";
import { createTodo, cycleStatus, findTodo, moveTodo, reorderTodo, setStatus, trashTodo } from "$lib/core/todos-ops";
import type { TodoStatus } from "$lib/core/types";
import { renameTodoAction } from "./actions-detail";
import { detailOpened } from "./ai-actions";
import { aiConfig } from "./ai-config.svelte";
import { placeByStatusIfEnabled, placeNewTodos } from "./status-placement";
import { store } from "./store.svelte";
import { ui, type RenamingState } from "./ui.svelte";

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

/** Opens Settings straight on a section — the deep link menus and links use. */
export function openSettings(section: SettingsSectionId = DEFAULT_SETTINGS_SECTION): void {
  ui.settingsSection = section;
  ui.settingsOpen = true;
  ui.menuOpen = null;
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
    placeNewTodos(data, [newId]);
  });
  ui.updatePane(paneIndex, { quickDraft: "" });
  if (openDetail) openDetails(newId, paneIndex);
  return true;
}

/** Every status change funnels through here — see status-placement.ts. */
export function setTodoStatus(id: string, status: TodoStatus): void {
  store.apply("status change", (data) => {
    const now = Date.now();
    if (setStatus(data, id, status, now)) placeByStatusIfEnabled(data, [id], now);
  });
}

export function cycleTodoStatus(id: string): void {
  store.apply("status change", (data) => {
    const now = Date.now();
    if (cycleStatus(data, id, now)) placeByStatusIfEnabled(data, [id], now);
  });
}

// Ctrl+Enter lives in actions-bulk.ts (toggleDoneSelectionAction): it toggles
// the whole selection, and one row is just a selection of one.

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
  armRename("list", id);
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
  if (id !== null) armRename("group", id); // arms the input on the fresh "New group"
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

/** Initial input value, or null when the item is gone. */
function renameStartValue(type: RenamingState["type"], id: string): string | null {
  if (type === "todo") return findTodo(store.data, id)?.title ?? null;
  const item =
    type === "list"
      ? store.data.lists.find((l) => l.id === id)
      : store.data.groups.find((g) => g.id === id);
  return item === undefined ? null : formatEmojiName(item.emoji, item.name);
}

export function armRename(type: RenamingState["type"], id: string): void {
  const value = renameStartValue(type, id);
  if (value === null) return;
  // the active pane is the one the row was clicked/right-clicked in
  ui.renaming = { type, id, value, paneIndex: ui.activePane };
  ui.ctxMenu = null;
}

export function commitRename(): void {
  const renaming = ui.renaming;
  if (renaming === null) return;
  const value = renaming.value.trim();
  ui.renaming = null;
  if (value === "") return;
  if (renaming.type === "todo") {
    renameTodoAction(renaming.id, value); // title only — no emoji parsing
    return;
  }
  const { emoji, name } = parseEmojiName(value);
  store.apply("rename", (data) => {
    if (renaming.type === "list") renameList(data, renaming.id, name, emoji ?? undefined);
    else renameGroup(data, renaming.id, name, emoji ?? undefined);
  });
}

export function cancelRename(): void {
  ui.renaming = null;
}
