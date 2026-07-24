<script lang="ts">
  // Label manager modal: built-in palette preview (read-only), custom label
  // rows (color + optional name + remove), add until 12, counter, Done.
  import { MAX_CUSTOM_LABELS } from "$lib/core/types";
  import { PRESET_LABELS, sortedCustomLabels } from "$lib/core/labels";
  import { addCustomLabel, removeCustomLabel, updateCustomLabel } from "$lib/state/actions-detail";
  import { store } from "$lib/state/store.svelte";

  let { onclose }: { onclose: () => void } = $props();

  const customs = $derived(sortedCustomLabels(store.data));

  function onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) onclose();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="dialog-backdrop" onclick={onBackdropClick}>
  <div class="dialog manager">
    <span class="dialog-title mgr-title">Color labels</span>
    <div class="preset-row">
      {#each PRESET_LABELS as preset (preset.id)}
        <span class="preset" style:background={preset.color} title={preset.name}></span>
      {/each}
      <span class="preset-note">built-in</span>
    </div>
    {#each customs as custom (custom.id)}
      <div class="row">
        <input
          class="color"
          type="color"
          value={custom.color}
          onchange={(e) => updateCustomLabel(custom.id, e.currentTarget.value, custom.name)}
        />
        <input
          class="input name"
          placeholder="Optional name"
          value={custom.name ?? ""}
          onchange={(e) => {
            const name = e.currentTarget.value.trim();
            updateCustomLabel(custom.id, custom.color, name === "" ? null : name);
          }}
        />
        <button class="remove" aria-label="Remove label" onclick={() => removeCustomLabel(custom.id)}>✕</button>
      </div>
    {/each}
    <div class="footer">
      <button
        class="btn btn-secondary add"
        disabled={customs.length >= MAX_CUSTOM_LABELS}
        onclick={() => addCustomLabel("#9184d9", null)}
      >
        Add label
      </button>
      <span class="counter">{customs.length} / {MAX_CUSTOM_LABELS}</span>
      <div class="spacer"></div>
      <button class="btn btn-primary" onclick={() => onclose()}>Done</button>
    </div>
  </div>
</div>

<style>
  .manager {
    width: min(380px, 100%);
  }
  .mgr-title {
    font-size: 16px;
  }
  .preset-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .preset {
    width: 15px;
    height: 15px;
    border-radius: 50%;
  }
  .preset-note {
    font-size: 10px;
    color: var(--color-neutral-600);
    margin-left: 4px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .color {
    width: 26px;
    height: 24px;
    padding: 0;
    border: 1px solid var(--color-divider);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
  }
  .name {
    min-height: 26px;
    font-size: 12px;
  }
  .remove {
    border: none;
    background: transparent;
    color: var(--color-neutral-600);
    font-size: 11px;
    cursor: pointer;
  }
  .remove:hover {
    color: #e07b7b;
  }
  .footer {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
  }
  .add {
    font-size: 12px;
    padding: 4px 10px;
  }
  .counter {
    font-size: 11px;
    color: var(--color-neutral-500);
    font-variant-numeric: tabular-nums;
  }
  .spacer {
    flex: 1;
  }
</style>
