<script lang="ts">
  // Detail panel (320px right column): Details | Activity tabs + breadcrumb.
  // All edits autosave — there is no Save button anywhere.
  import { locationPath } from "$lib/core/activity";
  import { findTodo } from "$lib/core/todos-ops";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";
  import ActivityList from "./ActivityList.svelte";
  import DetailForm from "./DetailForm.svelte";

  const todo = $derived(ui.selectedId !== null ? findTodo(store.data, ui.selectedId) : undefined);
  const crumb = $derived(todo === undefined ? "" : locationPath(store.data, todo.listId, todo.groupId));
</script>

{#if ui.detailOpen && todo !== undefined}
  <aside class="detail">
    <header class="detail-header">
      <button
        class="tab"
        class:active={ui.detailTab === "details"}
        onclick={() => (ui.detailTab = "details")}
      >
        Details
      </button>
      <button
        class="tab"
        class:active={ui.detailTab === "activity"}
        onclick={() => (ui.detailTab = "activity")}
      >
        Activity
      </button>
      <div class="spacer"></div>
      <span class="crumb" title={crumb}>{crumb}</span>
      <button class="close" title="Close — Esc" onclick={() => (ui.detailOpen = false)}>✕</button>
    </header>
    <div class="body">
      {#if ui.detailTab === "details"}
        <DetailForm {todo} />
      {:else}
        <ActivityList todoId={todo.id} />
      {/if}
    </div>
  </aside>
{/if}

<style>
  .detail {
    width: 320px;
    flex: none;
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--color-divider);
    background: var(--color-surface);
    min-height: 0;
  }
  .detail-header {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 8px 8px 0;
    border-bottom: 1px solid var(--color-divider);
    flex: none;
  }
  .tab {
    border: none;
    background: transparent;
    color: var(--color-neutral-400);
    font: inherit;
    font-size: 12.5px;
    padding: 5px 10px 8px;
    cursor: pointer;
  }
  .tab.active {
    color: var(--color-accent);
    box-shadow: inset 0 -2px 0 var(--color-accent);
  }
  .spacer {
    flex: 1;
  }
  .crumb {
    font-size: 10px;
    color: var(--color-neutral-600);
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .close {
    border: none;
    background: transparent;
    color: var(--color-neutral-500);
    font-size: 12px;
    width: 24px;
    height: 24px;
    cursor: pointer;
    border-radius: 5px;
  }
  .close:hover {
    background: color-mix(in srgb, var(--color-text) 8%, transparent);
    color: inherit;
  }
  .body {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 13px;
  }
</style>
