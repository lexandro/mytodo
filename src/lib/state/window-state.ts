// Window position/size/maximized persistence (daprompt §33). The saved
// rect is only applied when it still intersects a live monitor — after a
// monitor disconnect the window must never open off-screen.

import {
  applyWindowState, monitorBounds, onWindowStateChange, readWindowState,
  settingsSet, type WindowStateSnapshot,
} from "$lib/ipc";

const SETTINGS_KEY = "windowState";
const SAVE_DEBOUNCE_MS = 500;

function isSnapshot(value: unknown): value is WindowStateSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.x === "number" &&
    typeof v.y === "number" &&
    typeof v.width === "number" &&
    typeof v.height === "number" &&
    typeof v.maximized === "boolean"
  );
}

/** At least a 100×100 corner of the window must be visible on some monitor. */
function intersectsAnyMonitor(
  state: WindowStateSnapshot,
  monitors: { x: number; y: number; width: number; height: number }[],
): boolean {
  const MIN_VISIBLE = 100;
  return monitors.some((m) => {
    const overlapX = Math.min(state.x + state.width, m.x + m.width) - Math.max(state.x, m.x);
    const overlapY = Math.min(state.y + state.height, m.y + m.height) - Math.max(state.y, m.y);
    return overlapX >= MIN_VISIBLE && overlapY >= MIN_VISIBLE;
  });
}

export async function restoreWindowState(persisted: unknown): Promise<void> {
  if (!isSnapshot(persisted)) return;
  try {
    const monitors = await monitorBounds();
    if (!intersectsAnyMonitor(persisted, monitors)) return; // stay at defaults
    await applyWindowState(persisted);
  } catch {
    // window state is cosmetic — never block startup on it
  }
}

/** Starts debounced saving on move/resize; returns a stop function. */
export async function startWindowStateSaving(): Promise<() => void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = (): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      void readWindowState()
        .then((state) => settingsSet(SETTINGS_KEY, state))
        .catch(() => {
          // non-fatal
        });
    }, SAVE_DEBOUNCE_MS);
  };
  const stop = await onWindowStateChange(save);
  return () => {
    clearTimeout(timer);
    stop();
  };
}

export const WINDOW_STATE_KEY = SETTINGS_KEY;
