<script lang="ts">
  // Color label picker: None + 8 built-ins + custom labels as 17px swatches;
  // "Manage…" opens the LabelManager (max 12 custom).
  import { PRESET_LABELS, labelName, sortedCustomLabels } from "$lib/core/labels";
  import type { Todo } from "$lib/core/types";
  import { setColorLabelAction } from "$lib/state/actions-detail";
  import { store } from "$lib/state/store.svelte";
  import LabelManager from "./LabelManager.svelte";

  let { todo }: { todo: Todo } = $props();

  let managerOpen = $state(false);
  const customs = $derived(sortedCustomLabels(store.data));
  const currentName = $derived(labelName(store.data, todo.colorLabelId));
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
    {#each PRESET_LABELS as preset (preset.id)}
      <button
        class="swatch"
        class:selected={todo.colorLabelId === preset.id}
        style:background={preset.color}
        title={preset.name}
        aria-label={preset.name}
        onclick={() => setColorLabelAction(todo.id, preset.id)}
      ></button>
    {/each}
    {#each customs as custom (custom.id)}
      <button
        class="swatch"
        class:selected={todo.colorLabelId === custom.id}
        style:background={custom.color}
        title={custom.name ?? custom.color}
        aria-label={custom.name ?? custom.color}
        onclick={() => setColorLabelAction(todo.id, custom.id)}
      ></button>
    {/each}
    <button class="btn btn-ghost manage" onclick={() => (managerOpen = true)}>Manage…</button>
  </div>
</div>

{#if managerOpen}
  <LabelManager onclose={() => (managerOpen = false)} />
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
