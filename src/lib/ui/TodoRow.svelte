<script lang="ts">
  // One todo row: status circle (click cycles), emoji, title, G-tag, subtask
  // progress; 3px color stripe; drag source + before/after drop target.
  import { labelColor } from "$lib/core/labels";
  import type { Todo } from "$lib/core/types";
  import { cycleTodoStatus, openDetails, reorderTodoAction, selectTodo } from "$lib/state/actions";
  import { openContextMenu, todoMenuItems } from "$lib/state/menus";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";

  let { todo, depth, paneIndex }: { todo: Todo; depth: number; paneIndex: number } = $props();

  const selected = $derived(ui.selectedId === todo.id);
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
    if (e.dataTransfer !== null) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", todo.id);
    }
    ui.drag = { type: "todo", id: todo.id };
  }

  function onDragOver(e: DragEvent): void {
    const drag = ui.drag;
    if (drag === null || drag.type !== "todo" || drag.id === todo.id) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
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
    const pos = ui.drop?.key === dropKey && ui.drop.pos !== "into" ? ui.drop.pos : "after";
    reorderTodoAction(drag.id, todo.id, pos);
  }

  function onContextMenu(e: MouseEvent): void {
    selectTodo(todo.id, paneIndex);
    openContextMenu(e, todoMenuItems(todo));
  }
</script>

<div
  class="todo-row"
  class:selected
  class:drop-before={dropPos === "before"}
  class:drop-after={dropPos === "after"}
  style:padding-left={`${10 + depth * 16}px`}
  style:border-left-color={stripe}
  role="button"
  tabindex="-1"
  draggable="true"
  ondragstart={onDragStart}
  ondragend={() => ui.clearDragState()}
  ondragover={onDragOver}
  ondrop={onDrop}
  onclick={() => selectTodo(todo.id, paneIndex)}
  ondblclick={() => openDetails(todo.id, paneIndex)}
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
  <span class="title" class:struck style:opacity>{todo.title}</span>
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
