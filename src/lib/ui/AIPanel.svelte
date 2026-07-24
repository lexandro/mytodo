<script lang="ts">
  // AI run panel (336px right drawer, design §AIRunPanel). Bound to the
  // list/todo context it was opened from; phases: unlinked / missing /
  // history / run view / ready. Closing never stops a running run.
  import { closeAiPanel, openAiHistory } from "$lib/state/ai-actions";
  import { aiConfig } from "$lib/state/ai-config.svelte";
  import { aiRuns } from "$lib/state/ai-runs.svelte";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";
  import AIPanelReady from "./AIPanelReady.svelte";
  import AIRunHistoryList from "./AIRunHistoryList.svelte";
  import AIRunView from "./AIRunView.svelte";

  const panel = $derived(ui.aiPanel);
  const list = $derived(panel === null ? undefined : store.data.lists.find((l) => l.id === panel.listId));
  const link = $derived(panel === null ? undefined : aiConfig.linkFor(panel.listId));
  const missing = $derived(panel !== null && aiConfig.isMissing(panel.listId));
  const boundRun = $derived(panel?.runId != null ? aiRuns.runById(panel.runId) : undefined);
  const crumb = $derived(list === undefined ? "" : list.name);

  function locate(): void {
    if (panel !== null) void aiConfig.pickAndLink(panel.listId);
  }

  function unlinkHere(): void {
    if (panel !== null) aiConfig.unlink(panel.listId);
  }
</script>

{#if panel !== null && list !== undefined && ui.view === "main"}
  <aside class="ai-panel">
    <header class="head">
      <span class="sparkle">✦</span>
      <span class="title">AI</span>
      <span class="crumb" title={crumb}>{crumb}</span>
      <div class="spacer"></div>
      <button
        class="icon-btn"
        title="Run history"
        onclick={() => openAiHistory(panel.listId)}
      >
        <svg width="12" height="12" viewBox="0 0 14 14">
          <circle cx="7" cy="7" r="5.6" fill="none" stroke="currentColor" stroke-width="1.2" />
          <path d="M7 4v3.2l2.2 1.3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </svg>
      </button>
      <button class="icon-btn" title="Close — Esc" onclick={closeAiPanel}>✕</button>
    </header>
    <div class="body">
      {#if link === undefined}
        <div class="cta">
          <p>Link a workspace to use AI.</p>
          <button class="btn btn-primary" onclick={locate}>Link Workspace…</button>
        </div>
      {:else if missing}
        <div class="missing">
          <p class="missing-title">⚠ Workspace not found</p>
          <p class="mono-path" title={link.path}>{link.path}</p>
          <div class="missing-actions">
            <button class="btn btn-secondary" onclick={locate}>Locate…</button>
            <button class="btn btn-ghost danger" onclick={unlinkHere}>Unlink</button>
          </div>
        </div>
      {:else if panel.history}
        <AIRunHistoryList runs={aiRuns.runsForList(panel.listId)} />
      {:else if boundRun !== undefined}
        <AIRunView run={boundRun} />
      {:else}
        <AIPanelReady {panel} />
      {/if}
    </div>
  </aside>
{/if}

<style>
  .ai-panel {
    width: 336px;
    flex: none;
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--color-divider);
    background: var(--color-surface);
    min-height: 0;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 9px 10px;
    border-bottom: 1px solid var(--color-divider);
    flex: none;
  }
  .sparkle {
    color: var(--color-accent);
    font-size: 12px;
  }
  .title {
    font-size: 12.5px;
    font-weight: 500;
  }
  .crumb {
    font-size: 10px;
    color: var(--color-neutral-600);
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .spacer {
    flex: 1;
  }
  .icon-btn {
    border: none;
    background: transparent;
    color: var(--color-neutral-500);
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 5px;
    font-size: 12px;
  }
  .icon-btn:hover {
    background: color-mix(in srgb, var(--color-text) 8%, transparent);
    color: inherit;
  }
  .body {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .cta {
    margin: auto;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    font-size: 12px;
    color: var(--color-neutral-400);
  }
  .missing {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .missing-title {
    font-size: 12px;
    color: #e0a36c;
  }
  .mono-path {
    font-family: var(--font-mono, "Cascadia Mono", Consolas, monospace);
    font-size: 10.5px;
    color: var(--color-neutral-400);
    word-break: break-all;
  }
  .missing-actions {
    display: flex;
    gap: 8px;
  }
  .danger {
    color: #e07b7b;
  }
</style>
