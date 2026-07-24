<script lang="ts">
  // Accent-tinted strip under the title bar — only when global pins exist,
  // main view only. Chips navigate home; collapsible to its label.
  import { locationPath } from "$lib/core/activity";
  import { labelColor } from "$lib/core/labels";
  import { byOrder } from "$lib/core/ordering";
  import { navigateHome } from "$lib/state/actions-views";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";

  const pins = $derived(
    store.data.todos.filter((t) => t.pinGlobal && !t.trashed).sort(byOrder),
  );

  function listName(listId: string): string {
    return store.data.lists.find((l) => l.id === listId)?.name ?? "?";
  }
</script>

{#if ui.view === "main" && pins.length > 0}
  <div class="strip mt-hscroll">
    <button class="toggle" onclick={() => (ui.pinsOpen = !ui.pinsOpen)}>
      <span class="caret">{ui.pinsOpen ? "▾" : "▸"}</span>
      <span class="pin-glyph">📌</span>
      <span>Global</span>
      <span class="count">{pins.length}</span>
    </button>
    {#if ui.pinsOpen}
      {#each pins as todo (todo.id)}
        <button
          class="chip"
          title={locationPath(store.data, todo.listId, todo.groupId)}
          onclick={() => navigateHome(todo.id)}
        >
          <span
            class="dot"
            style:background={labelColor(store.data, todo.colorLabelId) ?? "var(--color-neutral-700)"}
          ></span>
          {#if todo.emoji !== ""}<span>{todo.emoji}</span>{/if}
          <span>{todo.title}</span>
          <span class="chip-list">{listName(todo.listId)}</span>
        </button>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .strip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-bottom: 1px solid var(--color-divider);
    background: color-mix(in srgb, var(--color-accent) 5%, var(--color-bg));
    min-height: 27px;
    flex: none;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .strip::-webkit-scrollbar {
    display: none;
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 5px;
    background: transparent;
    border: none;
    color: var(--color-accent);
    font: inherit;
    font-size: 9.5px;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    cursor: pointer;
    padding: 2px 4px;
    flex: none;
  }
  .caret {
    font-size: 8px;
  }
  .pin-glyph {
    font-size: 9px;
  }
  .count {
    opacity: 0.6;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--color-surface);
    border: 1px solid var(--color-divider);
    border-radius: 999px;
    color: inherit;
    font: inherit;
    font-size: 11.5px;
    padding: 2px 10px 2px 8px;
    cursor: pointer;
    white-space: nowrap;
    flex: none;
  }
  .chip:hover {
    border-color: var(--color-accent);
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex: none;
  }
  .chip-list {
    font-size: 9.5px;
    color: var(--color-neutral-500);
  }
</style>
