<script lang="ts">
  // Color label picker: None + the whole palette as swatches, labelled with
  // the name this list uses. "Manage…" opens the per-list name editor.
  import { labelName } from "$lib/core/label-names";
  import { sortedLabels } from "$lib/core/labels";
  import type { Todo } from "$lib/core/types";
  import { setColorLabelAction } from "$lib/state/actions-detail";
  import { store } from "$lib/state/store.svelte";
  import LabelManager from "./LabelManager.svelte";

  let { todo }: { todo: Todo } = $props();

  let managerOpen = $state(false);
  const labels = $derived(sortedLabels(store.data));
  const currentName = $derived(labelName(store.data, todo.listId, todo.colorLabelId));
  const listName = $derived(
    store.data.lists.find((l) => l.id === todo.listId)?.name ?? "this list",
  );
</script>

<div class="field">
  <span class="label">Color label — {currentName}</span>
  <div class="swatches">
    <button
      class="swatch none"
      class:selected={todo.colorLabelId === null}
      title="None"
      aria-label="No color label"
      onclick={() => setColorLabelAction(todo.id, null)}
    >✕</button>
    {#each labels as label (label.id)}
      {@const name = labelName(store.data, todo.listId, label.id)}
      <button
        class="swatch"
        class:selected={todo.colorLabelId === label.id}
        style:background={label.color}
        title={name}
        aria-label={name}
        onclick={() => setColorLabelAction(todo.id, label.id)}
      ></button>
    {/each}
    <button class="btn btn-ghost manage" onclick={() => (managerOpen = true)}>Manage…</button>
  </div>
</div>

{#if managerOpen}
  <LabelManager listId={todo.listId} {listName} onclose={() => (managerOpen = false)} />
{/if}

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .label {
    font-size: 12px;
    color: color-mix(in srgb, var(--color-text) 70%, transparent);
  }
  .swatches {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }
  .swatch {
    width: 17px;
    height: 17px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    padding: 0;
  }
  .swatch.none {
    background: transparent;
    border: 1px solid var(--color-divider);
    color: var(--color-neutral-500);
    font-size: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .swatch.selected {
    box-shadow:
      0 0 0 2px var(--color-surface),
      0 0 0 3.5px currentColor;
  }
  .swatch:not(.none).selected {
    box-shadow:
      0 0 0 2px var(--color-surface),
      0 0 0 3.5px var(--color-accent);
  }
  .manage {
    font-size: 11px;
    padding: 2px 6px;
  }
</style>
