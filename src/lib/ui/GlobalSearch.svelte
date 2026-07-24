<script lang="ts">
  // Global search dialog (Ctrl+Shift+F): all lists, archived included,
  // breadcrumbs, ↑↓ + Enter navigates to the todo's home.
  import { locationPath } from "$lib/core/activity";
  import { globalSearch } from "$lib/core/search";
  import type { Todo } from "$lib/core/types";
  import { navigateHome } from "$lib/state/actions-views";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";

  const results = $derived(
    ui.globalSearch === null ? [] : globalSearch(store.data, ui.globalSearch.query),
  );
  const activeIndex = $derived(
    ui.globalSearch === null
      ? 0
      : Math.max(0, Math.min(ui.globalSearch.index, results.length - 1)),
  );

  function autofocus(el: HTMLInputElement): void {
    el.focus();
  }

  function pick(todo: Todo): void {
    ui.globalSearch = null;
    navigateHome(todo.id);
  }

  function onKeydown(e: KeyboardEvent): void {
    if (ui.globalSearch === null) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      ui.globalSearch.index = Math.min(results.length - 1, activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      ui.globalSearch.index = Math.max(0, activeIndex - 1);
    } else if (e.key === "Enter" && results[activeIndex] !== undefined) {
      pick(results[activeIndex]);
    }
  }

  function statusGlyph(todo: Todo): string {
    return todo.status === "done" ? "✓" : todo.status === "cancelled" ? "✕" : "";
  }
</script>

{#if ui.globalSearch !== null}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="dialog-backdrop search-backdrop" onclick={(e) => { if (e.target === e.currentTarget) ui.globalSearch = null; }}>
    <div class="search-dialog">
      <div class="search-row">
        <svg width="14" height="14" viewBox="0 0 14 14" class="mag">
          <circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" stroke-width="1.4" />
          <line x1="9.2" y1="9.2" x2="12.8" y2="12.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        </svg>
        <input
          class="search-input"
          use:autofocus
          placeholder="Search every list…"
          bind:value={ui.globalSearch.query}
          oninput={() => { if (ui.globalSearch !== null) ui.globalSearch.index = 0; }}
          onkeydown={onKeydown}
        />
      </div>
      {#if results.length > 0}
        <div class="results">
          {#each results as todo, i (todo.id)}
            <button class="result" class:active={i === activeIndex} onclick={() => pick(todo)}>
              <span
                class="circle"
                class:done={todo.status === "done"}
                class:progress={todo.status === "progress"}
              >{statusGlyph(todo)}</span>
              <span class="emoji">{todo.emoji}</span>
              <span class="title">{todo.title}</span>
              <span class="crumb">{locationPath(store.data, todo.listId, todo.groupId)}</span>
            </button>
          {/each}
        </div>
      {/if}
      <div class="footer">
        <span>fuzzy + accent-insensitive</span>
        <span>Enter jumps to the todo</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .search-backdrop {
    align-items: start;
    padding-top: 12vh;
    display: flex;
    justify-content: center;
  }
  .search-dialog {
    width: min(540px, 92%);
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: dlg-in 0.12s ease;
  }
  @keyframes dlg-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  .search-row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 11px 13px;
    border-bottom: 1px solid var(--color-divider);
  }
  .mag {
    color: var(--color-neutral-500);
    flex: none;
  }
  .search-input {
    flex: 1;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 13.5px;
    outline: none;
    caret-color: var(--color-accent);
  }
  .results {
    max-height: 46vh;
    overflow-y: auto;
    padding: 4px;
    display: flex;
    flex-direction: column;
  }
  .result {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 9px;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
  }
  .result:hover {
    background: color-mix(in srgb, var(--color-text) 6%, transparent);
  }
  .result.active {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  }
  .circle {
    width: 13px;
    height: 13px;
    flex: none;
    border-radius: 50%;
    border: 1.5px solid var(--color-neutral-600);
    color: var(--color-accent-100);
    font-size: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .circle.progress {
    border-color: var(--color-accent);
    background: linear-gradient(90deg, var(--color-accent) 0 50%, transparent 50%);
  }
  .circle.done {
    border-color: var(--color-accent-600);
    background: var(--color-accent-600);
  }
  .emoji {
    width: 17px;
    text-align: center;
    font-size: 12px;
    flex: none;
  }
  .title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12.5px;
  }
  .crumb {
    font-size: 10.5px;
    color: var(--color-neutral-500);
    flex: none;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    padding: 7px 13px;
    border-top: 1px solid var(--color-divider);
    font-size: 10px;
    color: var(--color-neutral-600);
  }
</style>
