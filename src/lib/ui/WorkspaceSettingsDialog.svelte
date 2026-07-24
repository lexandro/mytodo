<script lang="ts">
  // Workspace settings dialog (design COMPONENTS.md §WorkspaceSettings,
  // 440px). Linked: directory + Change…, type/AI meta, missing state with
  // Locate…, AI Brief, preferred client, Unlink. Unlinked: explanation +
  // Link Workspace… (native directory picker).
  import { PROVIDER_IDS, PROVIDER_LABELS, type AIProviderId } from "$lib/core/ai-types";
  import { WORKSPACE_TYPE_LABELS } from "$lib/core/ai-workspace";
  import { aiConfig } from "$lib/state/ai-config.svelte";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";

  const listId = $derived(ui.workspaceSettings);
  const list = $derived(store.data.lists.find((l) => l.id === listId));
  const link = $derived(listId === null ? undefined : aiConfig.workspaces[listId]);
  const missing = $derived(listId !== null && aiConfig.isMissing(listId));

  function close(): void {
    ui.workspaceSettings = null;
  }

  function onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) close();
  }

  function onBriefChange(e: Event & { currentTarget: HTMLTextAreaElement }): void {
    if (listId !== null) aiConfig.setBrief(listId, e.currentTarget.value);
  }

  function onProviderChange(e: Event & { currentTarget: HTMLSelectElement }): void {
    if (listId === null) return;
    const value = e.currentTarget.value;
    aiConfig.setPreferredProvider(listId, value === "default" ? null : (value as AIProviderId));
  }

  function unlink(): void {
    if (listId !== null) aiConfig.unlink(listId);
    close();
  }

  /** Change… / Locate… / Link Workspace… all open the directory picker. */
  function pickDirectoryForList(): void {
    if (listId !== null) void aiConfig.pickAndLink(listId);
  }
</script>

{#if listId !== null && list !== undefined}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="dialog-backdrop" onclick={onBackdropClick}>
    <div class="dialog ws-dialog">
      <span class="dialog-title">Workspace — {list.name}</span>
      {#if link !== undefined}
        <div class="field">
          <span class="field-label">Directory</span>
          <div class="dir-row">
            <input class="input mono" readonly value={link.path} title={link.path} />
            <button class="btn btn-secondary" onclick={pickDirectoryForList}>
              Change…
            </button>
          </div>
          <span class="meta">
            {WORKSPACE_TYPE_LABELS[link.type]} · AI —
            {link.preferredProvider === null
              ? `${PROVIDER_LABELS[aiConfig.clients.defaultClient]} (default)`
              : PROVIDER_LABELS[link.preferredProvider]}
          </span>
          {#if missing}
            <div class="missing-row">
              <span>⚠ Directory not found</span>
              <button class="btn btn-secondary" onclick={pickDirectoryForList}>
                Locate…
              </button>
            </div>
          {/if}
        </div>
        <div class="field">
          <span class="field-label">AI Brief</span>
          <textarea
            class="input brief"
            placeholder="Optional plain-text context added to every AI run — build commands, conventions, no-go areas."
            value={link.brief}
            onchange={onBriefChange}
          ></textarea>
        </div>
        <div class="field">
          <span class="field-label">Preferred AI client</span>
          <select class="input" value={link.preferredProvider ?? "default"} onchange={onProviderChange}>
            <option value="default">Default ({PROVIDER_LABELS[aiConfig.clients.defaultClient]})</option>
            {#each PROVIDER_IDS as id (id)}
              <option value={id}>{PROVIDER_LABELS[id]}</option>
            {/each}
          </select>
        </div>
        <div class="footer">
          <button class="btn btn-ghost danger" onclick={unlink}>Unlink</button>
          <div class="spacer"></div>
          <button class="btn btn-primary" onclick={close}>Done</button>
        </div>
      {:else}
        <p class="explain">
          Link a directory (a Git repository or any folder) to this list so AI
          actions can work in it. The todo list itself works fine without one.
        </p>
        <div class="footer">
          <div class="spacer"></div>
          <button class="btn btn-secondary" onclick={close}>Cancel</button>
          <button class="btn btn-primary" onclick={pickDirectoryForList}>
            Link Workspace…
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .ws-dialog {
    width: min(440px, 100%);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .field-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--color-neutral-500);
  }
  .dir-row {
    display: flex;
    gap: 8px;
  }
  .mono {
    font-family: var(--font-mono, "Cascadia Mono", Consolas, monospace);
    font-size: 11.5px;
    flex: 1;
    min-width: 0;
  }
  .meta {
    font-size: 10.5px;
    color: var(--color-neutral-500);
  }
  .missing-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 9px;
    border: 1px solid color-mix(in srgb, #e0a36c 45%, transparent);
    border-radius: 7px;
    color: #e0a36c;
    font-size: 11.5px;
  }
  .brief {
    min-height: 72px;
    resize: vertical;
    font-size: 12px;
    line-height: 1.45;
  }
  .explain {
    font-size: 12px;
    color: var(--color-neutral-400);
    line-height: 1.5;
  }
  .footer {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }
  .spacer {
    flex: 1;
  }
  .danger {
    color: #e07b7b;
  }
</style>
