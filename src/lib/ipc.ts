// THE TAURI BOUNDARY: only this module may import @tauri-apps/* packages.
// Everything else stays pure .ts/.svelte so logic is testable under Node
// and every native capability is auditable in one place.
import { invoke } from "@tauri-apps/api/core";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import type { ProbeOutcome, TestOutcome } from "$lib/core/ai-providers";
import type { AIRunRow } from "$lib/core/ai-runs";
import type { AIProviderId } from "$lib/core/ai-types";
import type { WorkspaceStatus } from "$lib/core/ai-workspace";
import type { DbOp } from "$lib/core/dbops";
import type { ShortcutStatus } from "$lib/core/shortcut-offer";
import type { DomainData } from "$lib/core/types";

// ── database ────────────────────────────────────────────────────────────────

export function dbLoadAll(): Promise<DomainData> {
  return invoke<DomainData>("db_load_all");
}

export function dbApply(ops: DbOp[]): Promise<void> {
  return invoke<void>("db_apply", { ops });
}

export function settingsAll(): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("settings_all");
}

export function settingsSet(key: string, value: unknown): Promise<void> {
  return invoke<void>("settings_set", { key, value });
}

// ── AI run history (AI Workspace Integration V1) ────────────────────────────

export function aiRunsLoad(): Promise<AIRunRow[]> {
  return invoke<AIRunRow[]>("ai_runs_load");
}

/** Upsert one run row; the backend prunes old terminal runs per list. */
export function aiRunPut(run: AIRunRow): Promise<void> {
  return invoke<void>("ai_run_put", { run });
}

// ── linked workspaces (AI Workspace Integration V1) ─────────────────────────

/** Native directory picker; null = cancelled. */
export async function pickDirectory(): Promise<string | null> {
  const result = await open({ directory: true, multiple: false });
  return typeof result === "string" ? result : null;
}

/** Existence / readability / Git probe for a workspace path. */
export function workspaceCheck(path: string): Promise<WorkspaceStatus> {
  return invoke<WorkspaceStatus>("workspace_check", { path });
}

// ── AI providers (detection / validation / test) ────────────────────────────

/** PATH-based auto detection; null = not found. */
export function aiDetectProvider(provider: AIProviderId): Promise<string | null> {
  return invoke<string | null>("ai_detect_provider", { provider });
}

/** Validates an executable: exists → type → starts → identity → version. */
export function aiProbeProvider(provider: AIProviderId, path: string): Promise<ProbeOutcome> {
  return invoke<ProbeOutcome>("ai_probe_provider", { provider, path });
}

/** Probe + best-effort authentication readiness (never modifies anything). */
export function aiTestProvider(provider: AIProviderId, path: string): Promise<TestOutcome> {
  return invoke<TestOutcome>("ai_test_provider", { provider, path });
}

// ── backup / restore ────────────────────────────────────────────────────────

export function backupNow(): Promise<string> {
  return invoke<string>("backup_now");
}

export function listBackups(): Promise<string[]> {
  return invoke<string[]>("list_backups");
}

export function restoreBackup(fileName: string): Promise<void> {
  return invoke<void>("restore_backup", { fileName });
}

// ── dialogs (JSON import/export flows) ──────────────────────────────────────

export async function pickFile(filters?: { name: string; extensions: string[] }[]): Promise<string | null> {
  const result = await open({ multiple: false, filters });
  return typeof result === "string" ? result : null;
}

export async function pickSavePath(defaultPath?: string): Promise<string | null> {
  return save({ defaultPath });
}

export function readFile(path: string): Promise<string> {
  return readTextFile(path);
}

export function writeFile(path: string, content: string): Promise<void> {
  return writeTextFile(path, content);
}

// ── links (auto-detected in descriptions) ───────────────────────────────────

/** Opens a web URL in the default browser. */
export function openWebUrl(url: string): Promise<void> {
  return openUrl(url);
}

/** Opens a file/directory with its associated app / Explorer. */
export function openFsPath(path: string): Promise<void> {
  return openPath(path);
}

// ── window controls (custom title bar) ──────────────────────────────────────

