<script lang="ts">
  // Settings → Todo colors: the central palette every list starts from. One
  // color per row with its name — the color carries the category, so the name
  // is what makes it readable. Lists can rename these for themselves in the
  // detail panel (Manage…); this is the shared default.
  import { customLabels, isBuiltinLabel, sortedLabels } from "$lib/core/labels";
  import { MAX_CUSTOM_LABELS } from "$lib/core/types";
  import {
    addCustomLabel, removeCustomLabel, resetBuiltinLabelsAction, updateLabel,
  } from "$lib/state/actions-labels";
  import { store } from "$lib/state/store.svelte";
  import ColorLabelRow from "./ColorLabelRow.svelte";

  const labels = $derived(sortedLabels(store.data));
  const customCount = $derived(customLabels(store.data).length);
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
    onclick={() => addCustomLabel()}
  >
    + Add color
  </button>
  <span class="counter">{customCount} / {MAX_CUSTOM_LABELS} added</span>
  <div class="spacer"></div>
  <button class="btn btn-ghost" onclick={() => resetBuiltinLabelsAction()}>
    Reset built-in colors
  </button>
</div>

<p class="note">
  Removing an added color clears it from the todos that used it. Every list sees
  these names — rename a color for one list from the todo detail panel.
</p>

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
