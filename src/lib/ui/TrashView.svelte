<script lang="ts">
  // Trash view: restore / delete permanently / empty trash (the app's one
  // confirmation dialog — recorded decision #2).
  import { locationPath } from "$lib/core/activity";
  import { byOrder } from "$lib/core/ordering";
  import {
    deletePermanentlyAction, emptyTrashAction, restoreTodoAction,
  } from "$lib/state/actions-views";
  import { store } from "$lib/state/store.svelte";
  import ConfirmDialog from "./ConfirmDialog.svelte";

  let confirmOpen = $state(false);
  const items = $derived(
    store.data.todos
      .filter((t) => t.trashed)
      .sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0) || byOrder(a, b)),
  );
</script>

<div class="view">
  <div class="head">
    <h4>Trash</h4>
    <span class="hint">deleted todos wait here — nothing is lost immediately</span>
    <div class="spacer"></div>
    {#if items.length > 0}
      <button class="btn btn-secondary empty-btn" onclick={() => (confirmOpen = true)}>
        Empty trash
      </button>
    {/if}
  </div>
  {#each items as todo (todo.id)}
    <div class="row">
      <span class="emoji">{todo.emoji}</span>
      <span class="title">{todo.title}</span>
      <span class="crumb">{locationPath(store.data, todo.listId, todo.groupId)}</span>
      <span class="spacer"></span>
      <button class="btn btn-ghost act" onclick={() => restoreTodoAction(todo.id)}>Restore</button>
      <button class="btn btn-ghost act danger" onclick={() => deletePermanentlyAction(todo.id)}>
        Delete permanently
      </button>
    </div>
  {/each}
  {#if items.length === 0}
    <div class="empty">Trash is empty.</div>
  {/if}
</div>

{#if confirmOpen}
  <ConfirmDialog
    title="Empty trash?"
    body={`Permanently delete ${items.length} todo${items.length === 1 ? "" : "s"}? Ctrl+Z can still undo this until you close the app.`}
    confirmLabel="Empty trash"
    onconfirm={() => {
      confirmOpen = false;
      emptyTrashAction();
    }}
    oncancel={() => (confirmOpen = false)}
  />
{/if}

<style>
  .view {
    flex: 1;
    overflow-y: auto;
    padding: 18px 22px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
  }
  .hint {
    font-size: 11px;
    color: var(--color-neutral-500);
  }
  .spacer {
    flex: 1;
  }
  .empty-btn {
    font-size: 12px;
    padding: 4px 10px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    padding: 2px 8px;
    border-radius: 6px;
  }
  .row:hover {
    background: color-mix(in srgb, var(--color-text) 5%, transparent);
  }
  .emoji {
    width: 18px;
    text-align: center;
    font-size: 12px;
  }
  .title {
    font-size: 12.5px;
    color: var(--color-neutral-400);
  }
  .crumb {
    font-size: 10.5px;
    color: var(--color-neutral-600);
  }
  .act {
    font-size: 11.5px;
    padding: 2px 6px;
  }
  .danger {
    color: #e07b7b;
  }
  .empty {
    padding: 48px 0;
    text-align: center;
    font-size: 12px;
    color: var(--color-neutral-600);
  }
</style>
