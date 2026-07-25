// First-run defaults. Runs through the normal apply() pipeline on every
// startup — a no-op when the data already exists.

import { newId } from "./ids";
import { BUILTIN_ORDER_STEP, DEFAULT_LABELS } from "./labels";
import { ORDER_STEP } from "./ordering";
import type { DomainData } from "./types";

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
    order: ORDER_STEP,
  });
}

/**
 * Seeds the 8 built-in colors as real palette rows. Existing installs get them
 * on the next launch; a renamed or recolored built-in is left alone, and a
 * missing one is restored (a todo may still point at it).
 */
export function ensurePresetLabels(data: DomainData): void {
  DEFAULT_LABELS.forEach((preset, index) => {
    if (data.colorLabels.some((label) => label.id === preset.id)) return;
    data.colorLabels.push({
      id: preset.id,
      name: preset.name,
      color: preset.color,
      order: (index + 1) * BUILTIN_ORDER_STEP,
    });
  });
}
