<script lang="ts">
  // Run history rows (design COMPONENTS.md §AIRunHistory): action + status
  // tag, then time · provider · mode. Click reopens the run.
  import { ACTION_LABELS, PROVIDER_LABELS, type AIRun } from "$lib/core/ai-types";
  import { formatTimestamp } from "$lib/core/time";
  import { openAiRun } from "$lib/state/ai-actions";

  let { runs }: { runs: AIRun[] } = $props();

  const STATUS_TAG = {
    running: "Running",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  } as const;

  const MODE_LABEL = { analyze: "Analyze", plan: "Plan", execute: "Execute" } as const;
</script>

{#if runs.length === 0}
  <p class="empty">No AI runs yet.</p>
{:else}
  <div class="list">
    {#each runs as run (run.id)}
      <button class="row" onclick={() => openAiRun(run.id)}>
        <span class="line1">
          <span class="action">{ACTION_LABELS[run.action]}</span>
          <span class="tag {run.status}">{STATUS_TAG[run.status]}</span>
        </span>
        <span class="line2">
          {formatTimestamp(run.startedAt, Date.now())} · {PROVIDER_LABELS[run.provider]} · {MODE_LABEL[run.mode]}
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
