<script lang="ts">
  // Running / failed / cancelled / result phases of the AI panel.
  import { ACTION_LABELS, PROVIDER_LABELS, type AIRun } from "$lib/core/ai-types";
  import { newRunFromPanel, openAiClientsFromPanel, retryFromRun } from "$lib/state/ai-actions";
  import { aiRuns } from "$lib/state/ai-runs.svelte";
  import AIResultView from "./AIResultView.svelte";

  let { run }: { run: AIRun } = $props();

  let detailsOpen = $state(false);
  let elapsedSec = $state(0);
  $effect(() => {
    if (run.status !== "running") return;
    const timer = setInterval(() => {
      elapsedSec = Math.round((Date.now() - run.startedAt) / 1000);
    }, 500);
    return () => clearInterval(timer);
  });

  const tail = $derived(run.log.slice(-4));
</script>

<div class="run-view">
  {#if run.status === "running"}
    <div class="running-head">
      <span class="spinner"></span>
      <span class="what">{ACTION_LABELS[run.action]} · {PROVIDER_LABELS[run.provider]}</span>
      <span class="elapsed">{Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, "0")}</span>
    </div>
    <div class="progress">
      {#each detailsOpen ? run.log : tail as line, i (i)}
        <p class="line">{line}</p>
      {/each}
      {#if run.log.length === 0}
        <p class="line muted">Waiting for the first response…</p>
      {/if}
    </div>
    {#if run.log.length > 4}
      <button class="btn btn-ghost mini" onclick={() => (detailsOpen = !detailsOpen)}>
        {detailsOpen ? "Hide details" : "Show details"}
      </button>
    {/if}
    <button class="btn btn-secondary" onclick={() => void aiRuns.cancelRun(run.id)}>Cancel</button>
    <p class="note">Closing this panel does not stop the run.</p>
  {:else if run.status === "completed"}
    <AIResultView {run} />
    <button class="btn btn-ghost new-run" onclick={newRunFromPanel}>New run</button>
  {:else}
    <div class="failed-box" class:cancelled={run.status === "cancelled"}>
      <p class="failed-title">
        ⚠ {run.status === "cancelled" ? "Run cancelled" : `${ACTION_LABELS[run.action]} failed`}
      </p>
      {#if run.error !== null}
        <p class="failed-message">{run.error}</p>
      {/if}
    </div>
    <div class="failed-actions">
      <button class="btn btn-secondary" onclick={() => retryFromRun(run.id)}>Retry</button>
      {#if run.status === "failed"}
        <button class="btn btn-ghost" onclick={openAiClientsFromPanel}>Open AI Clients…</button>
      {/if}
    </div>
    {#if run.log.length > 0}
      <button class="btn btn-ghost mini" onclick={() => (detailsOpen = !detailsOpen)}>
        {detailsOpen ? "Hide details" : "Show details"}
      </button>
      {#if detailsOpen}
        <pre class="log">{run.log.join("\n")}</pre>
      {/if}
    {/if}
    <button class="btn btn-ghost new-run" onclick={newRunFromPanel}>New run</button>
  {/if}
</div>

<style>
  .run-view {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .running-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
    flex: none;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .what {
    font-size: 12px;
    flex: 1;
  }
  .elapsed {
    font-size: 11px;
    color: var(--color-neutral-500);
    font-variant-numeric: tabular-nums;
  }
  .progress {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .line {
    font-family: var(--font-mono, "Cascadia Mono", Consolas, monospace);
    font-size: 10.5px;
    color: var(--color-neutral-400);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .muted {
    color: var(--color-neutral-600);
  }
  .mini {
    align-self: flex-start;
    font-size: 10.5px;
    padding: 2px 7px;
  }
  .note {
    font-size: 10px;
    color: var(--color-neutral-600);
  }
  .failed-box {
    border: 1px solid color-mix(in srgb, #e07b7b 45%, transparent);
    border-radius: 7px;
    padding: 9px 11px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .failed-box.cancelled {
    border-color: var(--color-divider);
  }
  .failed-title {
    font-size: 12px;
    color: #e07b7b;
  }
  .cancelled .failed-title {
    color: var(--color-neutral-400);
  }
  .failed-message {
    font-size: 11px;
    line-height: 1.5;
    color: var(--color-neutral-400);
    white-space: pre-line;
  }
  .failed-actions {
    display: flex;
    gap: 8px;
  }
  .log {
    font-family: var(--font-mono, "Cascadia Mono", Consolas, monospace);
    font-size: 10.5px;
    line-height: 1.5;
    color: var(--color-neutral-400);
    background: color-mix(in srgb, var(--color-text) 4%, transparent);
    border-radius: 6px;
    padding: 8px;
    overflow-x: auto;
    white-space: pre-wrap;
  }
  .new-run {
    align-self: flex-start;
  }
</style>
