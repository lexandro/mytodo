// Color palette actions: the central palette (Settings → Todo colors) and the
// per-list names (detail panel → Manage…). Both are domain data, so both are
// undoable and travel with an export.

import { newId } from "$lib/core/ids";
import { setLabelName } from "$lib/core/label-names";
import {
  canAddCustomLabel, deleteCustomLabel, isBuiltinLabel, nextLabelOrder, resetBuiltinLabels,
} from "$lib/core/labels";
import { store } from "./store.svelte";
import { ui } from "./ui.svelte";

/** A fresh color starts as a copy of the accent — the user recolors it right away. */
const NEW_LABEL_COLOR = "#9184d9";

export function addCustomLabel(): void {
  if (!canAddCustomLabel(store.data)) return;
  store.apply("add color", (data) => {
    data.colorLabels.push({
      id: newId(),
      name: null,
      color: NEW_LABEL_COLOR,
      order: nextLabelOrder(data),
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

export function resetBuiltinLabelsAction(): void {
  store.apply("reset colors", (data) => resetBuiltinLabels(data));
  ui.showToast("Built-in colors restored", true);
}

/** Per-list name; null or empty clears it back to the central name. */
export function setLabelNameAction(listId: string, labelId: string, name: string | null): void {
  store.apply("rename color", (data) => setLabelName(data, listId, labelId, name));
}
