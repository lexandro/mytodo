<script lang="ts">
  // Linked-workspace chip in the quick-add row (design COMPONENTS.md
  // §WorkspaceLink): folder icon + basename + git mini-tag; ⚠ amber when
  // the directory is missing. Click opens Workspace Settings.
  import { PROVIDER_LABELS } from "$lib/core/ai-types";
  import { effectiveProvider } from "$lib/core/ai-config";
  import { WORKSPACE_TYPE_LABELS, workspaceBasename } from "$lib/core/ai-workspace";
  import { aiConfig } from "$lib/state/ai-config.svelte";
  import { ui } from "$lib/state/ui.svelte";

  let { listId }: { listId: string } = $props();

  const link = $derived(aiConfig.workspaces[listId]);
  const missing = $derived(aiConfig.isMissing(listId));
  const tooltip = $derived(
    link === undefined
      ? ""
      : `${link.path} · ${WORKSPACE_TYPE_LABELS[link.type]} · AI — ${
          PROVIDER_LABELS[effectiveProvider(link, aiConfig.clients)]
        }`,
  );

  function openSettings(): void {
    ui.workspaceSettings = listId;
    void aiConfig.refreshMissing(listId);
  }
</script>

{#if link !== undefined}
  <button class="ws-chip" class:missing title={tooltip} onclick={openSettings}>
    {#if missing}
      <span class="warn">⚠</span>
    {:else}
      <svg width="11" height="11" viewBox="0 0 14 14" aria-hidden="true">
        <path
          d="M1.5 3.5a1 1 0 0 1 1-1h3l1.2 1.5h4.8a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
        />
      </svg>
    {/if}
    <span class="name">{workspaceBasename(link.path)}</span>
    {#if link.type === "git" && !missing}
      <span class="mini-tag">git</span>
    {/if}
  </button>
{/if}

<style>
  .ws-chip {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 30px;
    max-width: 170px;
    padding: 0 9px;
    flex: none;
    border: 1px solid var(--color-divider);
    border-radius: 7px;
    background: transparent;
    color: var(--color-neutral-400);
    font-size: 10.5px;
    cursor: pointer;
  }
  .ws-chip:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
  .ws-chip.missing {
    color: #e0a36c;
    border-color: color-mix(in srgb, #e0a36c 45%, transparent);
  }
  .warn {
    font-size: 11px;
    line-height: 1;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mini-tag {
    font-size: 8.5px;
    padding: 1px 4px;
    border: 1px solid var(--color-divider);
    border-radius: 4px;
    color: var(--color-neutral-500);
    flex: none;
  }
</style>
