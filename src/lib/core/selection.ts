// Multi-selection arithmetic over one pane's visible row order (the
// `visibleTodoIds` of core/rows.ts — the same order ↑/↓ walks). Pure list math
// with no domain knowledge: an anchor row, a focus row, and the range between
// them. This is the file-manager / mail-client model, so the gestures behave
// the way they already do everywhere else on Windows.

/** A selection is always stored in row order, never in click order. */
function inRowOrder(visible: readonly string[], picked: ReadonlySet<string>): string[] {
  return visible.filter((id) => picked.has(id));
}

/**
 * Every id from `anchorId` to `focusId` inclusive, in row order. The anchor may
 * sit above OR below the focus — a range is symmetric, which is what makes
 * Shift+↑ and Shift+↓ behave the same from the point you started at. Empty when
 * either row is off screen (the filter changed, or the ids came from elsewhere).
 */
export function rangeBetween(
  visible: readonly string[],
  anchorId: string,
  focusId: string,
): string[] {
  const anchor = visible.indexOf(anchorId);
  const focus = visible.indexOf(focusId);
  if (anchor < 0 || focus < 0) return [];
  return visible.slice(Math.min(anchor, focus), Math.max(anchor, focus) + 1);
}

/** Ctrl+click: adds the row when it is out of the selection, drops it when in. */
export function toggleInSelection(
  visible: readonly string[],
  ids: readonly string[],
  id: string,
): string[] {
  const picked = new Set(ids);
  if (picked.has(id)) picked.delete(id);
  else picked.add(id);
  return inRowOrder(visible, picked);
}

/**
 * What a navigation key asks for: an end of the list (Home/End) or a signed row
 * step (±1 for the arrows, ±a page for PageUp/PageDown).
 */
export type RowMove = { to: "first" | "last" } | { by: number };

/**
 * Where a navigation key lands. A step that runs off the edge lands ON the last
 * row rather than nowhere — Page Down near the bottom of a list must reach the
 * bottom, and holding ↓ must stop there instead of doing nothing. With no focus
 * yet, moving down starts at the top of the list and moving up at its end.
 */
export function rowAt(
  visible: readonly string[],
  focusId: string | null,
  move: RowMove,
): string | null {
  if (visible.length === 0) return null;
  const last = visible.length - 1;
  if ("to" in move) return move.to === "first" ? visible[0] : visible[last];
  const at = focusId === null ? -1 : visible.indexOf(focusId);
  const from = at < 0 ? (move.by > 0 ? -1 : visible.length) : at;
  return visible[Math.min(last, Math.max(0, from + move.by))];
}
