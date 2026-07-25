// Color palette actions: the two central palettes (Settings → Todo colors /
// List colors), the per-list names (detail panel → Manage…) and a list's own
// color. All of it is domain data, so all of it is undoable and travels with
// an export.

import { newId } from "$lib/core/ids";
import { setLabelName } from "$lib/core/label-names";
import {
  canAddCustomLabel, deleteCustomLabel, isBuiltinLabel, nextLabelOrder, resetBuiltinLabels,
} from "$lib/core/labels";
import { setListColor } from "$lib/core/lists-ops";
import type { PaletteKind } from "$lib/core/types";
import { store } from "./store.svelte";
import { ui } from "./ui.svelte";

/** A fresh color starts on the accent — the user recolors it right away. */
const NEW_LABEL_COLOR = "#9184d9";

export function addCustomLabel(kind: PaletteKind): void {
  if (!canAddCustomLabel(store.data, kind)) return;
  store.apply("add color", (data) => {
    data.colorLabels.push({
      id: newId(),
      kind,
      name: null,
      color: NEW_LABEL_COLOR,
      order: nextLabelOrder(data, kind),
    });
  });
}

/** Central edit — applies to every list unless the list renamed the label. */
export function updateLabel(id: string, color: string, name: string | null): void {
  const trimmed = name?.trim() ?? "";
  store.apply("edit color", (data) => {
    const label = data.colorLabels.find((l) => l.id === id);
    if (label === undefined) return;
    label.color = color;
    label.name = trimmed === "" ? null : trimmed;
  });
}

export function removeCustomLabel(id: string): void {
  if (isBuiltinLabel(id)) return;
  store.apply("remove color", (data) => deleteCustomLabel(data, id));
}

export function resetBuiltinLabelsAction(kind: PaletteKind): void {
  store.apply("reset colors", (data) => resetBuiltinLabels(data, kind));
  ui.showToast("Built-in colors restored", true);
}

/** Per-list name; null or empty clears it back to the central name. */
export function setLabelNameAction(listId: string, labelId: string, name: string | null): void {
  store.apply("rename color", (data) => setLabelName(data, listId, labelId, name));
}

/** The list's own color (rail stripe, tab, pane header). */
export function setListColorAction(listId: string, colorLabelId: string | null): void {
  store.apply("list color", (data) => setListColor(data, listId, colorLabelId));
  ui.ctxMenu = null;
}
