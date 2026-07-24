// Startup shortcut offer (v1.1): asks the Rust side what exists, the pure
// core decides, this store drives the dialog. "Don't ask again" persists in
// settings. Dev builds never prompt.

import { decideShortcutOffer, type ShortcutOffer } from "$lib/core/shortcut-offer";
import { appShortcutStatus, createAppShortcuts, settingsSet } from "$lib/ipc";
import { ui } from "./ui.svelte";

const SETTINGS_KEY = "shortcutOffer";

interface OfferSettings {
  dontAsk: boolean;
}

function isOfferSettings(value: unknown): value is OfferSettings {
  return typeof value === "object" && value !== null
    && typeof (value as Record<string, unknown>).dontAsk === "boolean";
}

class ShortcutOfferStore {
  offer = $state<ShortcutOffer>(null);
  desktopChecked = $state(true);
  startMenuChecked = $state(true);

  /** Called once at startup with the persisted settings map. */
  async init(persisted: unknown): Promise<void> {
    if (import.meta.env.DEV) return; // never nag during development
    const dontAsk = isOfferSettings(persisted) ? persisted.dontAsk : false;
    if (dontAsk) return;
    try {
      const status = await appShortcutStatus();
      this.offer = decideShortcutOffer(status, dontAsk);
      if (this.offer !== null) {
        this.desktopChecked = this.offer.desktop;
        this.startMenuChecked = this.offer.startMenu;
      }
    } catch {
      // detection is best-effort; never block startup over it
    }
  }

  async accept(): Promise<void> {
    const desktop = this.desktopChecked;
    const startMenu = this.startMenuChecked;
    this.offer = null;
    if (!desktop && !startMenu) return;
    try {
      await createAppShortcuts(desktop, startMenu);
      ui.showToast("Shortcut created");
    } catch (e) {
      ui.showToast(`Shortcut creation failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  notNow(): void {
    this.offer = null;
  }

  async dontAskAgain(): Promise<void> {
    this.offer = null;
    try {
      await settingsSet(SETTINGS_KEY, { dontAsk: true } satisfies OfferSettings);
    } catch {
      // non-fatal
    }
  }
}

export const shortcutOffer = new ShortcutOfferStore();
export const SHORTCUT_OFFER_KEY = SETTINGS_KEY;
