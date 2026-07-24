// Color labels: 8 fixed built-in presets (constants, not DB rows) plus up to
// 12 user-defined labels stored in DomainData.colorLabels.

import { MAX_CUSTOM_LABELS, type ColorLabel, type DomainData } from "./types";

export interface PresetLabel {
  id: string;
  color: string;
  name: string;
}

export const PRESET_LABELS: readonly PresetLabel[] = [
  { id: "preset-neutral", color: "#9397ab", name: "Neutral" },
  { id: "preset-red", color: "#e07b7b", name: "Red" },
  { id: "preset-orange", color: "#e0a36c", name: "Orange" },
  { id: "preset-yellow", color: "#d4c26a", name: "Yellow" },
  { id: "preset-green", color: "#7cc98f", name: "Green" },
  { id: "preset-blue", color: "#6ca3e0", name: "Blue" },
  { id: "preset-purple", color: "#9184d9", name: "Purple" },
  { id: "preset-gray", color: "#75798c", name: "Gray" },
];

/** Hex color for a todo's colorLabelId — preset or custom; null when unset/gone. */
export function labelColor(data: DomainData, colorLabelId: string | null): string | null {
  if (colorLabelId === null) return null;
  const preset = PRESET_LABELS.find((p) => p.id === colorLabelId);
  if (preset !== undefined) return preset.color;
  return data.colorLabels.find((c) => c.id === colorLabelId)?.color ?? null;
}

/** Display name for the picker ("Fontos", "Red", …). */
export function labelName(data: DomainData, colorLabelId: string | null): string {
  if (colorLabelId === null) return "None";
  const preset = PRESET_LABELS.find((p) => p.id === colorLabelId);
  if (preset !== undefined) return preset.name;
  const custom = data.colorLabels.find((c) => c.id === colorLabelId);
  return custom?.name ?? custom?.color ?? "None";
}

export function canAddCustomLabel(data: DomainData): boolean {
  return data.colorLabels.length < MAX_CUSTOM_LABELS;
}

/** Removes a custom label; todos referencing it fall back to no label. */
export function deleteCustomLabel(data: DomainData, id: string): void {
  data.colorLabels = data.colorLabels.filter((c) => c.id !== id);
  for (const todo of data.todos) {
    if (todo.colorLabelId === id) todo.colorLabelId = null;
  }
}

export function sortedCustomLabels(data: DomainData): ColorLabel[] {
  return [...data.colorLabels].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1));
}
