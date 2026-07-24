<script lang="ts">
  // F1: keyboard map dialog — two-column action/shortcut grid (SHORTCUTS.md).
  import { ui } from "$lib/state/ui.svelte";

  const SHORTCUTS: [string, string][] = [
    ["New todo / focus quick add", "Ctrl+N"],
    ["Create todo", "Enter (quick add)"],
    ["Create + open details", "Shift+Enter"],
    ["Global quick add", "Ctrl+Shift+Space"],
    ["New list", "Ctrl+Shift+N"],
    ["Switch list / commands", "Ctrl+K"],
    ["Switch to list 1–9", "Ctrl+1…9"],
    ["Filter current list", "Ctrl+F"],
    ["Global search", "Ctrl+Shift+F"],
    ["Navigate todos", "↑ / ↓"],
    ["Open details", "Double-click / Shift+Enter"],
    ["Toggle Done", "Ctrl+Enter"],
    ["Pin / unpin to list", "Ctrl+P"],
    ["Rename selected", "F2"],
    ["Move up one level", "Alt+←"],
    ["Delete (to Trash)", "Delete"],
    ["Undo", "Ctrl+Z"],
    ["Todo text size", "Ctrl+MouseWheel"],
    ["AI panel (todo / list)", "Ctrl+Shift+A"],
    ["Summon workspace", "Ctrl+Alt+T (global)"],
    ["Close popup / panel", "Esc"],
  ];
</script>

{#if ui.shortcutsOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="dialog-backdrop" onclick={(e) => { if (e.target === e.currentTarget) ui.shortcutsOpen = false; }}>
    <div class="dialog sheet">
      <span class="dialog-title k-title">Keyboard shortcuts</span>
      <div class="grid">
        {#each SHORTCUTS as [action, keys] (action)}
          <span class="action">{action}</span>
          <span class="keys">{keys}</span>
        {/each}
      </div>
      <div class="dialog-actions">
        <button class="btn btn-primary" onclick={() => (ui.shortcutsOpen = false)}>Done</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sheet {
    width: min(560px, 100%);
  }
  .k-title {
    font-size: 16px;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto;
    gap: 4px 14px;
    font-size: 12px;
  }
  .action {
    color: var(--color-neutral-400);
  }
  .keys {
    font-variant-numeric: tabular-nums;
    color: var(--color-text);
    text-align: right;
  }
</style>
