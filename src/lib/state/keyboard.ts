// Centralized keyboard handling (SHORTCUTS.md). One window-level listener;
// no component registers its own shortcuts. Rules: Ctrl-shortcuts work while
// typing (except Ctrl+Z = native text undo in inputs); plain keys are
// ignored when an input/textarea/select has focus.

import { findTodo } from "$lib/core/todos-ops";
import { openAiPanelForSelection } from "./ai-actions";
import { cancelRename, newList, openDetails, switchList, undoAction } from "./actions";
import {
  toggleDoneSelectionAction, togglePinSelectionAction, trashSelectionAction,
} from "./actions-bulk";
import { moveSelectionInScopeAction } from "./actions-bulk-move";
import { indentTodoAction, outdentTodoAction } from "./actions-tree";
import { moveUpOneLevel } from "./menus";
import {
  clearMultiSelection, extendSelection, selectAllInPane, visibleIdsOf,
} from "./selection";
import { store } from "./store.svelte";
import { ui } from "./ui.svelte";

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && /^(input|textarea|select)$/i.test(target.tagName);
}

/** Esc closes strictly in priority order (INTERACTIONS.md). */
function handleEscape(): void {
  if (ui.menuOpen !== null) {
    ui.menuOpen = null;
    return;
  }
  if (ui.shortcutsOpen) {
    ui.shortcutsOpen = false;
    return;
  }
  if (ui.aboutOpen) {
    ui.aboutOpen = false;
    return;
  }
  if (ui.changelogOpen) {
    ui.changelogOpen = false;
    return;
  }
  if (ui.ctxMenu !== null) {
    ui.ctxMenu = null;
    return;
  }
  if (ui.scalePopOpen) {
    ui.scalePopOpen = false;
    return;
  }
  if (ui.settingsOpen) {
    ui.settingsOpen = false;
    return;
  }
  if (ui.workspaceSettings !== null) {
    ui.workspaceSettings = null;
    return;
  }
  if (ui.listAppearance !== null) {
    ui.listAppearance = null;
    return;
  }
  if (ui.aiClientsOpen) {
    ui.aiClientsOpen = false;
    return;
  }
  if (ui.palette !== null) {
    ui.palette = null;
    return;
  }
  if (ui.globalSearch !== null) {
    ui.globalSearch = null;
    return;
  }
  if (ui.aiPanel !== null) {
    // closing the panel never stops a running run (INTERACTIONS.md §AI runs)
    ui.aiPanel = null;
    return;
  }
  if (ui.renaming !== null) {
    cancelRename();
    return;
  }
  if (ui.panes.some((p) => p.pickerOpen)) {
    ui.panes.forEach((_, i) => ui.updatePane(i, { pickerOpen: false }));
    return;
  }
  // a multi-selection is more recent state than the filter bar behind it
  if (clearMultiSelection()) return;
  const pane = ui.activePaneState;
  if (pane.filterOpen) {
    ui.updatePane(ui.activePane, { filterOpen: false, filterText: "" });
    return;
  }
  if (ui.detailOpen) ui.detailOpen = false;
}

/** Plain ↑/↓: one row, and the selection collapses onto it. */
function navigateTodos(direction: 1 | -1): void {
  const visibleTodoIds = visibleIdsOf(ui.activePane);
  if (visibleTodoIds.length === 0) return;
  const current = ui.selectedId === null ? -1 : visibleTodoIds.indexOf(ui.selectedId);
  const next =
    current < 0
      ? 0
      : Math.min(visibleTodoIds.length - 1, Math.max(0, current + direction));
  ui.multi = null;
  ui.selectedId = visibleTodoIds[next];
}

