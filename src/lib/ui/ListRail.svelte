<script lang="ts">
  // Left rail (210px): LISTS header + rows, VIEWS section, Trash.
  // List rows drag-reorder; todos can be dropped on a row to move them.
  import { listOpenCount } from "$lib/core/rows";
  import { byOrder } from "$lib/core/ordering";
  import { newList, reorderListAction, moveTodoAction, switchList } from "$lib/state/actions";
  import { listMenuItems, openContextMenu } from "$lib/state/menus";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";
  import InlineRename from "./InlineRename.svelte";

  const lists = $derived([...store.data.lists].sort(byOrder));
  const trashCount = $derived(store.data.todos.filter((t) => t.trashed).length);
  const pinnedCount = $derived(
    store.data.todos.filter((t) => !t.trashed && (t.pinLocal || t.pinGlobal)).length,
  );
  const activeListId = $derived(ui.view === "main" ? ui.activePaneState.listId : null);

  function dropKey(listId: string): string {
    return `L${listId}`;
  }

  function onDragStart(e: DragEvent, listId: string): void {
    if (e.dataTransfer !== null) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", `list:${listId}`);
    }
    ui.drag = { type: "list", id: listId };
  }

  function onDragOver(e: DragEvent, listId: string): void {
    const drag = ui.drag;
    if (drag === null) return;
    let pos: "before" | "after" | "into";
    if (drag.type === "list") {
      if (drag.id === listId) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      pos = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
    } else {
      pos = "into";
    }
    e.preventDefault();
    const cur = ui.drop;
    if (cur === null || cur.key !== dropKey(listId) || cur.pos !== pos) {
      ui.drop = { key: dropKey(listId), pos };
    }
  }

  function onDrop(e: DragEvent, listId: string, listName: string): void {
    e.preventDefault();
    const drag = ui.drag;
    if (drag === null) return;
    if (drag.type === "todo") {
      moveTodoAction(drag.id, listId, null, `Moved to ${listName}`);
    } else {
      const pos = ui.drop?.key === dropKey(listId) ? ui.drop.pos : "after";
      reorderListAction(drag.id, listId, pos === "before" ? "before" : "after");
    }
  }

  function rowDropStyle(listId: string): string {
    const drop = ui.drop;
    if (drop === null || drop.key !== dropKey(listId)) return "";
    if (drop.pos === "before") return "box-shadow: inset 0 2px 0 var(--color-accent)";
    if (drop.pos === "after") return "box-shadow: inset 0 -2px 0 var(--color-accent)";
    return "";
  }
</script>

<nav class="rail">
  <div class="rail-header">
    <span class="rail-title">Lists</span>
    <button class="new-list" title="New list — Ctrl+Shift+N" onclick={() => newList()}>+</button>
  </div>

  {#each lists as list, index (list.id)}
    {#if ui.renaming?.type === "list" && ui.renaming.id === list.id}
      <InlineRename />
    {:else}
      <div
        class="row"
        class:active={list.id === activeListId}
        class:drop-into={ui.drop?.key === dropKey(list.id) && ui.drop.pos === "into"}
        style={rowDropStyle(list.id)}
        role="button"
        tabindex="-1"
        draggable="true"
        ondragstart={(e) => onDragStart(e, list.id)}
        ondragend={() => ui.clearDragState()}
        ondragover={(e) => onDragOver(e, list.id)}
        ondragleave={() => { if (ui.drop?.key === dropKey(list.id)) ui.drop = null; }}
        ondrop={(e) => onDrop(e, list.id, list.name)}
        onclick={() => switchList(list.id)}
        onkeydown={() => {}}
        oncontextmenu={(e) => openContextMenu(e, listMenuItems(list))}
      >
        <span class="emoji">{list.emoji}</span>
        <span class="name" class:muted={list.id !== activeListId}>{list.name}</span>
        <span class="count">{listOpenCount(store.data, list.id)}</span>
        <span class="kbd">{index < 9 ? index + 1 : ""}</span>
      </div>
    {/if}
  {/each}

  <div class="spacer"></div>
  <div class="rail-section">Views</div>
  <div
    class="row"
    class:active={ui.view === "pinned"}
    role="button"
    tabindex="-1"
    onclick={() => (ui.view = "pinned")}
    onkeydown={() => {}}
  >
    <span class="emoji pin-icon">📌</span>
    <span class="name">Pinned todos</span>
    <span class="count">{pinnedCount}</span>
  </div>
  <div
    class="row"
    class:active={ui.view === "trash"}
    role="button"
    tabindex="-1"
    onclick={() => (ui.view = "trash")}
    onkeydown={() => {}}
  >
    <span class="emoji">🗑️</span>
    <span class="name">Trash</span>
    <span class="count">{trashCount}</span>
  </div>
</nav>

<style>
  .rail {
    width: 210px;
    flex: none;
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border-right: 1px solid var(--color-divider);
    padding: 8px 6px 6px;
    gap: 1px;
    overflow-y: auto;
    user-select: none;
  }
  .rail-header {
    display: flex;
    align-items: center;
    padding: 2px 8px 6px;
  }
  .rail-title,
  .rail-section {
    font-size: 10px;
    letter-spacing: 0.09em;
    color: var(--color-neutral-600);
    text-transform: uppercase;
  }
  .rail-title {
    flex: 1;
  }
  .rail-section {
    padding: 6px 8px 4px;
  }
  .new-list {
    background: transparent;
    border: none;
    color: var(--color-neutral-400);
    width: 20px;
    height: 20px;
    font-size: 13px;
    cursor: pointer;
    border-radius: 5px;
  }
  .new-list:hover {
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-text) 8%, transparent);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 6px;
    cursor: pointer;
  }
  .row:hover {
    background: color-mix(in srgb, var(--color-text) 6%, transparent);
  }
  .row.active {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  }
  .row.drop-into {
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  }
  .emoji {
    width: 18px;
    text-align: center;
    font-size: 13px;
    flex: none;
  }
  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12.5px;
  }
  .name.muted {
    color: var(--color-neutral-400);
  }
  .count {
    font-size: 10px;
    color: var(--color-neutral-500);
    font-variant-numeric: tabular-nums;
  }
  .kbd {
    font-size: 9px;
    color: var(--color-neutral-700);
    font-variant-numeric: tabular-nums;
    width: 10px;
    text-align: right;
  }
</style>
