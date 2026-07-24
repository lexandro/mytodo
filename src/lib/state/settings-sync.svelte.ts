// Layout/UI settings persistence: restores on startup, saves on change.
// Stored in the portable SQLite settings table (never the registry).

import { settingsAll, settingsSet } from "$lib/ipc";
import { store } from "./store.svelte";
import { ui, type LayoutName, type ViewName } from "./ui.svelte";

interface LayoutSettings {
  layout: LayoutName;
  paneLists: (string | null)[];
  activePane: number;
  view: ViewName;
}

const LAYOUTS: LayoutName[] = ["1", "2v", "2h", "4"];
const VIEWS: ViewName[] = ["main", "pinned", "trash"];

function isLayoutSettings(value: unknown): value is LayoutSettings {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    LAYOUTS.includes(v.layout as LayoutName) &&
    Array.isArray(v.paneLists) &&
    typeof v.activePane === "number" &&
    VIEWS.includes(v.view as ViewName)
  );
}

/**
 * Applies persisted layout state; unknown list ids fall back to null.
 * Returns the full settings map so other subsystems (shortcut manager)
 * can consume their keys without a second query.
 */
export async function restoreUiSettings(): Promise<Record<string, unknown>> {
  let all: Record<string, unknown>;
  try {
    all = await settingsAll();
  } catch {
    return {}; // DB error already surfaces via store.loadError
  }
  const raw = all["layout"];
  if (!isLayoutSettings(raw)) return all;
  ui.layout = raw.layout;
  raw.paneLists.slice(0, 4).forEach((listId, i) => {
    const exists = typeof listId === "string" && store.data.lists.some((l) => l.id === listId);
    ui.updatePane(i, { listId: exists ? (listId as string) : null });
  });
  ui.activePane = Math.max(0, Math.min(3, raw.activePane));
  ui.view = raw.view;
  return all;
}

/**
 * Effect body (registered from AppShell): persists layout state whenever it
 * changes. Writes are tiny single-row upserts.
 */
export function persistUiSettings(): void {
  const snapshot: LayoutSettings = {
    layout: ui.layout,
    paneLists: ui.panes.map((p) => p.listId),
    activePane: ui.activePane,
    view: ui.view,
  };
  void settingsSet("layout", snapshot).catch(() => {
    // non-fatal: layout persistence failure never blocks the UI
  });
}
