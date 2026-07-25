<script lang="ts">
  // One palette row: swatch (color input) + name + optional remove. Shared by
  // the central editor and any future palette — the row knows nothing about
  // which palette it belongs to.
  import type { ColorLabel } from "$lib/core/types";

  let {
    label,
    placeholder,
    removable,
    onColor,
    onName,
    onRemove,
  }: {
    label: ColorLabel;
    placeholder: string;
    removable: boolean;
    onColor: (color: string) => void;
    onName: (name: string) => void;
    onRemove: () => void;
  } = $props();
</script>

<div class="row">
  <input
    class="color"
    type="color"
    value={label.color}
    aria-label="Color"
    onchange={(e) => onColor(e.currentTarget.value)}
  />
  <input
    class="input name"
    {placeholder}
    value={label.name ?? ""}
    onchange={(e) => onName(e.currentTarget.value)}
  />
  <span class="hex">{label.color}</span>
  {#if removable}
    <button class="remove" aria-label="Remove color" title="Remove color" onclick={() => onRemove()}>
      ✕
    </button>
  {:else}
    <span class="builtin" title="Built-in colors cannot be removed">built-in</span>
  {/if}
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .color {
    width: 30px;
    height: 26px;
    flex: none;
    padding: 0;
    border: 1px solid var(--color-divider);
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
  }
  .name {
    flex: 1;
    min-width: 0;
    min-height: 28px;
    font-size: 12.5px;
  }
  .hex {
    width: 62px;
    flex: none;
    font-size: 10.5px;
    color: var(--color-neutral-600);
    font-variant-numeric: tabular-nums;
    text-transform: uppercase;
  }
  .remove,
  .builtin {
    width: 54px;
    flex: none;
    text-align: right;
    font-size: 10.5px;
    color: var(--color-neutral-600);
  }
  .remove {
    border: none;
    background: transparent;
    font-size: 12px;
    cursor: pointer;
  }
  .remove:hover {
    color: #e07b7b;
  }
</style>
