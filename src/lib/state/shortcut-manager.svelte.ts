// Centralized global-shortcut manager (shortcut.md §15–16): single source
// of truth, transactional rebind with rollback, startup registration that
// never blocks the app. No component registers shortcuts on its own.

import {
  defaultShortcutConfig, toTauriAccelerator, validateAccelerator,
  conflictingAction, ACTION_LABELS,
  type GlobalAction, type ShortcutBinding, type ShortcutConfig, type SummonBehavior,
} from "$lib/core/shortcuts";
import {
  registerGlobalShortcut, settingsSet, showQuickAddWindow, summonWorkspace,
  unregisterGlobalShortcut,
} from "$lib/ipc";
import { ui } from "./ui.svelte";

const SETTINGS_KEY = "globalShortcuts";

function isShortcutConfig(value: unknown): value is ShortcutConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.bindings === "object" && v.bindings !== null && typeof v.summonBehavior === "string";
}

async function runAction(action: GlobalAction): Promise<void> {
  try {
    switch (action) {
      case "summon":
        await summonWorkspace(shortcutManager.config.summonBehavior === "toggle");
        break;
      case "quickAdd":
        await showQuickAddWindow();
        break;
      case "pinned":
        await summonWorkspace(false);
        ui.view = "pinned";
        break;
      case "search":
        await summonWorkspace(false);
        ui.globalSearch = { query: "", index: 0 };
        break;
    }
  } catch (e) {
    ui.showToast(`Shortcut action failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

class ShortcutManager {
  config = $state<ShortcutConfig>(defaultShortcutConfig());
  /** Actions whose startup registration failed (conflict with another app). */
  failures = $state<GlobalAction[]>([]);
  private registered = new Set<string>();
  private suspended = false;

  /**
   * While the Settings recorder is armed, live shortcuts must not fire —
   * a registered OS hotkey would both trigger its action (e.g. hide the
   * window mid-recording) AND swallow the keypress before the recorder
   * sees it. Config stays intact; only the OS registrations pause.
   */
  async suspendRegistrations(): Promise<void> {
    if (this.suspended) return;
    this.suspended = true;
    for (const accelerator of [...this.registered]) {
      await this.tryUnregister(accelerator);
    }
  }

  async resumeRegistrations(): Promise<void> {
    if (!this.suspended) return;
    this.suspended = false;
    for (const [action, binding] of Object.entries(this.config.bindings) as [GlobalAction, ShortcutBinding][]) {
      if (binding.enabled && binding.accelerator !== null && !this.registered.has(binding.accelerator)) {
        await this.tryRegister(action, binding.accelerator);
      }
    }
  }

  /** Startup (§16): load config, register enabled shortcuts, collect failures. */
  async init(persisted: unknown): Promise<void> {
    if (isShortcutConfig(persisted)) {
      this.config = { ...defaultShortcutConfig(), ...persisted, bindings: { ...defaultShortcutConfig().bindings, ...persisted.bindings } };
    }
    const failures: GlobalAction[] = [];
    for (const [action, binding] of Object.entries(this.config.bindings) as [GlobalAction, { accelerator: string | null; enabled: boolean }][]) {
      if (!binding.enabled || binding.accelerator === null) continue;
      const ok = await this.tryRegister(action, binding.accelerator);
      if (!ok) failures.push(action);
    }
    this.failures = failures;
    if (failures.length > 0) {
      ui.showToast("Some global shortcuts could not be registered — see Settings.");
    }
  }

  private async tryRegister(action: GlobalAction, accelerator: string): Promise<boolean> {
    try {
      await registerGlobalShortcut(toTauriAccelerator(accelerator), () => void runAction(action));
      this.registered.add(accelerator);
      return true;
    } catch {
      return false;
    }
  }

  private async tryUnregister(accelerator: string): Promise<void> {
    if (!this.registered.has(accelerator)) return;
    try {
      await unregisterGlobalShortcut(toTauriAccelerator(accelerator));
    } catch {
      // best effort — the accelerator may already be gone
    }
    this.registered.delete(accelerator);
  }

  /**
   * Transactional rebind (§12): the new accelerator must register
   * successfully BEFORE the old one is released; on failure the old binding
   * keeps working. Returns an error message or null.
   */
  async rebind(action: GlobalAction, accelerator: string): Promise<string | null> {
    const validation = validateAccelerator(accelerator);
    if (!validation.ok) return validation.error;
    const conflict = conflictingAction(this.config, action, accelerator);
    if (conflict !== null) return `Already used by ${ACTION_LABELS[conflict]}.`;

    const old = this.config.bindings[action];
    const registered = await this.tryRegister(action, accelerator);
    if (!registered) {
      return `${accelerator} could not be registered. It may already be used by Windows or another application.`;
    }
    if (old.accelerator !== null && old.accelerator !== accelerator) {
      await this.tryUnregister(old.accelerator);
    }
    this.config.bindings[action] = { accelerator, enabled: true };
    this.failures = this.failures.filter((f) => f !== action);
    await this.persist();
    return null;
  }

  async setEnabled(action: GlobalAction, enabled: boolean): Promise<string | null> {
    const binding = this.config.bindings[action];
    if (enabled) {
      if (binding.accelerator === null) return "Assign a shortcut first.";
      const ok = await this.tryRegister(action, binding.accelerator);
      if (!ok) return `${binding.accelerator} could not be registered.`;
    } else if (binding.accelerator !== null) {
      await this.tryUnregister(binding.accelerator);
    }
    this.config.bindings[action] = { ...binding, enabled };
    await this.persist();
    return null;
  }

  async setSummonBehavior(behavior: SummonBehavior): Promise<void> {
    this.config.summonBehavior = behavior;
    await this.persist();
  }

  async resetDefaults(): Promise<void> {
    for (const binding of Object.values(this.config.bindings)) {
      if (binding.accelerator !== null) await this.tryUnregister(binding.accelerator);
    }
    this.config = defaultShortcutConfig();
    for (const [action, binding] of Object.entries(this.config.bindings) as [GlobalAction, { accelerator: string | null; enabled: boolean }][]) {
      if (binding.enabled && binding.accelerator !== null) {
        await this.tryRegister(action, binding.accelerator);
      }
    }
    await this.persist();
  }

  private async persist(): Promise<void> {
    try {
      await settingsSet(SETTINGS_KEY, $state.snapshot(this.config));
    } catch {
      ui.showToast("Could not save shortcut settings");
    }
  }
}

export const shortcutManager = new ShortcutManager();
export const SHORTCUT_SETTINGS_KEY = SETTINGS_KEY;
