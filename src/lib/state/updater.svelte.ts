// Live update via GitHub Releases (mdedit pattern): a delayed first check +
// a periodic background check only OFFER the update — download/install is
// always user-initiated, then the app relaunches.

import { checkForUpdate, relaunchApp, type AvailableUpdate } from "$lib/ipc";
import { ui } from "./ui.svelte";

const SIX_HOURS = 6 * 60 * 60 * 1000;
const FIRST_CHECK_DELAY_MS = 5000;

type Status = "idle" | "checking" | "downloading" | "error";

class UpdaterStore {
  // kept outside $state so the Svelte proxy cannot wrap the plugin object
  #update: AvailableUpdate | null = null;
  availableVersion = $state<string | null>(null);
  status = $state<Status>("idle");
  dismissed = $state(false);

  /** `manual` gives toast feedback; background checks stay silent. */
  async check(manual = false): Promise<void> {
    if (this.status === "checking" || this.status === "downloading") return;
    this.status = "checking";
    try {
      const update = await checkForUpdate();
      this.#update = update;
      this.availableVersion = update?.version ?? null;
      if (update !== null) this.dismissed = false;
      this.status = "idle";
      if (manual && update === null) ui.showToast("myTODO is up to date");
    } catch (e) {
      this.status = "error";
      if (manual) {
        ui.showToast(`Update check failed: ${e instanceof Error ? e.message : String(e)}`);
      }
      setTimeout(() => {
        if (this.status === "error") this.status = "idle";
      }, 4000);
    }
  }

  /** Download + install the offered update, then relaunch. */
  async install(): Promise<void> {
    if (this.#update === null) return;
    this.status = "downloading";
    try {
      await this.#update.install();
      await relaunchApp();
    } catch (e) {
      this.status = "error";
      ui.showToast(`Update failed: ${e instanceof Error ? e.message : String(e)}`);
      setTimeout(() => {
        if (this.status === "error") this.status = "idle";
      }, 4000);
    }
  }

  dismiss(): void {
    this.dismissed = true;
  }

  startAutoCheck(): void {
    setTimeout(() => void this.check(false), FIRST_CHECK_DELAY_MS);
    setInterval(() => void this.check(false), SIX_HOURS);
  }
}

export const updater = new UpdaterStore();
