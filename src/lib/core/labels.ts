// The color palette: 8 built-in labels every install starts with, plus up to
// MAX_CUSTOM_LABELS user-added ones. Built-ins are ordinary rows seeded on
// first run (bootstrap.ts) and recognised by their fixed ids — so they can be
// renamed and recolored centrally, but never deleted (a todo pointing at one
// must never lose its color). Per-list names live in label-names.ts.

import { byOrder } from "./ordering";
import { MAX_CUSTOM_LABELS, type ColorLabel, type DomainData } from "./types";

export interface LabelDefault {
  id: string;
  color: string;
  name: string;
}

export const DEFAULT_LABELS: readonly LabelDefault[] = [
  { id: "preset-neutral", color: "#9397ab", name: "Neutral" },
  { id: "preset-red", color: "#e07b7b", name: "Red" },
  { id: "preset-orange", color: "#e0a36c", name: "Orange" },
  { id: "preset-yellow", color: "#d4c26a", name: "Yellow" },
  { id: "preset-green", color: "#7cc98f", name: "Green" },
  { id: "preset-blue", color: "#6ca3e0", name: "Blue" },
  { id: "preset-purple", color: "#9184d9", name: "Purple" },
  { id: "preset-gray", color: "#75798c", name: "Gray" },
];

/** Order values 1000, 2000… keep the built-ins ahead of every added color. */
export const BUILTIN_ORDER_STEP = 1000;

export function isBuiltinLabel(id: string): boolean {
  return DEFAULT_LABELS.some((d) => d.id === id);
}

/** The whole palette in display order: built-ins first, then added colors. */
export function sortedLabels(data: DomainData): ColorLabel[] {
  return [...data.colorLabels].sort(byOrder);
}

export function customLabels(data: DomainData): ColorLabel[] {
  return sortedLabels(data).filter((label) => !isBuiltinLabel(label.id));
}

export function canAddCustomLabel(data: DomainData): boolean {
  return customLabels(data).length < MAX_CUSTOM_LABELS;
}

/** Order for a newly added color — always after everything else. */
export function nextLabelOrder(data: DomainData): number {
  const highest = Math.max(0, ...data.colorLabels.map((label) => label.order));
  return highest + BUILTIN_ORDER_STEP;
}

export function findLabel(data: DomainData, id: string | null): ColorLabel | undefined {
  return id === null ? undefined : data.colorLabels.find((label) => label.id === id);
}

/** Hex color for a todo's colorLabelId; null when unset or the label is gone. */
export function labelColor(data: DomainData, colorLabelId: string | null): string | null {
  return findLabel(data, colorLabelId)?.color ?? null;
}

/** The palette-wide name — what every list sees unless it renamed the label. */
export function centralLabelName(data: DomainData, colorLabelId: string | null): string {
  const label = findLabel(data, colorLabelId);
  if (label === undefined) return "None";
  return label.name ?? label.color;
}

/** Removes an added color; todos and per-list names referencing it follow. */
export function deleteCustomLabel(data: DomainData, id: string): void {
  if (isBuiltinLabel(id)) return; // built-ins are permanent by design
  data.colorLabels = data.colorLabels.filter((label) => label.id !== id);
  data.labelNames = data.labelNames.filter((entry) => entry.labelId !== id);
  for (const todo of data.todos) {
    if (todo.colorLabelId === id) todo.colorLabelId = null;
  }
}

/** Restores the shipped name and color of the 8 built-ins; adds back missing ones. */
export function resetBuiltinLabels(data: DomainData): void {
  DEFAULT_LABELS.forEach((preset, index) => {
    const existing = data.colorLabels.find((label) => label.id === preset.id);
    const order = (index + 1) * BUILTIN_ORDER_STEP;
    if (existing === undefined) {
      data.colorLabels.push({ id: preset.id, name: preset.name, color: preset.color, order });
      return;
    }
    existing.name = preset.name;
    existing.color = preset.color;
    existing.order = order;
  });
}
