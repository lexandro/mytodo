<script lang="ts">
  // One "where your files are" row: a read-only path field plus a button
  // that opens the folder in Explorer. Read-only rather than static text so
  // the path stays selectable and copyable.
  import { openFsPath } from "$lib/ipc";
  import { ui } from "$lib/state/ui.svelte";

  let { label, path }: { label: string; path: string } = $props();

  async function open(): Promise<void> {
    if (path === "") return;
    try {
      await openFsPath(path);
    } catch (e) {
      ui.showToast(`Cannot open the folder: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
</script>

<div class="row">
  <span class="name">{label}</span>
  <input class="input mono" readonly value={path} title={path} />
  <button class="btn btn-secondary open" disabled={path === ""} onclick={() => void open()}>
    Open folder
  </button>
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .name {
    width: 58px;
    flex: none;
    font-size: 12.5px;
  }
  .mono {
    flex: 1;
    min-width: 0;
    min-height: 26px;
    font-family: var(--font-mono, "Cascadia Mono", Consolas, monospace);
    font-size: 11px;
    color: var(--color-neutral-400);
  }
  .open {
    flex: none;
    font-size: 11.5px;
    padding: 4px 10px;
  }
</style>
