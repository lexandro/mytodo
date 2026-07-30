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
 * Shift+↑/↓: the focus steps one row while the anchor stays put — so the range
 * grows away from the anchor, shrinks back onto it, then flips to the other
 * side. Returns null at the ends of the list (nothing to step onto), and the
 * nearest end when the focus row is not on screen at all.
 */
export function stepFocus(
  visible: readonly string[],
  focusId: string,
  direction: 1 | -1,
): string | null {
  if (visible.length === 0) return null;
  const at = visible.indexOf(focusId);
  if (at < 0) return visible[direction === 1 ? 0 : visible.length - 1];
  const next = at + direction;
  if (next < 0 || next >= visible.length) return null;
  return visible[next];
}
