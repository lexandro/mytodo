<script lang="ts">
  // Portable shortcut offer (v1.1): create or repair the Desktop /
  // Start Menu shortcut pointing at the currently running copy.
  import { shortcutOffer } from "$lib/state/shortcut-offer.svelte";
</script>

{#if shortcutOffer.offer !== null}
  {@const repair = shortcutOffer.offer.kind === "repair"}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="dialog-backdrop" onclick={(e) => { if (e.target === e.currentTarget) shortcutOffer.notNow(); }}>
    <div class="dialog offer">
      <span class="dialog-title o-title">
        {repair ? "Fix your myTODO shortcut?" : "Add a myTODO shortcut?"}
      </span>
      <p class="body">
        {#if repair}
          Your existing shortcut points to a location that no longer exists
          (the portable folder probably moved). Update it to this copy?
        {:else}
          This portable copy has no Desktop or Start Menu shortcut yet.
          Create one pointing at where it is running from?
        {/if}
      </p>
      <label class="check-row">
        <input type="checkbox" bind:checked={shortcutOffer.desktopChecked} />
        Desktop
      </label>
      <label class="check-row">
        <input type="checkbox" bind:checked={shortcutOffer.startMenuChecked} />
        Start Menu
      </label>
      <div class="dialog-actions">
        <button class="btn btn-ghost small" onclick={() => void shortcutOffer.dontAskAgain()}>
          Don't ask again
        </button>
        <span class="spacer"></span>
        <button class="btn btn-secondary" onclick={() => shortcutOffer.notNow()}>Not now</button>
        <button class="btn btn-primary" onclick={() => void shortcutOffer.accept()}>
          {repair ? "Update" : "Create"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .offer {
    width: min(400px, 100%);
  }
  .o-title {
    font-size: 16px;
  }
  .body {
    font-size: 12.5px;
    margin: 0;
    color: var(--color-neutral-400);
  }
  .check-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    cursor: pointer;
  }
  .check-row input {
    accent-color: var(--color-accent);
  }
  .small {
    font-size: 11.5px;
  }
  .spacer {
    flex: 1;
  }
</style>
