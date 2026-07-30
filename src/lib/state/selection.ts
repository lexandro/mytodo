// Multi-selection gestures — the file-manager set, so nothing here should
// surprise anyone: Ctrl+click toggles one row, Shift+click takes the range from
// the anchor, Shift+↑/↓ grows and shrinks it, Ctrl+A takes the whole pane, a
// plain click or Esc collapses back to one row.
//
// `ui.selectedId` stays the focus row throughout, and a selection of one row is
// stored as no multi-selection at all (see ui.svelte MultiSelectState) — so the
// single-todo paths never have to know this file exists.

import { buildPaneRows } from "$lib/core/rows";
import { todoMatches } from "$lib/core/search";
import { rangeBetween, rowAt, toggleInSelection, type RowMove } from "$lib/core/selection";
import { selectTodo } from "./actions";
import { revealFocus } from "./row-scroll";
import { store } from "./store.svelte";
import { ui, type MultiSelectState } from "./ui.svelte";

/**
 * One pane's rows in render order — what ↑/↓ walks and what a range spans. The
 * live filter is honoured: rows nobody can see must not be reachable.
 */
export function visibleIdsOf(paneIndex: number): string[] {
  const pane = ui.panes[paneIndex];
  if (ui.view !== "main" || pane === undefined || pane.listId === null) return [];
  const query = pane.filterOpen ? pane.filterText.trim() : "";
  return buildPaneRows(store.data, {
    listId: pane.listId,
    archivedOpen: ui.archOpen[pane.listId] === true,
    matches: query === "" ? undefined : (todo) => todoMatches(store.data, query, todo),
  }).visibleTodoIds;
}

/** The multi-selection, but only when it belongs to this pane. */
function multiIn(paneIndex: number): MultiSelectState | null {
  const multi = ui.multiSelection;
  return multi !== null && multi.paneIndex === paneIndex ? multi : null;
}

/**
 * Stores a selection. One row (or none) is the plain single selection, never a
 * one-element multi-selection — the focus falls back to the last selected row
 * when the gesture deselected the row it was on.
 */
function applySelection(
  paneIndex: number,
  anchorId: string,
  ids: string[],
  focusId: string,
): void {
  ui.activePane = paneIndex;
  if (ids.length <= 1) {
    ui.multi = null;
    ui.selectedId = ids.length === 1 ? ids[0] : null;
    return;
  }
  ui.multi = { paneIndex, anchorId, ids };
  ui.selectedId = ids.includes(focusId) ? focusId : ids[ids.length - 1];
}

export interface ClickMods {
  ctrl: boolean;
  shift: boolean;
}

/**
 * A click on a todo row. Plain click collapses to that row; Ctrl toggles it;
 * Shift takes the range from the anchor. A modified click in another pane starts
 * over there, because a range only means something inside one row list.
 */
export function clickTodo(id: string, paneIndex: number, mods: ClickMods): void {
  const visible = visibleIdsOf(paneIndex);
  if ((!mods.ctrl && !mods.shift) || visible.length === 0) {
    ui.multi = null;
    selectTodo(id, paneIndex);
    return;
  }
  const current = multiIn(paneIndex);
  const anchorId = current?.anchorId ?? ui.selectedId;
  if (mods.shift && anchorId !== null && visible.includes(anchorId)) {
    applySelection(paneIndex, anchorId, rangeBetween(visible, anchorId, id), id);
    return;
  }
  // Ctrl+click, and Shift+click with no anchor to extend from: toggle this one
  // row and re-anchor here, so the next Shift+click extends from it
  const base = current?.ids ?? (anchorId === null ? [] : [anchorId]);
  applySelection(paneIndex, id, toggleInSelection(visible, base, id), id);
}

/** ↑/↓, PageUp/PageDown, Home/End: move the focus, collapse onto that one row. */
export function navigateTo(move: RowMove): void {
  const paneIndex = ui.activePane;
  const nextFocus = rowAt(visibleIdsOf(paneIndex), ui.selectedId, move);
  if (nextFocus === null) return;
  ui.multi = null;
  selectTodo(nextFocus, paneIndex);
  revealFocus(paneIndex, "to" in move ? move.to : undefined);
}

/**
 * The same moves with Shift: the focus travels, the anchor stays where the
 * selection started, and everything between them comes along.
 */
export function extendSelectionTo(move: RowMove): void {
  const paneIndex = ui.activePane;
  const visible = visibleIdsOf(paneIndex);
  const nextFocus = rowAt(visible, ui.selectedId, move);
  if (nextFocus === null) return;
  const anchorId = multiIn(paneIndex)?.anchorId ?? ui.selectedId;
  if (anchorId === null || !visible.includes(anchorId)) {
    // nothing to extend from — this is just a move
    ui.multi = null;
    selectTodo(nextFocus, paneIndex);
  } else {
    applySelection(paneIndex, anchorId, rangeBetween(visible, anchorId, nextFocus), nextFocus);
  }
  revealFocus(paneIndex, "to" in move ? move.to : undefined);
}

/** Ctrl+A: every visible row of the active pane, focus left where it was. */
export function selectAllInPane(): void {
  const paneIndex = ui.activePane;
  const visible = visibleIdsOf(paneIndex);
  if (visible.length === 0) return;
  const focusId =
    ui.selectedId !== null && visible.includes(ui.selectedId) ? ui.selectedId : visible[0];
  applySelection(paneIndex, visible[0], visible, focusId);
}

/** Esc and clicks on empty space. True when there was a selection to clear. */
export function clearMultiSelection(): boolean {
  if (ui.multiSelection === null) return false;
  ui.multi = null;
  return true;
}

/** Row highlight: the multi-selection when there is one, else the single row. */
export function isTodoSelected(id: string): boolean {
  const multi = ui.multiSelection;
  return multi === null ? ui.selectedId === id : multi.ids.includes(id);
}

/** True while a drag is carrying the whole multi-selection. */
export function isMultiDrag(): boolean {
  const drag = ui.drag;
  const multi = ui.multiSelection;
  return drag !== null && drag.type === "todo" && multi !== null && multi.ids.includes(drag.id);
}
