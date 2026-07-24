// Decision logic for the portable shortcut offer (v1.1). Pure: the Rust
// side reports what exists; this decides what (if anything) to offer.
// Installed copies already have a shortcut, so they naturally stay quiet.

export interface LnkState {
  exists: boolean;
  target: string | null;
  targetExists: boolean;
  pointsHere: boolean;
}

export interface ShortcutStatus {
  desktop: LnkState;
  startMenu: LnkState;
  exePath: string;
}

export type ShortcutOffer =
  | { kind: "create"; desktop: boolean; startMenu: boolean }
  | { kind: "repair"; desktop: boolean; startMenu: boolean }
  | null;

/**
 * - no shortcut anywhere → offer to create (both places preselected)
 * - a shortcut exists but its target is gone (the portable folder moved)
 *   → offer to repair the stale ones
 * - any healthy shortcut (here or another live install) → stay quiet
 */
export function decideShortcutOffer(status: ShortcutStatus, dontAsk: boolean): ShortcutOffer {
  if (dontAsk) return null;
  const spots = [status.desktop, status.startMenu];
  const anyHealthy = spots.some((s) => s.exists && s.targetExists);
  if (anyHealthy) return null;
  const stale = spots.map((s) => s.exists && !s.targetExists);
  if (stale.some(Boolean)) {
    return { kind: "repair", desktop: stale[0], startMenu: stale[1] };
  }
  return { kind: "create", desktop: true, startMenu: true };
}
