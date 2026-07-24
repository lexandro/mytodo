<script lang="ts">
  // Location: dropdown of list root + the current list's indented group
  // tree, plus "move up one level" (Alt+←).
  import { groupDepth } from "$lib/core/groups-ops";
  import { byOrder } from "$lib/core/ordering";
  import type { Group, Todo } from "$lib/core/types";
  import { moveTodoAction } from "$lib/state/actions";
  import { moveUpOneLevel } from "$lib/state/menus";
  import { store } from "$lib/state/store.svelte";

  let { todo }: { todo: Todo } = $props();

  interface LocationOption {
    value: string;
    label: string;
  }

  const ROOT = "__root__";

  const options = $derived.by((): LocationOption[] => {
    const list = store.data.lists.find((l) => l.id === todo.listId);
    const result: LocationOption[] = [{ value: ROOT, label: `${list?.name ?? "?"} (list root)` }];
    const walk = (parentId: string | null): void => {
      const children = store.data.groups
        .filter((g: Group) => g.listId === todo.listId && g.parentId === parentId)
        .sort(byOrder);
      for (const group of children) {
        const depth = groupDepth(store.data, group.id);
        result.push({ value: group.id, label: `${"  ".repeat(depth)}${group.name}` });
        walk(group.id);
      }
    };
    walk(null);
    return result;
  });

  function onChange(e: Event): void {
    const value = (e.currentTarget as HTMLSelectElement).value;
    moveTodoAction(todo.id, todo.listId, value === ROOT ? null : value, "Moved");
  }
</script>

<div class="field">
  <span class="label">Location</span>
  <div class="row">
    <select class="input select" value={todo.groupId ?? ROOT} onchange={onChange}>
      {#each options as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
    <button
      class="up"
      title="Move up one level — Alt+←"
      disabled={todo.groupId === null}
      onclick={() => moveUpOneLevel(todo)}
    >
      ↑
    </button>
  </div>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .label {
    font-size: 12px;
    color: color-mix(in srgb, var(--color-text) 70%, transparent);
  }
  .row {
    display: flex;
    gap: 5px;
    align-items: center;
  }
  .select {
    min-height: 28px;
    font-size: 12px;
    flex: 1;
  }
  .up {
    border: 1px solid var(--color-divider);
    background: transparent;
    color: var(--color-neutral-400);
    width: 28px;
    height: 28px;
    flex: none;
    border-radius: 6px;
    cursor: pointer;
  }
  .up:hover:not(:disabled) {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
  .up:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
