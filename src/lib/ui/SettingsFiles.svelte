<script lang="ts">
  // Settings → Files: where the database and the backups live. The paths are
  // asked for when the section opens, never at startup.
  import { appPaths, type AppPaths } from "$lib/ipc";
  import FolderRow from "./FolderRow.svelte";

  let paths = $state<AppPaths | null>(null);
  let error = $state<string | null>(null);

  $effect(() => {
    void appPaths()
      .then((p) => (paths = p))
      .catch((e: unknown) => {
        error = e instanceof Error ? e.message : String(e);
      });
  });
</script>

<FolderRow label="Data" path={paths?.dataDir ?? ""} />
<FolderRow label="Backups" path={paths?.backupDir ?? ""} />
{#if error !== null}
  <p class="error">Cannot read the app folders: {error}</p>
{/if}
<p class="note">
  Everything lives next to the executable — copy the folder and your data moves
  with it.
</p>

<style>
  .note {
    font-size: 10.5px;
    color: var(--color-neutral-600);
    line-height: 1.45;
  }
  .error {
    font-size: 11px;
    color: #e07b7b;
  }
</style>
