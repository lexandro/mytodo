<script lang="ts">
  // One todo row: status circle (click cycles), emoji, title, G-tag, subtask
  // progress; 3px color stripe; drag source + before/after drop target.
  // Double-click puts the title into an inline input (edit mode).
  import { dropZoneAt } from "$lib/core/drop-zone";
  import { labelColor } from "$lib/core/labels";
  import { canNest } from "$lib/core/todo-tree";
  import type { Todo } from "$lib/core/types";
  import { armRename, cycleTodoStatus, reorderTodoAction, selectTodo } from "$lib/state/actions";
  import { nestTodoAction } from "$lib/state/actions-tree";
  import { openContextMenu, todoMenuItems } from "$lib/state/menus";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";
  import InlineRename from "./InlineRename.svelte";

  let { todo, depth, paneIndex }: { todo: Todo; depth: number; paneIndex: number } = $props();

  const selected = $derived(ui.selectedId === todo.id);
  const draggedId = $derived(ui.drag?.type === "todo" ? ui.drag.id : null);
  // lazily evaluated: only the row actually being hovered asks
  const nestable = $derived(draggedId !== null && canNest(store.data, draggedId, todo.id));
  const editing = $derived(
    ui.renaming?.type === "todo" && ui.renaming.id === todo.id && ui.renaming.paneIndex === paneIndex,
  );
  const stripe = $derived(labelColor(store.data, todo.colorLabelId) ?? "transparent");
  const subtasks = $derived(store.data.subtasks.filter((s) => s.todoId === todo.id));
  const subDone = $derived(subtasks.filter((s) => s.checked).length);
  const dropKey = $derived(`${paneIndex}_${todo.id}`);
  const dropPos = $derived(ui.drop?.key === dropKey ? ui.drop.pos : null);

  interface StatusMeta {
    border: string;
    bg: string;
    glyph: string;
    fg: string;
    title: string;
  }
  const STATUS_META: Record<Todo["status"], StatusMeta> = {
    open: { border: "var(--color-neutral-600)", bg: "transparent", glyph: "", fg: "transparent", title: "Open — click to start" },
    progress: { border: "var(--color-accent)", bg: "linear-gradient(90deg,var(--color-accent) 0 50%,transparent 50%)", glyph: "", fg: "transparent", title: "In progress — click to complete" },
    done: { border: "var(--color-accent-600)", bg: "var(--color-accent-600)", glyph: "✓", fg: "var(--color-accent-100)", title: "Done — click to reopen" },
    cancelled: { border: "var(--color-neutral-700)", bg: "transparent", glyph: "✕", fg: "var(--color-neutral-500)", title: "Cancelled" },
  };
  const meta = $derived(STATUS_META[todo.status]);
  const struck = $derived(todo.status === "done" || todo.status === "cancelled");
  const opacity = $derived(todo.status === "done" ? 0.55 : todo.status === "cancelled" ? 0.45 : 1);

  function onDragStart(e: DragEvent): void {
    // dragging selected text inside the rename input bubbles up here — that is
    // a text drag, not a row drag
    if (editing) {
      e.preventDefault();
      return;
    }
    if (e.dataTransfer !== null) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", todo.id);
    }
    ui.drag = { type: "todo", id: todo.id };
  }

  /**
   * Three zones (core/drop-zone.ts): the wide middle makes the dragged todo a
   * sub-item of this row, the thin edges put it between two rows. A row that
   * cannot take the drop as a child keeps the plain before/after split.
   */
  function onDragOver(e: DragEvent): void {
    const drag = ui.drag;
    if (drag === null || drag.type !== "todo" || drag.id === todo.id) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos = dropZoneAt(e.clientY - rect.top, rect.height, nestable);
    if (ui.drop?.key !== dropKey || ui.drop.pos !== pos) ui.drop = { key: dropKey, pos };
  }

  function onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const drag = ui.drag;
    if (drag === null || drag.type !== "todo" || drag.id === todo.id) {
      ui.clearDragState();
      return;
    }
    const pos = ui.drop?.key === dropKey ? ui.drop.pos : "after";
    if (pos === "into") nestTodoAction(drag.id, todo.id);
    else reorderTodoAction(drag.id, todo.id, pos);
  }

  function onContextMenu(e: MouseEvent): void {
    selectTodo(todo.id, paneIndex);
    openContextMenu(e, todoMenuItems(todo));
  }

  /** Double-click on the row = edit the title in place. */
  function onDblClick(): void {
    if (editing) return; // a double-click inside the input just selects a word
    armRename("todo", todo.id);
  }
</script>

<div
  class="todo-row"
  class:selected
  class:drop-before={dropPos === "before"}
  class:drop-after={dropPos === "after"}
  class:drop-into={dropPos === "into"}
  style:padding-left={`${10 + depth * 16}px`}
  style:border-left-color={stripe}
  role="button"
  tabindex="-1"
  draggable={!editing}
  ondragstart={onDragStart}
  ondragend={() => ui.clearDragState()}
  ondragover={onDragOver}
  ondragleave={() => { if (ui.drop?.key === dropKey) ui.drop = null; }}
  ondrop={onDrop}
  onclick={() => selectTodo(todo.id, paneIndex)}
  ondblclick={onDblClick}
  onkeydown={() => {}}
  oncontextmenu={onContextMenu}
>
  <button
    class="status"
    title={meta.title}
    style:border-color={meta.border}
    style:background={meta.bg}
    style:color={meta.fg}
    onclick={(e) => {
      e.stopPropagation();
      cycleTodoStatus(todo.id);
    }}
  >
    <span>{meta.glyph}</span>
  </button>
  <span class="emoji">{todo.emoji}</span>
  {#if editing}
    <InlineRename fill />
  {:else}
    <span class="title" class:struck style:opacity>{todo.title}</span>
  {/if}
  {#if todo.pinGlobal}
    <span class="tag tag-accent gtag" title="Pinned globally">G</span>
  {/if}
  {#if subtasks.length > 0}
    <span class="subcount">{subDone}/{subtasks.length}</span>
  {/if}
</div>

<style>
  .todo-row {
    display: flex;
    align-items: center;
    gap: 7px;
    min-height: var(--rowh, 30px);
    padding: 2px 10px 2px;
    cursor: default;
    border-left: 3px solid transparent;
  }
  .todo-row:hover {
    background: color-mix(in srgb, var(--color-text) 5%, transparent);
  }
  .todo-row.selected,
  .todo-row.selected:hover {
    background: color-mix(in srgb, var(--color-accent) 13%, transparent);
  }
  .todo-row.drop-before {
    box-shadow: inset 0 2px 0 var(--color-accent);
  }
  .todo-row.drop-after {
    box-shadow: inset 0 -2px 0 var(--color-accent);
  }
  /* whole-row highlight = the drop becomes a sub-item of this row */
  .todo-row.drop-into {
    background: color-mix(in srgb, var(--color-accent) 16%, transparent);
    box-shadow: inset 0 0 0 1px var(--color-accent);
  }
  .status {
    width: 15px;
    height: 15px;
    flex: none;
    border-radius: 50%;
    border: 1.5px solid;
    font-size: 9px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    line-height: 1;
  }
  .emoji {
    flex: none;
    font-size: 12.5px;
    width: 18px;
    text-align: center;
  }
  .title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--tfs, 13px);
  }
  .title.struck {
    text-decoration: line-through;
  }
  .gtag {
    padding: 0 6px;
    font-size: 8.5px;
    flex: none;
  }
  .subcount {
    flex: none;
    font-size: 10px;
    color: var(--color-neutral-500);
    font-variant-numeric: tabular-nums;
  }
</style>
