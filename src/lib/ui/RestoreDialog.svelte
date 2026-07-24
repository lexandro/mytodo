<script lang="ts">
  // Backup restore picker: lists the backup/ directory (newest first).
  // A safety backup of the current data is taken automatically before
  // the swap (Rust side).
  import { listBackups } from "$lib/ipc";
  import { restoreBackupAction } from "$lib/state/actions-data";
  import { ui } from "$lib/state/ui.svelte";

  let backups = $state<string[] | null>(null);
  let error = $state<string | null>(null);

  $effect(() => {
    if (!ui.restoreOpen) return;
    backups = null;
    error = null;
    listBackups()
      .then((names) => (backups = names))
      .catch((e) => (error = e instanceof Error ? e.message : String(e)));
  });

  async function restore(name: string): Promise<void> {
    ui.restoreOpen = false;
    await restoreBackupAction(name);
  }
</script>

{#if ui.restoreOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="dialog-backdrop" onclick={(e) => { if (e.target === e.currentTarget) ui.restoreOpen = false; }}>
    <div class="dialog restore">
      <span class="dialog-title r-title">Restore backup</span>
      <p class="note">
        The current data is backed up as <code>pre-restore.db</code> before
        the restore replaces it.
      </p>
      {#if error !== null}
        <p class="err">{error}</p>
      {:else if backups === null}
        <p class="note">Loading…</p>
      {:else if backups.length === 0}
        <p class="note">No backups yet — use File → Backup now first.</p>
      {:else}
        <div class="list">
          {#each backups as name (name)}
            <button class="item" onclick={() => void restore(name)}>{name}</button>
          {/each}
        </div>
      {/if}
      <div class="dialog-actions">
        <button class="btn btn-secondary" onclick={() => (ui.restoreOpen = false)}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .restore {
    width: min(380px, 100%);
  }
  .r-title {
    font-size: 16px;
  }
  .note {
    font-size: 12px;
    color: var(--color-neutral-500);
    margin: 0;
  }
  .err {
    font-size: 12px;
    color: #e07b7b;
    margin: 0;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 40vh;
    overflow-y: auto;
  }
  .item {
    text-align: left;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
    padding: 6px 9px;
    border-radius: 6px;
    cursor: pointer;
  }
  .item:hover {
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }
</style>
