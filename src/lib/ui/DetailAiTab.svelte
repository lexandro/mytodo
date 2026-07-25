<script lang="ts">
  // Detail panel AI tab (design §DetailPanel): the 5 todo-level actions as
  // outlined rows, a shortcut into the chat panel, and this todo's
  // conversations; unlinked list → centered CTA.
  import {
    ACTION_DESCRIPTIONS, ACTION_LABELS, ACTION_MODES, TODO_ACTIONS,
  } from "$lib/core/ai-types";
  import type { Todo } from "$lib/core/types";
  import { openAiPanel } from "$lib/state/ai-actions";
  import { aiConfig } from "$lib/state/ai-config.svelte";
  import { aiRuns } from "$lib/state/ai-runs.svelte";
  import { ui } from "$lib/state/ui.svelte";
  import AIRunHistoryList from "./AIRunHistoryList.svelte";

  let { todo }: { todo: Todo } = $props();

  const linked = $derived(aiConfig.linkFor(todo.listId) !== undefined);
  const runs = $derived(aiRuns.runsForTodo(todo.id));
</script>

{#if !linked}
  <div class="cta">
    <p>Link a workspace to use AI.</p>
    <button class="btn btn-primary" onclick={() => (ui.workspaceSettings = todo.listId)}>
      Link Workspace…
    </button>
  </div>
{:else}
  <div class="actions">
    {#each TODO_ACTIONS as action (action)}
      <button class="action-row" onclick={() => openAiPanel(todo.listId, todo.id, action)}>
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
  <button class="chat-row" onclick={() => openAiPanel(todo.listId, todo.id)}>
    ✦ Chat about this todo…
  </button>
  <div class="history">
    <span class="field-label">Conversations</span>
    <AIRunHistoryList {runs} />
  </div>
{/if}

<style>
  .cta {
    margin: auto;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    font-size: 12px;
    color: var(--color-neutral-400);
    padding: 30px 0;
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .action-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
    padding: 6px 9px;
    border: 1px solid var(--color-divider);
    border-radius: 7px;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .action-row:hover {
    border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
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
    font-size: 10px;
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
  .chat-row {
    border: 1px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
    border-radius: 7px;
    background: transparent;
    color: var(--color-accent);
    font: inherit;
    font-size: 12px;
    padding: 6px 9px;
    text-align: left;
    cursor: pointer;
  }
  .chat-row:hover {
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }
  .history {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--color-neutral-500);
  }
</style>
