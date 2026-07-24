<script lang="ts">
  // Current-list filter (Ctrl+F): live, fuzzy, accent-insensitive; shows a
  // match count. Rendering force-expands groups via buildPaneRows.
  import { ui } from "$lib/state/ui.svelte";

  let { paneIndex, matchCount }: { paneIndex: number; matchCount: number } = $props();

  function autofocus(el: HTMLInputElement): void {
    el.focus();
  }
</script>

<div class="filter-bar">
  <input
    class="input filter-input"
    use:autofocus
    placeholder="Filter — fuzzy, accent-insensitive (árvíztűrő = ARVIZTURO)"
    bind:value={ui.panes[paneIndex].filterText}
  />
  <span class="count">
    {ui.panes[paneIndex].filterText === "" ? "" : `${matchCount} match${matchCount === 1 ? "" : "es"}`}
  </span>
</div>

<style>
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 8px 4px;
    flex: none;
  }
  .filter-input {
    min-height: 26px;
    font-size: 12px;
    border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
  }
  .count {
    font-size: 10.5px;
    color: var(--color-neutral-500);
    flex: none;
    font-variant-numeric: tabular-nums;
  }
</style>
