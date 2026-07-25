<script lang="ts">
  // One provider's card in the AI Clients dialog (design COMPONENTS.md
  // §AIClientSettings): status dot, version, Enabled, mono path + Browse…,
  // Auto Detect + Test, amber human message line.
  import { isValidModelName } from "$lib/core/ai-models";
  import { PROVIDER_LABELS, type AIProviderId } from "$lib/core/ai-types";
  import { aiClients } from "$lib/state/ai-clients.svelte";
  import { aiConfig } from "$lib/state/ai-config.svelte";
  import { aiModels } from "$lib/state/ai-models.svelte";

  let { provider }: { provider: AIProviderId } = $props();

  // the dialog is one of the few surfaces that shows models — fetch on open
  $effect(() => {
    aiModels.ensureLoaded(provider);
  });

  const config = $derived(aiConfig.clients[provider]);
  const runtime = $derived(aiClients.runtime[provider]);
  const busy = $derived(runtime.status === "detecting");

  // an unusable name is refused here rather than failing later in the CLI
  let modelRejected = $state(false);

  function onModelChange(e: Event & { currentTarget: HTMLInputElement }): void {
    const value = e.currentTarget.value.trim();
    modelRejected = value !== "" && !isValidModelName(value);
    if (modelRejected) {
      e.currentTarget.value = config.model ?? "";
      return;
    }
    aiConfig.setModel(provider, value === "" ? null : value);
  }

  const STATUS_TEXT = {
    unknown: "○ Not checked",
    detecting: "◌ Detecting…",
    detected: "● Detected",
    notDetected: "○ Not detected",
    notReady: "● Installed — not ready",
  } as const;
</script>

<div class="card">
  <div class="head">
    <span class="name">{PROVIDER_LABELS[provider]}</span>
    <span class="status {runtime.status}">{STATUS_TEXT[runtime.status]}</span>
    {#if config.version !== null}
      <span class="version">v{config.version}</span>
    {/if}
    <div class="spacer"></div>
    <label class="enabled">
      <input
        type="checkbox"
        checked={config.enabled}
        onchange={(e) => aiClients.setEnabled(provider, e.currentTarget.checked)}
      />
      Enabled
    </label>
  </div>
  <div class="path-row">
    <input
      class="input mono"
      readonly
      placeholder="Executable path — Auto Detect or Browse…"
      value={config.path ?? ""}
      title={config.path ?? ""}
    />
    <button class="btn btn-secondary" disabled={busy} onclick={() => void aiClients.browse(provider)}>
      Browse…
    </button>
  </div>
  <div class="actions">
    <button class="btn btn-ghost" disabled={busy} onclick={() => void aiClients.autoDetect(provider)}>
      Auto Detect
    </button>
    <button class="btn btn-ghost" disabled={busy} onclick={() => void aiClients.test(provider)}>
      Test
    </button>
    <div class="spacer"></div>
    <label class="model-row">
      Model
      <input
        class="input model"
        list="models-{provider}"
        placeholder={aiModels.isLoading(provider) ? "reading…" : "client default"}
        value={config.model ?? ""}
        title="Passed to the CLI's --model flag; empty = the client's own default"
        onchange={onModelChange}
      />
      <datalist id="models-{provider}">
        {#each aiModels.options(provider) as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </datalist>
    </label>
  </div>
  {#if modelRejected}
    <p class="message">
      A model name may only contain letters, digits and . _ / : - — and cannot start with a dash.
    </p>
  {/if}
  {#if runtime.message !== null}
    <p class="message">{runtime.message}</p>
  {/if}
</div>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid var(--color-divider);
    border-radius: 8px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .name {
    font-size: 12.5px;
    font-weight: 500;
  }
  .status {
    font-size: 10.5px;
    color: var(--color-neutral-500);
  }
  .status.detected {
    color: #7cc98f;
  }
  .status.detecting {
    color: var(--color-accent);
  }
  .status.notReady {
    color: #e0a36c;
  }
  .version {
    font-size: 10px;
    color: var(--color-neutral-500);
    font-variant-numeric: tabular-nums;
  }
  .spacer {
    flex: 1;
  }
  .enabled {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    color: var(--color-neutral-400);
    cursor: pointer;
  }
  .path-row {
    display: flex;
    gap: 8px;
  }
  .mono {
    font-family: var(--font-mono, "Cascadia Mono", Consolas, monospace);
    font-size: 11px;
    flex: 1;
    min-width: 0;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .model-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    color: var(--color-neutral-400);
  }
  .model {
    width: 150px;
    min-height: 26px;
    font-size: 11.5px;
  }
  .message {
    font-size: 11px;
    line-height: 1.45;
    color: #e0a36c;
    white-space: pre-line;
  }
</style>
