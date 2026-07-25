// Per-list label names. The palette (color + default name) is central; a list
// may rename any label for its own context without touching the others, so the
// same blue can be "Waiting for review" at work and "Groceries" at home.

import { centralLabelName } from "./labels";
import type { DomainData } from "./types";

/** Deterministic row id — one override per (list, label) pair. */
export function labelNameId(listId: string, labelId: string): string {
  return `${listId}::${labelId}`;
}

/** The list's own name for a label, or null when it uses the central one. */
export function labelNameOverride(
  data: DomainData,
  listId: string,
  labelId: string,
): string | null {
  return data.labelNames.find((entry) => entry.id === labelNameId(listId, labelId))?.name ?? null;
}

/**
 * What a label is called in a list: the list's own name if it has one, the
 * central name otherwise. `listId === null` (Pinned, Trash, global search)
 * always shows the central name.
 */
export function labelName(
  data: DomainData,
  listId: string | null,
  colorLabelId: string | null,
): string {
  if (listId === null || colorLabelId === null) return centralLabelName(data, colorLabelId);
  return labelNameOverride(data, listId, colorLabelId) ?? centralLabelName(data, colorLabelId);
}

/** Sets or (with null / empty / central-matching text) clears the override. */
export function setLabelName(
  data: DomainData,
  listId: string,
  labelId: string,
  name: string | null,
): void {
  const id = labelNameId(listId, labelId);
  const trimmed = name?.trim() ?? "";
  const drop = trimmed === "" || trimmed === centralLabelName(data, labelId);
  const existing = data.labelNames.find((entry) => entry.id === id);
  if (drop) {
    if (existing !== undefined) data.labelNames = data.labelNames.filter((e) => e.id !== id);
    return;
  }
  if (existing === undefined) data.labelNames.push({ id, listId, labelId, name: trimmed });
  else existing.name = trimmed;
}

/** Drops every override of a list — used when the list itself is deleted. */
export function clearListLabelNames(data: DomainData, listId: string): void {
  data.labelNames = data.labelNames.filter((entry) => entry.listId !== listId);
}
