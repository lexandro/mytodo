// Linked workspaces + AI client configuration state. Persisted in the
// portable settings table (keys `workspaces` / `aiClients` — decision #17);
// the `missing` map is runtime-only and refreshed by explicit checks, never
// on routine UI actions (aiprompt §40).

import {
  AI_CLIENTS_KEY, WORKSPACES_KEY, defaultAiClients, normalizeAiClients,
  normalizeWorkspaceLinks, type AIClientsSettings, type WorkspaceLinks,
} from "$lib/core/ai-config";
import type { AIProviderId, WorkspaceLink } from "$lib/core/ai-types";
import {
  isUsableWorkspace, newWorkspaceLink, relocatedWorkspaceLink,
} from "$lib/core/ai-workspace";
import { pickDirectory, settingsSet, workspaceCheck } from "$lib/ipc";
import { ui } from "./ui.svelte";

class AiConfigState {
  workspaces = $state<WorkspaceLinks>({});
  clients = $state<AIClientsSettings>(defaultAiClients());
  /** listId → linked directory is currently missing/unreadable. */
  missing = $state<Record<string, boolean>>({});

  /** Startup: normalize persisted values; links to deleted lists are dropped. */
  restore(all: Record<string, unknown>, validListIds: readonly string[]): void {
    const links = normalizeWorkspaceLinks(all[WORKSPACES_KEY]);
    const valid = new Set(validListIds);
    this.workspaces = Object.fromEntries(Object.entries(links).filter(([id]) => valid.has(id)));
    this.clients = normalizeAiClients(all[AI_CLIENTS_KEY]);
    void this.refreshAllMissing();
  }

  linkFor(listId: string | null): WorkspaceLink | undefined {
    return listId === null ? undefined : this.workspaces[listId];
  }

  isMissing(listId: string): boolean {
    return this.missing[listId] === true;
  }

  /**
   * Directory picker → validation → link (or relocate when already linked;
   * brief + preferred provider survive). No-op when the picker is cancelled.
   */
  async pickAndLink(listId: string): Promise<void> {
    try {
      const path = await pickDirectory();
      if (path === null) return;
      const status = await workspaceCheck(path);
      if (!isUsableWorkspace(status)) {
        ui.showToast("That directory cannot be read — workspace not linked.");
        return;
      }
      const prev = this.workspaces[listId];
      this.workspaces = {
        ...this.workspaces,
        [listId]: prev === undefined
          ? newWorkspaceLink(path, status)
          : relocatedWorkspaceLink(prev, path, status),
      };
      this.missing = { ...this.missing, [listId]: false };
      this.persistWorkspaces();
      ui.showToast(prev === undefined ? "Workspace linked" : "Workspace directory updated");
    } catch (e) {
      ui.showToast(`Workspace linking failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  unlink(listId: string): void {
    if (this.removeForList(listId)) ui.showToast("Workspace unlinked");
  }

  /** Silent cleanup (list deletion). Returns whether a link existed. */
  removeForList(listId: string): boolean {
    if (this.workspaces[listId] === undefined) return false;
    const { [listId]: _removed, ...rest } = this.workspaces;
    this.workspaces = rest;
    const { [listId]: _flag, ...restMissing } = this.missing;
    this.missing = restMissing;
    this.persistWorkspaces();
    return true;
  }

  setBrief(listId: string, brief: string): void {
    this.updateLink(listId, (link) => ({ ...link, brief }));
  }

  setPreferredProvider(listId: string, provider: AIProviderId | null): void {
    this.updateLink(listId, (link) => ({ ...link, preferredProvider: provider }));
  }

  setDefaultClient(provider: AIProviderId): void {
    this.clients = { ...this.clients, defaultClient: provider };
    this.persistClients();
  }

  /** Re-probe one linked directory (workspace settings / AI entry points). */
  async refreshMissing(listId: string): Promise<void> {
    const link = this.workspaces[listId];
    if (link === undefined) return;
    try {
      const status = await workspaceCheck(link.path);
      this.missing = { ...this.missing, [listId]: !isUsableWorkspace(status) };
    } catch {
      // IPC failure ≠ missing directory — keep the last known state; the
      // run-start guard re-checks and surfaces its own error
    }
  }

  async refreshAllMissing(): Promise<void> {
    await Promise.all(Object.keys(this.workspaces).map((id) => this.refreshMissing(id)));
  }

  private updateLink(listId: string, patch: (link: WorkspaceLink) => WorkspaceLink): void {
    const link = this.workspaces[listId];
    if (link === undefined) return;
    this.workspaces = { ...this.workspaces, [listId]: patch(link) };
    this.persistWorkspaces();
  }

  private persistWorkspaces(): void {
    void settingsSet(WORKSPACES_KEY, this.workspaces).catch(() => {
      ui.showToast("Could not save workspace settings — check the data folder.");
    });
  }

  persistClients(): void {
    void settingsSet(AI_CLIENTS_KEY, this.clients).catch(() => {
      ui.showToast("Could not save AI client settings — check the data folder.");
    });
  }
}

export const aiConfig = new AiConfigState();
