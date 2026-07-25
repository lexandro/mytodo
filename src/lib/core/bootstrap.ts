// First-run defaults. Runs through the normal apply() pipeline on every
// startup — a no-op when the data already exists.

import { newId } from "./ids";
import { BUILTIN_ORDER_STEP, DEFAULT_LABELS } from "./labels";
import { ORDER_STEP } from "./ordering";
import { PALETTE_KINDS, type DomainData } from "./types";

export const INBOX_NAME = "Inbox";
export const INBOX_EMOJI = "📥";

/** Creates the fixed, undeletable Inbox list if it does not exist yet. */
export function ensureInbox(data: DomainData): void {
  if (data.lists.some((l) => l.fixed)) return;
  data.lists.push({
    id: newId(),
    name: INBOX_NAME,
    emoji: INBOX_EMOJI,
    fixed: true,
    colorLabelId: null,
    order: ORDER_STEP,
  });
}

/**
 * Seeds the built-in colors of both palettes as real rows. Existing installs
 * get them on the next launch; a renamed or recolored built-in is left alone,
 * and a missing one is restored (a todo or list may still point at it).
 */
export function ensurePresetLabels(data: DomainData): void {
  for (const kind of PALETTE_KINDS) {
    DEFAULT_LABELS[kind].forEach((preset, index) => {
      const existing = data.colorLabels.find((label) => label.id === preset.id);
      if (existing !== undefined) {
        existing.kind = kind; // a built-in id always belongs to its own palette
        return;
      }
      data.colorLabels.push({
        id: preset.id,
        kind,
        name: preset.name,
        color: preset.color,
        order: (index + 1) * BUILTIN_ORDER_STEP,
      });
    });
  }
}
