<script lang="ts">
  // One provider's card in the AI Clients dialog (design COMPONENTS.md
  // §AIClientSettings): status dot, version, Enabled, mono path + Browse…,
  // Auto Detect + Test, amber human message line.
  import { PROVIDER_LABELS, type AIProviderId } from "$lib/core/ai-types";
  import { aiClients } from "$lib/state/ai-clients.svelte";
  import { aiConfig } from "$lib/state/ai-config.svelte";

  let { provider }: { provider: AIProviderId } = $props();

  const config = $derived(aiConfig.clients[provider]);
  const runtime = $derived(aiClients.runtime[provider]);
  const busy = $derived(runtime.status === "detecting");

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
  </div>
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
    gap: 8px;
  }
  .message {
    font-size: 11px;
    line-height: 1.45;
    color: #e0a36c;
    white-space: pre-line;
  }
</style>
