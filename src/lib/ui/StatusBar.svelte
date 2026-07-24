<script lang="ts">
  // StatusBar (23px): saved indicator left, update offer + shortcut hints
  // right. On persist error the saved slot turns into a red retry
  // affordance — data is never lost silently (daprompt §32).
  import { persistQueue } from "$lib/state/persist.svelte";
  import { updater } from "$lib/state/updater.svelte";
</script>

<footer class="statusbar">
  {#if persistQueue.state === "error"}
    <button class="save-error" title={persistQueue.lastError} onclick={() => void persistQueue.retry()}>
      <span class="dot dot-error"></span>
      Save failed — click to retry
    </button>
  {:else}
    <span class="saved">
      <span class="dot" class:dot-saving={persistQueue.state === "saving"}></span>
      Saved · local file — no account, no cloud
    </span>
  {/if}
  <span class="spacer"></span>
  {#if updater.status === "downloading"}
    <span class="update-chip">Downloading update…</span>
  {:else if updater.availableVersion !== null && !updater.dismissed}
    <span class="update-chip">
      <button class="update-install" onclick={() => void updater.install()}>
        Update {updater.availableVersion} available — install & restart
      </button>
      <button class="update-dismiss" title="Later" onclick={() => updater.dismiss()}>✕</button>
    </span>
  {/if}
  <span class="hints">Ctrl+Z undo</span>
</footer>

<style>
  .statusbar {
    height: 23px;
    flex: none;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: 0 10px;
    background: var(--color-surface);
    border-top: 1px solid var(--color-divider);
    font-size: 10px;
    color: var(--color-neutral-500);
    white-space: nowrap;
    user-select: none;
  }
  .saved {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #7cc98f;
  }
  .dot-saving {
    background: var(--color-neutral-500);
  }
  .dot-error {
    background: #e07b7b;
  }
  .save-error {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: none;
    background: transparent;
    color: #e07b7b;
    font: inherit;
    cursor: pointer;
    padding: 0;
  }
  .spacer {
    flex: 1;
  }
  .update-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--color-accent);
  }
  .update-install {
    border: none;
    background: transparent;
    color: var(--color-accent);
    font: inherit;
    cursor: pointer;
    padding: 0;
  }
  .update-install:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .update-dismiss {
    border: none;
    background: transparent;
    color: var(--color-neutral-600);
    font-size: 9px;
    cursor: pointer;
    padding: 0 2px;
  }
  .update-dismiss:hover {
    color: inherit;
  }
  .hints {
    color: var(--color-neutral-600);
  }
</style>
