// Centralized keyboard handling (SHORTCUTS.md). One window-level listener;
// no component registers its own shortcuts. Rules: Ctrl-shortcuts work while
// typing (except Ctrl+Z = native text undo in inputs); plain keys are
// ignored when an input/textarea/select has focus.

import { buildPaneRows } from "$lib/core/rows";
import { findTodo } from "$lib/core/todos-ops";
import { openAiPanelForSelection } from "./ai-actions";
import {
  cancelRename, newList, openDetails, switchList, toggleSelectedDone,
  trashTodoAction, undoAction,
} from "./actions";
import { togglePinAction } from "./actions-detail";
import { moveUpOneLevel } from "./menus";
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
  const pane = ui.activePaneState;
  if (pane.filterOpen) {
    ui.updatePane(ui.activePane, { filterOpen: false, filterText: "" });
    return;
  }
  if (ui.detailOpen) ui.detailOpen = false;
}

function navigateTodos(direction: 1 | -1): void {
  const pane = ui.activePaneState;
  if (ui.view !== "main" || pane.listId === null) return;
  const { visibleTodoIds } = buildPaneRows(store.data, {
    listId: pane.listId,
    archivedOpen: ui.archOpen[pane.listId] === true,
  });
  if (visibleTodoIds.length === 0) return;
  const current = ui.selectedId === null ? -1 : visibleTodoIds.indexOf(ui.selectedId);
  const next =
    current < 0
      ? 0
      : Math.min(visibleTodoIds.length - 1, Math.max(0, current + direction));
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
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    toggleSelectedDone();
    return;
  }
  if (e.ctrlKey && !e.shiftKey && key === "p") {
    e.preventDefault();
    if (ui.selectedId !== null) togglePinAction(ui.selectedId, "local");
    return;
  }
  // plain keys below never fire while typing
  if (editing) return;
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
    trashTodoAction(ui.selectedId);
    return;
  }
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    navigateTodos(e.key === "ArrowDown" ? 1 : -1);
  }
}
