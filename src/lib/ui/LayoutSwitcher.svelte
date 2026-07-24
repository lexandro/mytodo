<script lang="ts">
  // Segmented 4-button layout switcher (single / 2v / 2h / 2×2).
  import { ui, type LayoutName } from "$lib/state/ui.svelte";

  const options: { value: LayoutName; title: string }[] = [
    { value: "1", title: "Single pane" },
    { value: "2v", title: "Split vertical" },
    { value: "2h", title: "Split horizontal" },
    { value: "4", title: "2 × 2 grid" },
  ];
</script>

<div class="switcher">
  {#each options as opt (opt.value)}
    <button
      class="seg-btn"
      class:active={ui.layout === opt.value}
      title={opt.title}
      onclick={() => (ui.layout = opt.value)}
    >
      <svg width="14" height="12" viewBox="0 0 14 12">
        <rect x="0.75" y="0.75" width="12.5" height="10.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.3" />
        {#if opt.value === "2v" || opt.value === "4"}
          <line x1="7" y1="1" x2="7" y2="11" stroke="currentColor" stroke-width="1.3" />
        {/if}
        {#if opt.value === "2h" || opt.value === "4"}
          <line x1="1" y1="6" x2="13" y2="6" stroke="currentColor" stroke-width="1.3" />
        {/if}
      </svg>
    </button>
  {/each}
</div>

<style>
  .switcher {
    display: flex;
    border: 1px solid var(--color-divider);
    border-radius: 6px;
    overflow: hidden;
  }
  .seg-btn {
    background: transparent;
    color: var(--color-neutral-400);
    border: none;
    width: 32px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .seg-btn + .seg-btn {
    border-left: 1px solid var(--color-divider);
  }
  .seg-btn:hover {
    background: color-mix(in srgb, var(--color-text) 8%, transparent);
  }
  .seg-btn.active {
    background: color-mix(in srgb, var(--color-accent) 14%, transparent);
    color: var(--color-accent);
  }
</style>
