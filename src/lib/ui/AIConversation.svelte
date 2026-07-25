<script lang="ts">
  // The panel's main phase: preset tasks on top, the conversation thread in
  // the middle, the console at the bottom. One thread = one provider session,
  // so every turn after the first continues where the previous one stopped.
  import { effectiveProvider } from "$lib/core/ai-config";
  import { PROVIDER_LABELS } from "$lib/core/ai-types";
  import { openAiClientsFromPanel } from "$lib/state/ai-actions";
  import { aiConfig } from "$lib/state/ai-config.svelte";
  import { aiRuns } from "$lib/state/ai-runs.svelte";
  import type { AiPanelState } from "$lib/state/ui.svelte";
  import AIComposer from "./AIComposer.svelte";
  import AIPresetPicker from "./AIPresetPicker.svelte";
  import AIThreadTurn from "./AIThreadTurn.svelte";

  let { panel }: { panel: AiPanelState } = $props();

  const turns = $derived(aiRuns.turnsOf(panel.conversationId));
  const busy = $derived(aiRuns.activeTurn(panel.conversationId) !== undefined);
  const link = $derived(aiConfig.linkFor(panel.listId));
  const provider = $derived(effectiveProvider(link, aiConfig.clients));
  const providerConfig = $derived(aiConfig.clients[provider]);
  const providerHint = $derived(
    !providerConfig.enabled
      ? `${PROVIDER_LABELS[provider]} is disabled in the AI Clients settings.`
      : providerConfig.path === null
        ? `${PROVIDER_LABELS[provider]} has not been detected yet.`
        : null,
  );

  // keep the newest turn in view: re-runs when a turn is added and while the
  // newest one streams (its log grows line by line)
  let threadEl = $state<HTMLDivElement | null>(null);
  const streamProgress = $derived(`${turns.length}:${turns[turns.length - 1]?.log.length ?? 0}`);
  $effect(() => {
    void streamProgress;
    if (threadEl !== null) threadEl.scrollTop = threadEl.scrollHeight;
  });
</script>

<div class="conversation">
  <AIPresetPicker {panel} {busy} />

  <div class="thread" bind:this={threadEl}>
    {#if turns.length === 0}
      <p class="empty">
        Pick a preset task above, or just write what you need — the AI works in
        this list's linked workspace and can propose todo changes.
      </p>
    {:else}
      {#each turns as run (run.id)}
        <AIThreadTurn {run} />
      {/each}
    {/if}
  </div>

  {#if providerHint !== null}
    <p class="hint warn">
      {providerHint}
      <button class="link" onclick={openAiClientsFromPanel}>AI Clients…</button>
    </p>
  {/if}
  {#if panel.error !== null}
    <div class="error-box">
      <p>⚠ {panel.error.message}</p>
      {#if panel.error.openAiClients === true}
        <button class="btn btn-secondary" onclick={openAiClientsFromPanel}>Open AI Clients…</button>
      {/if}
    </div>
  {/if}

  <AIComposer {panel} {provider} {busy} />
</div>

<style>
  .conversation {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .thread {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-right: 2px;
  }
  .empty {
    margin: auto 0;
    font-size: 11.5px;
    line-height: 1.55;
    color: var(--color-neutral-500);
  }
  .hint {
    font-size: 10.5px;
    flex: none;
  }
  .warn {
    color: #e0a36c;
  }
  .link {
    border: none;
    background: transparent;
    color: var(--color-accent);
    font: inherit;
    font-size: 10.5px;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .error-box {
    flex: none;
    border: 1px solid color-mix(in srgb, #e07b7b 45%, transparent);
    border-radius: 7px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
    font-size: 11.5px;
    color: #e07b7b;
  }
</style>
