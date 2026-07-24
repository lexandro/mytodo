<script lang="ts">
  // AI Clients settings dialog (design COMPONENTS.md §AIClientSettings,
  // 480px): intro note, one ProviderCard per provider, global default
  // client select + workspace-override note, Done.
  import { PROVIDER_IDS, PROVIDER_LABELS, type AIProviderId } from "$lib/core/ai-types";
  import { aiConfig } from "$lib/state/ai-config.svelte";
  import { ui } from "$lib/state/ui.svelte";
  import ProviderCard from "./ProviderCard.svelte";

  function close(): void {
    ui.aiClientsOpen = false;
  }

  function onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) close();
  }

  function onDefaultChange(e: Event & { currentTarget: HTMLSelectElement }): void {
    aiConfig.setDefaultClient(e.currentTarget.value as AIProviderId);
  }
</script>

{#if ui.aiClientsOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="dialog-backdrop" onclick={onBackdropClick}>
    <div class="dialog clients-dialog">
      <span class="dialog-title">AI Clients</span>
      <p class="intro">
        myTODO never stores accounts or API keys — authentication happens in
        each client's own CLI.
      </p>
      {#each PROVIDER_IDS as provider (provider)}
        <ProviderCard {provider} />
      {/each}
      <div class="footer">
        <label class="default-pick">
          Default AI client
          <select class="input" value={aiConfig.clients.defaultClient} onchange={onDefaultChange}>
            {#each PROVIDER_IDS as id (id)}
              <option value={id}>{PROVIDER_LABELS[id]}</option>
            {/each}
          </select>
        </label>
        <span class="note">A workspace can override this in its settings.</span>
        <div class="spacer"></div>
        <button class="btn btn-primary" onclick={close}>Done</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .clients-dialog {
    width: min(480px, 100%);
  }
  .intro {
    font-size: 11.5px;
    color: var(--color-neutral-500);
    line-height: 1.45;
  }
  .footer {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
  }
  .default-pick {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11.5px;
    color: var(--color-neutral-400);
    white-space: nowrap;
  }
  .default-pick select {
    min-height: 26px;
    font-size: 12px;
    width: auto;
  }
  .note {
    font-size: 10px;
    color: var(--color-neutral-600);
  }
  .spacer {
    flex: 1;
  }
</style>
