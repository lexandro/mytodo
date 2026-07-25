<script lang="ts">
  // One conversation turn: what the user asked (typed message or preset
  // action) followed by the AI's side — live progress, the result blocks, or
  // the failure. Reopened threads render exactly the same from history.
  import { modelLabel } from "$lib/core/ai-models";
  import { ACTION_LABELS, PROVIDER_LABELS, type AIRun } from "$lib/core/ai-types";
  import { aiRuns } from "$lib/state/ai-runs.svelte";
  import AIResultView from "./AIResultView.svelte";

  let { run }: { run: AIRun } = $props();

  let elapsedSec = $state(0);
  $effect(() => {
    if (run.status !== "running") return;
    const timer = setInterval(() => {
      elapsedSec = Math.round((Date.now() - run.startedAt) / 1000);
    }, 500);
    return () => clearInterval(timer);
  });

  const tail = $derived(run.log.slice(-3));
  const who = $derived(
    `${PROVIDER_LABELS[run.provider]} · ${modelLabel(run.provider, run.model)}`,
  );
</script>

<div class="turn">
  <div class="ask">
    {#if run.userMessage !== null}
      <p class="user-text">{run.userMessage}</p>
    {:else}
      <span class="preset">{ACTION_LABELS[run.action]}</span>
    {/if}
    {#if run.mode === "execute"}
      <span class="mode-flag">may modify files</span>
    {/if}
  </div>

  <div class="answer">
    {#if run.status === "running"}
      <div class="running">
        <span class="spinner"></span>
        <span class="who">{who}</span>
        <span class="elapsed">{Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, "0")}</span>
        <button class="stop" onclick={() => void aiRuns.cancelRun(run.id)}>Stop</button>
      </div>
      {#each tail as line, i (i)}
        <p class="progress">{line}</p>
      {/each}
      {#if run.log.length === 0}
        <p class="progress muted">Waiting for the first response…</p>
      {/if}
    {:else if run.status === "completed"}
      <AIResultView {run} />
    {:else}
      <div class="failed" class:cancelled={run.status === "cancelled"}>
        <p class="failed-title">
          {run.status === "cancelled" ? "Stopped" : "Failed"} · {who}
        </p>
        {#if run.error !== null}
          <p class="failed-message">{run.error}</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .turn {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .ask {
    align-self: flex-end;
    max-width: 92%;
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: flex-end;
    background: color-mix(in srgb, var(--color-accent) 13%, transparent);
    border-radius: 9px 9px 2px 9px;
    padding: 6px 9px;
  }
  .user-text {
    font-size: 12px;
    line-height: 1.45;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .preset {
    font-size: 12px;
    color: var(--color-accent);
  }
  .mode-flag {
    font-size: 9.5px;
    color: #e0a36c;
  }
  .answer {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-left: 2px solid var(--color-divider);
    padding-left: 9px;
  }
  .running {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .spinner {
    width: 11px;
    height: 11px;
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
  .who {
    font-size: 11px;
    flex: 1;
    color: var(--color-neutral-400);
  }
  .elapsed {
    font-size: 10.5px;
    color: var(--color-neutral-500);
    font-variant-numeric: tabular-nums;
  }
  .stop {
    border: 1px solid var(--color-divider);
    background: transparent;
    color: var(--color-neutral-400);
    font: inherit;
    font-size: 10.5px;
    padding: 1px 8px;
    border-radius: 5px;
    cursor: pointer;
  }
  .stop:hover {
    border-color: #e07b7b;
    color: #e07b7b;
  }
  .progress {
    font-family: var(--font-mono, "Cascadia Mono", Consolas, monospace);
    font-size: 10.5px;
    color: var(--color-neutral-500);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .muted {
    color: var(--color-neutral-600);
  }
  .failed {
    border: 1px solid color-mix(in srgb, #e07b7b 45%, transparent);
    border-radius: 7px;
    padding: 7px 9px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .failed.cancelled {
    border-color: var(--color-divider);
  }
  .failed-title {
    font-size: 11.5px;
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
</style>