export function windowMinimize(): Promise<void> {
  return getCurrentWindow().minimize();
}

export function windowToggleMaximize(): Promise<void> {
  return getCurrentWindow().toggleMaximize();
}

export function windowClose(): Promise<void> {
  return getCurrentWindow().close();
}

export function windowHide(): Promise<void> {
  return getCurrentWindow().hide();
}

// ── window state persistence (position / size / maximized) ──────────────────

export interface WindowStateSnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
}

export async function readWindowState(): Promise<WindowStateSnapshot> {
  const win = getCurrentWindow();
  const [pos, size, maximized] = await Promise.all([
    win.outerPosition(),
    win.outerSize(),
    win.isMaximized(),
  ]);
  return { x: pos.x, y: pos.y, width: size.width, height: size.height, maximized };
}

/** Monitor bounds in physical pixels — for the off-screen guard. */
export async function monitorBounds(): Promise<{ x: number; y: number; width: number; height: number }[]> {
  const { availableMonitors } = await import("@tauri-apps/api/window");
  const monitors = await availableMonitors();
  return monitors.map((m) => ({
    x: m.position.x,
    y: m.position.y,
    width: m.size.width,
    height: m.size.height,
  }));
}

export async function applyWindowState(state: WindowStateSnapshot): Promise<void> {
  const { PhysicalPosition, PhysicalSize } = await import("@tauri-apps/api/dpi");
  const win = getCurrentWindow();
  await win.setSize(new PhysicalSize(state.width, state.height));
  await win.setPosition(new PhysicalPosition(state.x, state.y));
  if (state.maximized) await win.maximize();
}

export function onWindowStateChange(handler: () => void): Promise<() => void> {
  const win = getCurrentWindow();
  const unlisteners = Promise.all([win.onMoved(handler), win.onResized(handler)]);
  return unlisteners.then((fns) => () => fns.forEach((fn) => fn()));
}

// ── global shortcuts (Tauri accelerator format, e.g. "Control+Alt+T") ───────

export function registerGlobalShortcut(accelerator: string, handler: () => void): Promise<void> {
  return register(accelerator, (event) => {
    if (event.state === "Pressed") handler();
  });
}

export function unregisterGlobalShortcut(accelerator: string): Promise<void> {
  return unregister(accelerator);
}

// ── Windows integration (Summon, Quick Add window) ──────────────────────────

export interface SummonResult {
  action: "summoned" | "hidden" | "focused";
  movedDesktop: boolean;
  foregroundGranted: boolean;
}

export function summonWorkspace(toggle: boolean): Promise<SummonResult> {
  return invoke<SummonResult>("summon_workspace", { toggle });
}

export function showQuickAddWindow(): Promise<void> {
  return invoke<void>("show_quick_add");
}

// ── desktop / start-menu shortcuts (portable offer, v1.1) ───────────────────

export function appShortcutStatus(): Promise<ShortcutStatus> {
  return invoke<ShortcutStatus>("app_shortcut_status");
}

export function createAppShortcuts(desktop: boolean, startMenu: boolean): Promise<void> {
  return invoke<void>("create_app_shortcuts", { desktop, startMenu });
}

// ── live update (GitHub Releases, signed) ───────────────────────────────────

export interface AvailableUpdate {
  version: string;
  /** Downloads + installs, then the caller relaunches. */
  install: () => Promise<void>;
}

/** null = already up to date. */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  const update: Update | null = await check();
  if (update === null) return null;
  return {
    version: update.version,
    install: () => update.downloadAndInstall(),
  };
}

export function relaunchApp(): Promise<void> {
  return relaunch();
}

// ── cross-window events (quickadd → main) ───────────────────────────────────

export interface QuickAddPayload {
  title: string;
  listId: string;
}

export function emitQuickAdd(payload: QuickAddPayload): Promise<void> {
  return emit("quickadd:add", payload);
}

export function onQuickAdd(handler: (payload: QuickAddPayload) => void): Promise<UnlistenFn> {
  return listen<QuickAddPayload>("quickadd:add", (e) => handler(e.payload));
}
