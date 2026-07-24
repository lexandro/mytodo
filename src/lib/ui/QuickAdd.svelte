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
</style>
