// Data actions: JSON export/import, manual backup, restore. Import is one
// undo-able apply; a failed parse never touches the store or the database.

import { exportJson, parseImport } from "$lib/core/transfer";
import type { DomainData } from "$lib/core/types";
import {
  backupNow, dbLoadAll, pickFile, pickSavePath, readFile, restoreBackup, writeFile,
} from "$lib/ipc";
import { store } from "./store.svelte";
import { ui } from "./ui.svelte";

function toast(msg: string): void {
  ui.showToast(msg);
}

export async function exportJsonAction(): Promise<void> {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const path = await pickSavePath(`mytodo-export-${date}.json`);
    if (path === null) return;
    const snapshot = $state.snapshot(store.data) as DomainData;
    await writeFile(path, exportJson(snapshot, Date.now()));
    toast("Exported");
  } catch (e) {
    toast(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function importJsonAction(): Promise<void> {
  try {
    const path = await pickFile([{ name: "myTODO export", extensions: ["json"] }]);
    if (path === null) return;
    const json = await readFile(path);
    const result = parseImport(json);
    if (!result.ok) {
      toast(`Import rejected: ${result.error}`);
      return;
    }
    store.apply("import", (data) => {
      data.lists = result.data.lists;
      data.groups = result.data.groups;
      data.todos = result.data.todos;
      data.subtasks = result.data.subtasks;
      data.activity = result.data.activity;
      data.colorLabels = result.data.colorLabels;
    });
    ui.selectedId = null;
    ui.detailOpen = false;
    const inbox = store.data.lists.find((l) => l.fixed);
    ui.panes.forEach((pane, i) => {
      if (pane.listId !== null && !store.data.lists.some((l) => l.id === pane.listId)) {
        ui.updatePane(i, { listId: inbox?.id ?? null });
      }
    });
    ui.showToast("Imported", true);
  } catch (e) {
    toast(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function backupNowAction(): Promise<void> {
  try {
    const name = await backupNow();
    toast(`Backup saved — ${name}`);
  } catch (e) {
    toast(`Backup failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Restore replaces the live DB, then the in-memory state reloads from it. */
export async function restoreBackupAction(fileName: string): Promise<void> {
  try {
    await restoreBackup(fileName);
    const data = await dbLoadAll();
    store.replaceLoaded(data);
    ui.selectedId = null;
    ui.detailOpen = false;
    toast(`Restored from ${fileName}`);
  } catch (e) {
    toast(`Restore failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
