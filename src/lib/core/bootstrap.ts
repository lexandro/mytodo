// First-run defaults. Runs through the normal apply() pipeline on every
// startup — a no-op when the data already exists.

import { newId } from "./ids";
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
