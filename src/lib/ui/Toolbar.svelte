<script lang="ts">
  // Classic Windows toolbar under the title bar: the actions you reach for
  // constantly on the selected todo, one click instead of a menu. Everything
  // here also has a shortcut and a menu entry — the toolbar adds no power,
  // only reach. Hidden from View → Toolbar.
  import { indentCheck } from "$lib/core/todo-tree";
  import { findTodo } from "$lib/core/todos-ops";
  import { toggleSelectedDone, trashTodoAction, undoAction } from "$lib/state/actions";
  import { togglePinAction } from "$lib/state/actions-detail";
  import { indentTodoAction, outdentTodoAction } from "$lib/state/actions-tree";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";
  import { TOOLBAR_ICONS, type ToolbarIconName } from "./toolbar-icons";

  interface ToolbarButton {
    kind: "button";
    icon: ToolbarIconName;
    title: string;
    disabled: boolean;
    /** Pressed look while the state this button toggles is on. */
    active?: boolean;
    danger?: boolean;
    action: () => void;
  }
  type ToolbarEntry = ToolbarButton | { kind: "separator" };

  const selected = $derived(
    ui.selectedId === null ? undefined : findTodo(store.data, ui.selectedId),
  );
  const indent = $derived(
    selected === undefined ? null : indentCheck(store.data, selected.id),
  );

  const entries = $derived<ToolbarEntry[]>([
    {
      kind: "button", icon: "undo", title: "Undo — Ctrl+Z",
      disabled: !store.canUndo, action: undoAction,
    },
    { kind: "separator" },
    {
      kind: "button", icon: "indent",
      title: indent?.ok === false && indent.reason === "too-deep"
        ? "Make sub-item — already 3 levels deep"
        : "Make sub-item of the todo above — Tab",
      disabled: indent?.ok !== true,
      action: () => selected !== undefined && indentTodoAction(selected.id),
    },
    {
      kind: "button", icon: "outdent", title: "Lift out one level — Shift+Tab",
      disabled: selected === undefined || selected.parentId === null,
      action: () => selected !== undefined && outdentTodoAction(selected.id),
    },
    { kind: "separator" },
    {
      kind: "button", icon: "done",
      title: selected?.status === "done" ? "Reopen — Ctrl+Enter" : "Mark done — Ctrl+Enter",
      disabled: selected === undefined, active: selected?.status === "done",
      action: toggleSelectedDone,
    },
    {
      kind: "button", icon: "pin",
      title: selected?.pinLocal === true ? "Unpin from list — Ctrl+P" : "Pin to list — Ctrl+P",
      disabled: selected === undefined, active: selected?.pinLocal === true,
      action: () => selected !== undefined && togglePinAction(selected.id, "local"),
    },
    { kind: "separator" },
    {
      kind: "button", icon: "delete", title: "Move to Trash — Delete",
      disabled: selected === undefined, danger: true,
      action: () => selected !== undefined && trashTodoAction(selected.id),
    },
  ]);
</script>

{#if ui.toolbarOpen && ui.view === "main"}
  <div class="toolbar">
    {#each entries as entry, i (i)}
      {#if entry.kind === "separator"}
        <span class="sep"></span>
      {:else}
        <button
          class="tb-btn"
          class:active={entry.active === true}
          class:danger={entry.danger === true}
          title={entry.title}
          disabled={entry.disabled}
          onclick={entry.action}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            {#each TOOLBAR_ICONS[entry.icon] as d (d)}
              <path
                {d}
                fill="none"
                stroke="currentColor"
                stroke-width="1.3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            {/each}
          </svg>
        </button>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .toolbar {
    flex: none;
    display: flex;
    align-items: center;
    gap: 1px;
    height: 30px;
    padding: 0 6px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-divider);
    user-select: none;
  }
  .tb-btn {
    width: 28px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--color-neutral-400);
    cursor: pointer;
  }
  .tb-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-text) 8%, transparent);
    color: var(--color-accent);
  }
  .tb-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .tb-btn.active {
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  }
  .tb-btn.danger:hover:not(:disabled) {
    color: #e05c4b;
    background: color-mix(in srgb, #e05c4b 14%, transparent);
  }
  .sep {
    width: 1px;
    height: 16px;
    margin: 0 5px;
    background: var(--color-divider);
  }
</style>
