<script lang="ts">
  // One central palette, one color per row with its name — the color carries
  // the category, so the name is what makes it readable. Used for both
  // palettes: todo colors and list colors.
  import { customLabels, isBuiltinLabel, sortedLabels } from "$lib/core/labels";
  import { MAX_CUSTOM_LABELS, type PaletteKind } from "$lib/core/types";
  import {
    addCustomLabel, removeCustomLabel, resetBuiltinLabelsAction, updateLabel,
  } from "$lib/state/actions-labels";
  import { store } from "$lib/state/store.svelte";
  import ColorLabelRow from "./ColorLabelRow.svelte";

  let { kind }: { kind: PaletteKind } = $props();

  const NOTES: Record<PaletteKind, string> = {
    todo:
      "Removing an added color clears it from the todos that used it. Every list sees these names — rename a color for one list from the todo detail panel.",
    list:
      "A list's color shows up in the rail, on its tab and along the top of its pane. Set it from the list's right-click menu.",
  };

  const labels = $derived(sortedLabels(store.data, kind));
  const customCount = $derived(customLabels(store.data, kind).length);
</script>

<div class="rows">
  {#each labels as label (label.id)}
    <ColorLabelRow
      {label}
      placeholder={isBuiltinLabel(label.id) ? "Built-in color" : "Name this color"}
      removable={!isBuiltinLabel(label.id)}
      onColor={(color) => updateLabel(label.id, color, label.name)}
      onName={(name) => updateLabel(label.id, label.color, name)}
      onRemove={() => removeCustomLabel(label.id)}
    />
  {/each}
</div>

<div class="footer">
  <button
    class="btn btn-secondary add"
    disabled={customCount >= MAX_CUSTOM_LABELS}
    onclick={() => addCustomLabel(kind)}
  >
    + Add color
  </button>
  <span class="counter">{customCount} / {MAX_CUSTOM_LABELS} added</span>
  <div class="spacer"></div>
  <button class="btn btn-ghost" onclick={() => resetBuiltinLabelsAction(kind)}>
    Reset built-in colors
  </button>
</div>

<p class="note">{NOTES[kind]}</p>

<style>
  .rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .footer {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
  }
  .add {
    font-size: 12px;
    padding: 4px 12px;
  }
  .counter {
    font-size: 11px;
    color: var(--color-neutral-500);
    font-variant-numeric: tabular-nums;
  }
  .spacer {
    flex: 1;
  }
  .note {
    font-size: 10.5px;
    color: var(--color-neutral-600);
    line-height: 1.45;
    margin: 0;
  }
</style>
