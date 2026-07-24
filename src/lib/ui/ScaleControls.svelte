<script lang="ts">
  // "%": UI-scale chips (80–150) + todo-text-size stepper + Ctrl+wheel hint.
  import { TODO_FS_MAX, TODO_FS_MIN, UI_SCALES } from "$lib/state/settings-sync.svelte";
  import { ui } from "$lib/state/ui.svelte";

  function onWindowMousedown(e: MouseEvent): void {
    if (!ui.scalePopOpen) return;
    const target = e.target;
    if (target instanceof HTMLElement && target.closest(".scale-slot") !== null) return;
    ui.scalePopOpen = false;
  }
</script>

<svelte:window onmousedown={onWindowMousedown} />

<div class="scale-slot">
  <button
    class="scale-btn"
    title="UI scale & text size"
    onclick={() => (ui.scalePopOpen = !ui.scalePopOpen)}
  >
    {ui.uiScale}%
  </button>
  {#if ui.scalePopOpen}
    <div class="popover">
      <span class="pop-label">UI scale</span>
      <div class="chips">
        {#each UI_SCALES as scale (scale)}
          <button
            class="chip"
            class:active={ui.uiScale === scale}
            onclick={() => (ui.uiScale = scale)}
          >
            {scale}%
          </button>
        {/each}
      </div>
      <span class="pop-label">Todo text size</span>
      <div class="stepper">
        <button
          class="step"
          onclick={() => (ui.todoFs = Math.max(TODO_FS_MIN, ui.todoFs - 1))}
        >A−</button>
        <span class="fs-label">{ui.todoFs}px</span>
        <button
          class="step"
          onclick={() => (ui.todoFs = Math.min(TODO_FS_MAX, ui.todoFs + 1))}
        >A+</button>
      </div>
      <span class="hint">Ctrl + mouse wheel also resizes todo text</span>
    </div>
  {/if}
</div>

<style>
  .scale-slot {
    position: relative;
  }
  .scale-btn {
    background: transparent;
    border: 1px solid var(--color-divider);
    color: inherit;
    font: inherit;
    font-size: 11px;
    height: 26px;
    padding: 0 9px;
    cursor: pointer;
    border-radius: 6px;
    font-variant-numeric: tabular-nums;
    margin-left: 4px;
  }
  .scale-btn:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
  .popover {
    position: absolute;
    top: 32px;
    right: 0;
    z-index: 50;
    width: 210px;
    background: var(--color-surface);
    border-radius: 8px;
    box-shadow: var(--shadow-md);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pop-label {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-neutral-500);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .chip {
    border: 1px solid var(--color-divider);
    color: inherit;
    background: transparent;
    font: inherit;
    font-size: 11px;
    padding: 3px 7px;
    border-radius: 5px;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
  }
  .chip:hover {
    border-color: var(--color-accent);
  }
  .chip.active {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .step {
    border: 1px solid var(--color-divider);
    background: transparent;
    color: inherit;
    width: 26px;
    height: 24px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 12px;
  }
  .step:hover {
    border-color: var(--color-accent);
  }
  .fs-label {
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
    flex: 1;
    text-align: center;
  }
  .hint {
    font-size: 10px;
    color: var(--color-neutral-600);
  }
</style>
