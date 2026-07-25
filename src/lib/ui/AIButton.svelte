<script lang="ts">
  // ✦ AI title-bar button. No dropdown: it opens the AI side panel for the
  // active list (and the selected todo when there is one), where the user
  // picks a preset task or just types into the console.
  import { closeAiPanel, openAiPanelForSelection } from "$lib/state/ai-actions";
  import { ui } from "$lib/state/ui.svelte";

  const open = $derived(ui.aiPanel !== null);

  function toggle(): void {
    if (open) closeAiPanel();
    else openAiPanelForSelection();
  }
</script>

<button
  class="ai-btn"
  class:open
  title="AI panel — Ctrl+Shift+A"
  onclick={toggle}
>
  <span class="sparkle">✦</span>
  <span>AI</span>
</button>

<style>
  .ai-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    border: none;
    background: transparent;
    color: var(--color-neutral-400);
    font: inherit;
    font-size: 11.5px;
    padding: 4px 9px;
    border-radius: 6px;
    cursor: pointer;
    margin-left: 4px;
  }
  .ai-btn:hover,
  .ai-btn.open {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
  }
  .sparkle {
    font-size: 11px;
    color: var(--color-accent);
  }
</style>
