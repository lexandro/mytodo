<script lang="ts">
  // Single-pane mode: every list as a tab; active = accent text + underline.
  import { byOrder } from "$lib/core/ordering";
  import { listOpenCount } from "$lib/core/rows";
  import { switchList } from "$lib/state/actions";
  import { listMenuItems, openContextMenu } from "$lib/state/menus";
  import { store } from "$lib/state/store.svelte";
  import WorkspaceBadge from "./WorkspaceBadge.svelte";

  let { paneIndex, activeListId }: { paneIndex: number; activeListId: string | null } = $props();

  const lists = $derived([...store.data.lists].sort(byOrder));
</script>

<div class="tabbar mt-hscroll">
  {#each lists as list (list.id)}
    <button
      class="tab"
      class:active={list.id === activeListId}
      onclick={() => switchList(list.id, paneIndex)}
      oncontextmenu={(e) => openContextMenu(e, listMenuItems(list))}
    >
      <span>{list.emoji}</span>
      <span>{list.name}</span>
      <WorkspaceBadge listId={list.id} />
      <span class="count">{listOpenCount(store.data, list.id)}</span>
    </button>
  {/each}
</div>

<style>
  .tabbar {
    display: flex;
    gap: 2px;
    padding: 6px 8px 0;
    border-bottom: 1px solid var(--color-divider);
    overflow-x: auto;
    flex: none;
    scrollbar-width: none;
  }
  .tabbar::-webkit-scrollbar {
    display: none;
  }
  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px 7px;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-size: 12.5px;
    border-radius: 6px 6px 0 0;
    white-space: nowrap;
  }
  .tab:hover {
    background: color-mix(in srgb, var(--color-text) 5%, transparent);
  }
  .tab.active {
    color: var(--color-accent);
    box-shadow: inset 0 -2px 0 var(--color-accent);
  }
  .count {
    font-size: 10px;
    color: var(--color-neutral-600);
    font-variant-numeric: tabular-nums;
  }
</style>
