// A TAURI-HATÁR: kizárólag ez a modul importálhat @tauri-apps/* csomagot.
// Minden más kód tiszta .ts/.svelte marad — így a logika Node alatt tesztelhető,
// és egyetlen helyen auditálható, mi éri el a natív oldalt.
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

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
