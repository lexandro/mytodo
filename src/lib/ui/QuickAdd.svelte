<script lang="ts">
  // Always-visible quick add: Enter creates, Shift+Enter creates + opens
  // details, focus stays, input clears (the primary capture workflow).
  import { quickAdd } from "$lib/state/actions";
  import { ui } from "$lib/state/ui.svelte";

  let { paneIndex, listName }: { paneIndex: number; listName: string } = $props();

  function register(el: HTMLInputElement): { destroy: () => void } {
    ui.quickAddEls[paneIndex] = el;
    return {
      destroy: () => {
        if (ui.quickAddEls[paneIndex] === el) ui.quickAddEls[paneIndex] = null;
      },
    };
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key !== "Enter") return;
    quickAdd(paneIndex, ui.panes[paneIndex].quickDraft, e.shiftKey);
  }
</script>

<div class="quick-add">
  <input
    class="input qa-input"
    use:register
    placeholder={`+ Add to ${listName} — Enter saves, Shift+Enter opens details`}
    bind:value={ui.panes[paneIndex].quickDraft}
    onkeydown={onKeydown}
    onfocus={() => (ui.activePane = paneIndex)}
  />
  <button
    class="filter-toggle"
    class:active={ui.panes[paneIndex].filterOpen}
    title="Filter this list — Ctrl+F"
    onclick={() => {
      const open = !ui.panes[paneIndex].filterOpen;
      ui.updatePane(paneIndex, { filterOpen: open, filterText: "" });
    }}
  >
    <svg width="13" height="13" viewBox="0 0 14 14">
      <circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" stroke-width="1.4" />
      <line x1="9.2" y1="9.2" x2="12.8" y2="12.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
    </svg>
  </button>
</div>

<style>
  .quick-add {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 8px 4px;
    flex: none;
  }
  .qa-input {
    min-height: 30px;
    font-size: 12.5px;
  }
  .filter-toggle {
    background: transparent;
    border: 1px solid var(--color-divider);
    color: var(--color-neutral-400);
    width: 30px;
    height: 30px;
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 7px;
  }
  .filter-toggle:hover,
  .filter-toggle.active {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
</style>
