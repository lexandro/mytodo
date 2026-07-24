// THE TAURI BOUNDARY: only this module may import @tauri-apps/* packages.
// Everything else stays pure .ts/.svelte so logic is testable under Node
// and every native capability is auditable in one place.
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { DbOp } from "$lib/core/dbops";
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
