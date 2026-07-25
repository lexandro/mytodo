// Startup sequencing. Only what the FIRST FRAME needs runs eagerly (domain
// data, UI settings, window geometry); everything else waits for the browser
// to go idle, so opening the app is never slowed by work the user cannot see
// yet: OS hotkey registration, shortcut-offer probing, workspace existence
// checks and AI run history.
// Measured on the release build (2026-07-25): app_shortcut_status ~68 ms and
// each workspace_check ~68 ms used to run inside the first second.

import { aiConfig } from "./ai-config.svelte";
import { aiModels } from "./ai-models.svelte";
import { aiRuns } from "./ai-runs.svelte";
import { SHORTCUT_SETTINGS_KEY, shortcutManager } from "./shortcut-manager.svelte";
import { SHORTCUT_OFFER_KEY, shortcutOffer } from "./shortcut-offer.svelte";
import { updater } from "./updater.svelte";

/** Runs after the browser finishes the current work, with a hard backstop. */
export function runWhenIdle(fn: () => void): void {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => fn(), { timeout: 1500 });
    return;
  }
  setTimeout(fn, 200);
}

/**
 * Everything the first frame does not need. Each item is independent and
 * failure-tolerant: none of them can hold up the UI, and none of them are
 * awaited by the caller.
 */
export function startDeferredBoot(settings: Record<string, unknown>): void {
  runWhenIdle(() => {
    // global hotkeys: a few hundred ms later is imperceptible, and a failing
    // registration must never delay the window (shortcut.md §16)
    void shortcutManager.init(settings[SHORTCUT_SETTINGS_KEY]);
    // .lnk resolution touches the shell — the slowest startup probe
    void shortcutOffer.init(settings[SHORTCUT_OFFER_KEY]);
    // linked directories: the WS badge shows immediately from settings, the
    // amber "missing" state only needs to be right shortly after
    void aiConfig.refreshAllMissing();
    // run history feeds the AI panel, which cannot be open yet
    void aiRuns.load();
    // both clients' model lists (a cache file read each), so the picker is
    // already filled by the time the user opens it
    aiModels.prefetchAll();
    updater.startAutoCheck();
  });
}
