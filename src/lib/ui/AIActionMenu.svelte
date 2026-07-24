<script lang="ts">
  // ✦ AI title-bar button + dropdown (design §AIActionMenu, 276px): TODO
  // and WORKSPACE sections with two-line items, Run history + AI Clients
  // footer; Link Workspace CTA when the list is unlinked.
  import {
    ACTION_DESCRIPTIONS, ACTION_LABELS, ACTION_MODES, TODO_ACTIONS,
    WORKSPACE_ACTIONS, type AIAction,
  } from "$lib/core/ai-types";
  import { findTodo } from "$lib/core/todos-ops";
  import { openAiHistory, openAiPanel } from "$lib/state/ai-actions";
  import { aiClients } from "$lib/state/ai-clients.svelte";
  import { aiConfig } from "$lib/state/ai-config.svelte";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";

  const listId = $derived(ui.activePaneState.listId);
  const list = $derived(store.data.lists.find((l) => l.id === listId));
  const linked = $derived(aiConfig.linkFor(listId) !== undefined);
  const selected = $derived(ui.selectedId !== null ? findTodo(store.data, ui.selectedId) : undefined);
  const todoUsable = $derived(
    selected !== undefined && !selected.trashed && selected.listId === listId,
  );

  function toggle(): void {
    ui.aiMenuOpen = !ui.aiMenuOpen;
    if (ui.aiMenuOpen) ui.menuOpen = null;
  }

  function pick(action: AIAction, todoScope: boolean): void {
    if (listId === null) return;
    openAiPanel(listId, todoScope && selected !== undefined ? selected.id : null, action);
  }

  function hint(action: AIAction): string {
    return ACTION_MODES[action] === "execute" ? "may modify files" : "read only";
  }
</script>

<div class="ai-menu-anchor">
  <button class="ai-btn" class:open={ui.aiMenuOpen} title="AI actions" onclick={toggle}>
    <span class="sparkle">✦</span>
    <span>AI</span>
  </button>
  {#if ui.aiMenuOpen && list !== undefined}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="backdrop" onmousedown={() => (ui.aiMenuOpen = false)}></div>
    <div class="menu">
      {#if !linked}
        <p class="cta-text">Link a workspace to use AI with "{list.name}".</p>
        <button
          class="btn btn-primary cta-btn"
          onclick={() => {
            ui.aiMenuOpen = false;
            ui.workspaceSettings = list.id;
          }}
        >
          Link Workspace…
        </button>
      {:else}
        {#if todoUsable && selected !== undefined}
          <p class="section">TODO — {selected.title}</p>
          {#each TODO_ACTIONS as action (action)}
            <button class="item" onclick={() => pick(action, true)}>
              <span class="item-line">
                <span class="name">{ACTION_LABELS[action]}</span>
                <span class="mode-hint" class:amber={ACTION_MODES[action] === "execute"}>{hint(action)}</span>
              </span>
              <span class="desc">{ACTION_DESCRIPTIONS[action]}</span>
            </button>
          {/each}
        {/if}
        <p class="section">WORKSPACE — {list.name}</p>
        {#each WORKSPACE_ACTIONS as action (action)}
          <button class="item" onclick={() => pick(action, false)}>
            <span class="item-line">
              <span class="name">{ACTION_LABELS[action]}</span>
              <span class="mode-hint">{hint(action)}</span>
            </span>
            <span class="desc">{ACTION_DESCRIPTIONS[action]}</span>
          </button>
        {/each}
      {/if}
      <div class="footer">
        <button
          class="footer-item"
          disabled={!linked}
          onclick={() => listId !== null && openAiHistory(listId)}
        >
          Run history
        </button>
        <button
          class="footer-item"
          onclick={() => {
            ui.aiMenuOpen = false;
            aiClients.openDialog();
          }}
        >
          AI Clients…
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .ai-menu-anchor {
    position: relative;
  }
  .ai-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    border: none;
    background: transparent;
    color: var(--color-neutral-400);
    font: inherit;
    font-size: 11.5px;
    padding: 4px 9px;
    border-radius: 6px;
    cursor: pointer;
    margin-left: 4px;
  }
  .ai-btn:hover,
  .ai-btn.open {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
  }
  .sparkle {
    font-size: 11px;
    color: var(--color-accent);
  }
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
  }
  .menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    width: 276px;
    background: var(--color-surface);
    border-radius: 8px;
    box-shadow: var(--shadow-md);
    padding: 6px;
    z-index: 41;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .section {
    font-size: 9.5px;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--color-neutral-500);
    padding: 6px 8px 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .item {
    display: flex;
    flex-direction: column;
    gap: 1px;
    text-align: left;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    padding: 5px 8px;
    border-radius: 6px;
    cursor: pointer;
  }
  .item:hover {
    background: color-mix(in srgb, var(--color-text) 7%, transparent);
  }
  .item-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .name {
    font-size: 12.5px;
  }
  .mode-hint {
    font-size: 9.5px;
    color: var(--color-neutral-600);
    flex: none;
  }
  .mode-hint.amber {
    color: #e0a36c;
  }
  .desc {
    font-size: 10px;
    color: var(--color-neutral-500);
  }
  .cta-text {
    font-size: 11.5px;
    color: var(--color-neutral-400);
    padding: 8px 8px 4px;
    line-height: 1.45;
  }
  .cta-btn {
    margin: 4px 8px 8px;
  }
  .footer {
    display: flex;
    gap: 2px;
    border-top: 1px solid var(--color-divider);
    margin-top: 4px;
    padding-top: 4px;
  }
  .footer-item {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--color-neutral-400);
    font: inherit;
    font-size: 11.5px;
    padding: 5px 8px;
    border-radius: 6px;
    cursor: pointer;
  }
  .footer-item:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-text) 7%, transparent);
    color: inherit;
  }
  .footer-item:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
