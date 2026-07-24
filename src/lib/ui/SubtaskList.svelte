<script lang="ts">
  // Subtasks in the detail panel: progress bar, checkbox rows, add input.
  import { byOrder } from "$lib/core/ordering";
  import {
    addSubtaskAction, removeSubtaskAction, toggleSubtaskAction,
  } from "$lib/state/actions-detail";
  import { store } from "$lib/state/store.svelte";

  let { todoId }: { todoId: string } = $props();

  let draft = $state("");
  const subtasks = $derived(
    store.data.subtasks.filter((s) => s.todoId === todoId).sort(byOrder),
  );
  const done = $derived(subtasks.filter((s) => s.checked).length);
  const pct = $derived(subtasks.length === 0 ? 0 : Math.round((done / subtasks.length) * 100));

  function onAddKeydown(e: KeyboardEvent): void {
    if (e.key !== "Enter") return;
    if (addSubtaskAction(todoId, draft)) draft = "";
  }
</script>

<div class="field">
  <span class="label">
    Subtasks {subtasks.length > 0 ? `${done}/${subtasks.length}` : ""}
  </span>
  {#if subtasks.length > 0}
    <div class="progress">
      <div class="bar" style:width={`${pct}%`}></div>
    </div>
  {/if}
  {#each subtasks as subtask (subtask.id)}
    <div class="row">
      <button
        class="check"
        class:checked={subtask.checked}
        aria-label={subtask.checked ? "Reopen subtask" : "Complete subtask"}
        onclick={() => toggleSubtaskAction(subtask.id)}
      >
        {subtask.checked ? "✓" : ""}
      </button>
      <span class="text" class:done-text={subtask.checked}>{subtask.text}</span>
      <button class="remove" aria-label="Remove subtask" onclick={() => removeSubtaskAction(subtask.id)}>✕</button>
    </div>
  {/each}
  <input
    class="input add"
    placeholder="+ add subtask, Enter"
    bind:value={draft}
    onkeydown={onAddKeydown}
  />
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .label {
    font-size: 12px;
    color: color-mix(in srgb, var(--color-text) 70%, transparent);
    margin-bottom: 3px;
  }
  .progress {
    height: 2px;
    background: var(--color-neutral-900);
    border-radius: 2px;
    margin: 2px 0 7px;
    overflow: hidden;
  }
  .bar {
    height: 100%;
    background: var(--color-accent-600);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 24px;
  }
  .check {
    width: 13px;
    height: 13px;
    flex: none;
    border-radius: 3.5px;
    border: 1.5px solid var(--color-neutral-600);
    background: transparent;
    color: var(--color-accent-100);
    font-size: 8px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .check.checked {
    border-color: var(--color-accent-600);
    background: var(--color-accent-600);
  }
  .text {
    flex: 1;
    font-size: 12px;
  }
  .done-text {
    text-decoration: line-through;
    opacity: 0.55;
  }
  .remove {
    border: none;
    background: transparent;
    color: var(--color-neutral-600);
    font-size: 10px;
    cursor: pointer;
    padding: 2px;
  }
  .remove:hover {
    color: #e07b7b;
  }
  .add {
    min-height: 26px;
    font-size: 11.5px;
    margin-top: 4px;
  }
</style>
