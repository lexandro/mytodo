// Global shortcut configuration (shortcut.md §10–14): pure config model,
// accelerator validation, conflict detection. Registration side effects
// live in state/shortcut-manager; Win32 stays behind ipc.ts.

export type GlobalAction = "summon" | "quickAdd" | "pinned" | "search";
export type SummonBehavior = "toggle" | "always";

export interface ShortcutBinding {
  accelerator: string | null;
  enabled: boolean;
}

export interface ShortcutConfig {
  bindings: Record<GlobalAction, ShortcutBinding>;
  summonBehavior: SummonBehavior;
}

export const ACTION_LABELS: Record<GlobalAction, string> = {
  summon: "Summon Workspace",
  quickAdd: "Global Quick Add",
  pinned: "Pinned Todos",
  search: "Global Search",
};

export function defaultShortcutConfig(): ShortcutConfig {
  return {
    bindings: {
      summon: { accelerator: "Ctrl+Alt+T", enabled: true },
      quickAdd: { accelerator: "Ctrl+Shift+Space", enabled: true },
      pinned: { accelerator: null, enabled: false },
      search: { accelerator: null, enabled: false },
    },
    summonBehavior: "toggle",
  };
}

const MODIFIERS = new Set(["Ctrl", "Alt", "Shift", "Super"]);
/** Reserved/dangerous system combinations — never try to grab these (§14). */
const BLACKLIST = new Set([
  "Ctrl+Alt+Delete",
  "Alt+Tab",
  "Alt+F4",
  "Super+L",
  "Super+D",
]);

export interface ValidationResult {
  ok: boolean;
  error: string | null;
  /** Non-blocking caution, e.g. AltGr collision on Hungarian layouts. */
  warning: string | null;
}

export function validateAccelerator(accelerator: string): ValidationResult {
  const parts = accelerator.split("+").map((p) => p.trim()).filter((p) => p !== "");
  if (parts.length === 0) return { ok: false, error: "Empty shortcut.", warning: null };
  const mods = parts.filter((p) => MODIFIERS.has(p));
  const keys = parts.filter((p) => !MODIFIERS.has(p));
  if (keys.length !== 1) {
    return { ok: false, error: "A shortcut needs exactly one non-modifier key.", warning: null };
  }
  if (!mods.some((m) => m === "Ctrl" || m === "Alt" || m === "Super")) {
    return {
      ok: false,
      error: "A global shortcut needs Ctrl, Alt or Win — plain keys would block normal typing.",
      warning: null,
    };
  }
  if (BLACKLIST.has(parts.join("+"))) {
    return { ok: false, error: "This combination is reserved by Windows.", warning: null };
  }
  // Ctrl+Alt == AltGr on Hungarian/European layouts: grabbing it can block
  // typing characters like [ ] { } system-wide
  const warning =
    mods.includes("Ctrl") && mods.includes("Alt")
      ? "Ctrl+Alt equals AltGr on Hungarian layouts — this may block typing special characters in other apps."
      : null;
  return { ok: true, error: null, warning };
}

/** Another action already using this accelerator (§13)? */
export function conflictingAction(
  config: ShortcutConfig,
  action: GlobalAction,
  accelerator: string,
): GlobalAction | null {
  for (const [other, binding] of Object.entries(config.bindings) as [GlobalAction, ShortcutBinding][]) {
    if (other !== action && binding.accelerator === accelerator) return other;
  }
  return null;
}

/** Recorder: keyboard event → accelerator string; null while only modifiers are down. */
export function acceleratorFromEvent(e: {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  code: string;
}): string | null {
  if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Super");
  let key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (e.code === "Space") key = "Space";
  parts.push(key);
  return parts.join("+");
}

/** Display format ("Ctrl+Alt+T") → Tauri accelerator ("Control+Alt+T"). */
export function toTauriAccelerator(accelerator: string): string {
  return accelerator
    .split("+")
    .map((p) => (p === "Ctrl" ? "Control" : p))
    .join("+");
}
