<script lang="ts">
  // Micro section header (Pinned / Archived); Archived toggles + counts.
  let {
    label, count, toggleable, open, ontoggle,
  }: {
    label: string;
    count: number;
    toggleable: boolean;
    open: boolean;
    ontoggle?: () => void;
  } = $props();
</script>

<div
  class="section"
  class:toggleable
  role={toggleable ? "button" : "separator"}
  tabindex="-1"
  onclick={() => ontoggle?.()}
  onkeydown={() => {}}
>
  <span class="caret">{toggleable ? (open ? "▾" : "▸") : ""}</span>
  <span>{label}</span>
  <span class="count">({count})</span>
</div>

<style>
  .section {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 11px 10px 4px;
    font-size: 9.5px;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--color-neutral-500);
    cursor: default;
    user-select: none;
  }
  .section.toggleable {
    cursor: pointer;
  }
  .caret {
    font-size: 8px;
    width: 8px;
  }
  .count {
    opacity: 0.65;
    font-variant-numeric: tabular-nums;
  }
</style>
