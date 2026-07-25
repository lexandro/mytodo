// Two independent palettes: todos are colored from the "todo" palette, lists
// from the "list" one. Each ships built-in colors that are ordinary rows,
// seeded on first run (bootstrap.ts) and recognised by their fixed ids — so
// they can be renamed and recolored centrally, but never deleted (a todo or
// list pointing at one must never lose its color). Users can add up to
// MAX_CUSTOM_LABELS colors per palette. Per-list names live in label-names.ts.

import { byOrder } from "./ordering";
import {
  MAX_CUSTOM_LABELS, type ColorLabel, type DomainData, type PaletteKind,
} from "./types";

export interface LabelDefault {
  id: string;
  color: string;
  name: string;
}

const TODO_DEFAULTS: readonly LabelDefault[] = [
  { id: "preset-neutral", color: "#9397ab", name: "Neutral" },
  { id: "preset-red", color: "#e07b7b", name: "Red" },
  { id: "preset-orange", color: "#e0a36c", name: "Orange" },
  { id: "preset-yellow", color: "#d4c26a", name: "Yellow" },
  { id: "preset-green", color: "#7cc98f", name: "Green" },
  { id: "preset-blue", color: "#6ca3e0", name: "Blue" },
  { id: "preset-purple", color: "#9184d9", name: "Purple" },
  { id: "preset-gray", color: "#75798c", name: "Gray" },
];

const LIST_DEFAULTS: readonly LabelDefault[] = [
  { id: "list-violet", color: "#9184d9", name: "Violet" },
  { id: "list-blue", color: "#6ca3e0", name: "Blue" },
  { id: "list-teal", color: "#5fc2b0", name: "Teal" },
  { id: "list-green", color: "#7cc98f", name: "Green" },
  { id: "list-yellow", color: "#d4c26a", name: "Yellow" },
  { id: "list-orange", color: "#e0a36c", name: "Orange" },
  { id: "list-red", color: "#e07b7b", name: "Red" },
  { id: "list-slate", color: "#75798c", name: "Slate" },
];

export const DEFAULT_LABELS: Record<PaletteKind, readonly LabelDefault[]> = {
  todo: TODO_DEFAULTS,
  list: LIST_DEFAULTS,
};

/** Order values 1000, 2000… keep the built-ins ahead of every added color. */
export const BUILTIN_ORDER_STEP = 1000;

export function isBuiltinLabel(id: string): boolean {
  return TODO_DEFAULTS.some((d) => d.id === id) || LIST_DEFAULTS.some((d) => d.id === id);
}

/** One palette in display order: built-ins first, then added colors. */
export function sortedLabels(data: DomainData, kind: PaletteKind): ColorLabel[] {
  return data.colorLabels.filter((label) => label.kind === kind).sort(byOrder);
}

export function customLabels(data: DomainData, kind: PaletteKind): ColorLabel[] {
  return sortedLabels(data, kind).filter((label) => !isBuiltinLabel(label.id));
}

export function canAddCustomLabel(data: DomainData, kind: PaletteKind): boolean {
  return customLabels(data, kind).length < MAX_CUSTOM_LABELS;
}

/** Order for a newly added color — always after everything else in its palette. */
export function nextLabelOrder(data: DomainData, kind: PaletteKind): number {
  const orders = sortedLabels(data, kind).map((label) => label.order);
  return Math.max(0, ...orders) + BUILTIN_ORDER_STEP;
}

export function findLabel(data: DomainData, id: string | null): ColorLabel | undefined {
  return id === null ? undefined : data.colorLabels.find((label) => label.id === id);
}

/** Hex color for a todo's or list's colorLabelId; null when unset or gone. */
export function labelColor(data: DomainData, colorLabelId: string | null): string | null {
  return findLabel(data, colorLabelId)?.color ?? null;
}

/** Faint circular backdrop behind a colored icon; transparent when uncolored. */
export function tintBackground(color: string | null): string {
  return color === null ? "transparent" : `color-mix(in srgb, ${color} 26%, transparent)`;
}

/** The palette-wide name — what every list sees unless it renamed the label. */
export function centralLabelName(data: DomainData, colorLabelId: string | null): string {
  const label = findLabel(data, colorLabelId);
  if (label === undefined) return "None";
  return label.name ?? label.color;
}

/** Removes an added color; todos, lists and per-list names follow. */
export function deleteCustomLabel(data: DomainData, id: string): void {
  if (isBuiltinLabel(id)) return; // built-ins are permanent by design
  data.colorLabels = data.colorLabels.filter((label) => label.id !== id);
  data.labelNames = data.labelNames.filter((entry) => entry.labelId !== id);
  for (const todo of data.todos) {
    if (todo.colorLabelId === id) todo.colorLabelId = null;
  }
  for (const list of data.lists) {
    if (list.colorLabelId === id) list.colorLabelId = null;
  }
}

/** Restores the shipped name and color of one palette's built-ins. */
export function resetBuiltinLabels(data: DomainData, kind: PaletteKind): void {
  DEFAULT_LABELS[kind].forEach((preset, index) => {
    const existing = data.colorLabels.find((label) => label.id === preset.id);
    const order = (index + 1) * BUILTIN_ORDER_STEP;
    if (existing === undefined) {
      data.colorLabels.push({ id: preset.id, kind, name: preset.name, color: preset.color, order });
      return;
    }
    existing.name = preset.name;
    existing.color = preset.color;
    existing.order = order;
  });
}
