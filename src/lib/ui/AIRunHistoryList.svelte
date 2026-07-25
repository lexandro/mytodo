<script lang="ts">
  // Conversation history (design COMPONENTS.md §AIRunHistory): one row per
  // THREAD, not per run — first turn's wording + the newest turn's status.
  // Click reopens the thread, where follow-up messages continue its session.
  import { conversationSummaries } from "$lib/core/ai-runs";
  import type { AIRun } from "$lib/core/ai-types";
  import { formatTimestamp } from "$lib/core/time";
  import { openConversation } from "$lib/state/ai-actions";

  let { runs }: { runs: AIRun[] } = $props();

  const threads = $derived(conversationSummaries(runs));

  const STATUS_TAG = {
    running: "Running",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Stopped",
  } as const;
</script>

{#if threads.length === 0}
  <p class="empty">No AI conversations yet.</p>
{:else}
  <div class="list">
    {#each threads as thread (thread.conversationId)}
      <button class="row" onclick={() => openConversation(thread.conversationId)}>
        <span class="line1">
          <span class="action">{thread.title}</span>
          <span class="tag {thread.status}">{STATUS_TAG[thread.status]}</span>
        </span>
        <span class="line2">
          {formatTimestamp(thread.startedAt, Date.now())} · {thread.turns}
          {thread.turns === 1 ? "turn" : "turns"}
        </span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .empty {
    font-size: 11.5px;
    color: var(--color-neutral-500);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 3px;
    padding: 7px 9px;
    border: 1px solid var(--color-divider);
    border-radius: 7px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .row:hover {
    border-color: var(--color-accent);
  }
  .line1 {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .action {
    font-size: 12px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tag {
    font-size: 9px;
    padding: 1px 6px;
    border-radius: 999px;
    border: 1px solid var(--color-divider);
    color: var(--color-neutral-500);
    flex: none;
  }
  .tag.completed {
    color: #7cc98f;
    border-color: color-mix(in srgb, #7cc98f 45%, transparent);
  }
  .tag.failed {
    color: #e07b7b;
    border-color: color-mix(in srgb, #e07b7b 45%, transparent);
  }
  .tag.running {
    color: var(--color-accent);
    border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
  }
  .line2 {
    font-size: 10px;
    color: var(--color-neutral-500);
    font-variant-numeric: tabular-nums;
  }
</style>
