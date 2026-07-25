<script lang="ts">
  // Preset tasks inside the panel (the old dropdown's content). Expanded
  // while the thread is empty, collapsed to a one-line toggle afterwards —
  // a running conversation should not be pushed off screen by nine cards.
  import {
    ACTION_DESCRIPTIONS, ACTION_LABELS, ACTION_MODES, TODO_ACTIONS,
    WORKSPACE_ACTIONS, type AIAction,
  } from "$lib/core/ai-types";
  import { panelTodoTitle, runPreset } from "$lib/state/ai-actions";
  import type { AiPanelState } from "$lib/state/ui.svelte";

  let { panel, busy }: { panel: AiPanelState; busy: boolean } = $props();

  const todoTitle = $derived(panelTodoTitle(panel));
  const actions = $derived<AIAction[]>(
    todoTitle === null ? [...WORKSPACE_ACTIONS] : [...TODO_ACTIONS, ...WORKSPACE_ACTIONS],
  );
</script>

<div class="presets">
  <button class="toggle" onclick={() => (panel.presetsOpen = !panel.presetsOpen)}>
    <span class="caret" class:open={panel.presetsOpen}>▸</span>
    <span>Preset tasks</span>
    <span class="scope">{todoTitle ?? "workspace"}</span>
  </button>
  {#if panel.presetsOpen}
    <div class="cards">
      {#each actions as action (action)}
        <button class="card" disabled={busy} onclick={() => void runPreset(action)}>
          <span class="line">
            <span class="name">{ACTION_LABELS[action]}</span>
            <span class="hint" class:amber={ACTION_MODES[action] === "execute"}>
              {ACTION_MODES[action] === "execute" ? "may modify files" : "read only"}
            </span>
          </span>
          <span class="desc">{ACTION_DESCRIPTIONS[action]}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .presets {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: none;
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    border: none;
    background: transparent;
    color: var(--color-neutral-400);
    font: inherit;
    font-size: 11px;
    padding: 3px 2px;
    border-radius: 5px;
    cursor: pointer;
    text-align: left;
  }
  .toggle:hover {
    color: var(--color-text);
  }
  .caret {
    font-size: 9px;
    transition: transform 0.12s ease;
  }
  .caret.open {
    transform: rotate(90deg);
  }
  .scope {
    flex: 1;
    min-width: 0;
    font-size: 10px;
    color: var(--color-neutral-600);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: right;
  }
  .cards {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
    padding: 5px 8px;
    border: 1px solid var(--color-divider);
    border-radius: 7px;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .card:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
  }
  .card:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .name {
    font-size: 12px;
  }
  .hint {
    font-size: 9.5px;
    color: var(--color-neutral-600);
    flex: none;
  }
  .hint.amber {
    color: #e0a36c;
  }
  .desc {
    font-size: 10px;
    color: var(--color-neutral-500);
  }
</style>
