<script lang="ts">
  // Multi-pane mode: compact list selector (emoji + name + ▼) opening a
  // popover of all lists with open counts.
  import { labelColor, tintBackground } from "$lib/core/labels";
  import { byOrder } from "$lib/core/ordering";
  import { listOpenCount } from "$lib/core/rows";
  import { switchList } from "$lib/state/actions";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";

  let { paneIndex, activeListId }: { paneIndex: number; activeListId: string | null } = $props();

  const lists = $derived([...store.data.lists].sort(byOrder));
  const active = $derived(lists.find((l) => l.id === activeListId) ?? lists[0]);
  const open = $derived(ui.panes[paneIndex].pickerOpen);

  function togglePicker(e: MouseEvent): void {
    e.stopPropagation();
    ui.panes.forEach((pane, i) =>
      ui.updatePane(i, { pickerOpen: i === paneIndex ? !pane.pickerOpen : false }),
    );
  }
</script>

<div class="selector-row">
  <button class="selector" onclick={togglePicker}>
    <span
      class="emoji"
      style:background={tintBackground(labelColor(store.data, active?.colorLabelId ?? null))}
    >{active?.emoji}</span>
    <span>{active?.name}</span>
    <span class="chev">▼</span>
  </button>
  <span class="count-label">
    {active === undefined ? "" : `${listOpenCount(store.data, active.id)} open`}
  </span>
  {#if open}
    <div class="popover">
      {#each lists as list (list.id)}
        <button
          class="item"
          class:active={list.id === activeListId}
          onclick={() => switchList(list.id, paneIndex)}
        >
          <span
            class="emoji"
            style:background={tintBackground(labelColor(store.data, list.colorLabelId))}
          >{list.emoji}</span>
          <span class="name">{list.name}</span>
          <span class="cnt">{listOpenCount(store.data, list.id)}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .selector-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--color-divider);
    position: relative;
    flex: none;
  }
  .selector {
    display: flex;
    align-items: center;
    gap: 7px;
    border: 1px solid var(--color-divider);
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 12.5px;
    padding: 4px 9px;
    border-radius: 6px;
    cursor: pointer;
  }
  .selector:hover {
    border-color: var(--color-accent);
  }
  .chev {
    color: var(--color-neutral-600);
    font-size: 8px;
  }
  .count-label {
    font-size: 10.5px;
    color: var(--color-neutral-600);
  }
  .popover {
    position: absolute;
    top: 36px;
    left: 8px;
    z-index: 40;
    min-width: 210px;
    background: var(--color-surface);
    border-radius: 8px;
    box-shadow: var(--shadow-md);
    padding: 4px;
    display: flex;
    flex-direction: column;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 9px;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 12.5px;
    border-radius: 5px;
    cursor: pointer;
    text-align: left;
  }
  .item:hover {
    background: color-mix(in srgb, var(--color-text) 7%, transparent);
  }
  .item.active {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  }
  .emoji {
    width: 19px;
    height: 19px;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }
  .name {
    flex: 1;
  }
  .cnt {
    font-size: 10px;
    color: var(--color-neutral-600);
    font-variant-numeric: tabular-nums;
  }
</style>