export function handleKeydown(e: KeyboardEvent): void {
  const key = e.key.toLowerCase();
  const editing = isEditable(e.target);

  if (e.key === "Escape") {
    handleEscape();
    return;
  }
  if (e.key === "F1") {
    e.preventDefault();
    ui.shortcutsOpen = !ui.shortcutsOpen;
    ui.menuOpen = null;
    return;
  }
  if (e.ctrlKey && e.shiftKey && key === "n") {
    e.preventDefault();
    newList();
    return;
  }
  if (e.ctrlKey && e.shiftKey && key === "f") {
    e.preventDefault();
    ui.globalSearch = { query: "", index: 0 };
    return;
  }
  if (e.ctrlKey && e.shiftKey && key === "a") {
    e.preventDefault();
    openAiPanelForSelection();
    return;
  }
  if (e.ctrlKey && !e.shiftKey && key === "k") {
    e.preventDefault();
    ui.palette = { query: "", index: 0 };
    return;
  }
  // Ctrl+A selects the list, but inside an input it stays "select all text"
  if (e.ctrlKey && !e.shiftKey && key === "a" && !editing && !ui.overlayOpen) {
    e.preventDefault();
    selectAllInPane();
    return;
  }
  if (e.ctrlKey && !e.shiftKey && key === "f") {
    e.preventDefault();
    const pane = ui.activePaneState;
    ui.updatePane(ui.activePane, { filterOpen: !pane.filterOpen, filterText: "" });
    return;
  }
  if (e.ctrlKey && !e.shiftKey && key === "n") {
    e.preventDefault();
    ui.quickAddEls[ui.activePane]?.focus();
    return;
  }
  if (e.ctrlKey && key === "z" && !editing) {
    e.preventDefault();
    undoAction();
    return;
  }
  if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
    e.preventDefault();
    const list = [...store.data.lists].sort((a, b) => a.order - b.order)[Number(e.key) - 1];
    if (list !== undefined) switchList(list.id);
    return;
  }
  // the selection actions below serve one row and many identically
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    toggleDoneSelectionAction();
    return;
  }
  if (e.ctrlKey && !e.shiftKey && key === "p") {
    e.preventDefault();
    togglePinSelectionAction("local");
    return;
  }
  // plain keys below never fire while typing
  if (editing) return;
  // Tab / Shift+Tab reshape the sub-item tree, the outliner convention. Only
  // with a selected todo — otherwise Tab stays the normal focus key.
  if (e.key === "Tab" && !e.ctrlKey && !e.altKey && ui.selectedId !== null && !ui.overlayOpen) {
    e.preventDefault();
    if (e.shiftKey) outdentTodoAction(ui.selectedId);
    else indentTodoAction(ui.selectedId);
    return;
  }
  // Alt+↑/↓ reorders (the whole selection), Shift+↑/↓ grows it, plain ↑/↓ walks
  if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && ui.selectedId !== null) {
    e.preventDefault();
    moveSelectionInScopeAction(e.key === "ArrowUp" ? "up" : "down");
    return;
  }
  if (
    e.shiftKey && !e.altKey && !e.ctrlKey && !ui.overlayOpen &&
    (e.key === "ArrowUp" || e.key === "ArrowDown")
  ) {
    e.preventDefault();
    extendSelection(e.key === "ArrowDown" ? 1 : -1);
    return;
  }
  if (e.altKey && e.key === "ArrowLeft" && ui.selectedId !== null) {
    e.preventDefault();
    const todo = findTodo(store.data, ui.selectedId);
    if (todo !== undefined && todo.groupId !== null) moveUpOneLevel(todo);
    return;
  }
  // double-click edits the title in place, so Enter is the details gesture
  if (e.key === "Enter" && ui.selectedId !== null && !ui.overlayOpen) {
    e.preventDefault();
    openDetails(ui.selectedId);
    return;
  }
  if (e.key === "F2" && ui.selectedId !== null) {
    ui.detailOpen = true;
    ui.detailTab = "details";
    ui.focusTitleTick += 1;
    return;
  }
  if (e.key === "Delete" && ui.selectedId !== null) {
    trashSelectionAction();
    return;
  }
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    navigateTodos(e.key === "ArrowDown" ? 1 : -1);
  }
}
