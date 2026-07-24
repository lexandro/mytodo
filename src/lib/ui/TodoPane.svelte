<script lang="ts">
  // One pane: TabBar → QuickAdd → row list (pinned / tree / archived) →
  // empty state. The pane background is a drop target: dropping a todo from
  // another list moves it to this list's root.
  import { buildPaneRows } from "$lib/core/rows";
  import { moveTodoAction } from "$lib/state/actions";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";
  import EmptyState from "./EmptyState.svelte";
  import GroupRow from "./GroupRow.svelte";
  import QuickAdd from "./QuickAdd.svelte";
  import SectionRow from "./SectionRow.svelte";
  import TabBar from "./TabBar.svelte";
  import TodoRow from "./TodoRow.svelte";

  let { paneIndex }: { paneIndex: number } = $props();

  const pane = $derived(ui.panes[paneIndex]);
  const list = $derived(
    store.data.lists.find((l) => l.id === pane.listId) ?? store.data.lists[0],
  );
  const paneRows = $derived(
    list === undefined
      ? { rows: [], visibleTodoIds: [] }
      : buildPaneRows(store.data, {
          listId: list.id,
          archivedOpen: ui.archOpen[list.id] === true,
        }),
  );
  const isInbox = $derived(list?.fixed === true);

  function onBgDragOver(e: DragEvent): void {
    if (ui.drag !== null) e.preventDefault();
  }

  function onBgDrop(e: DragEvent): void {
    e.preventDefault();
    const drag = ui.drag;
    if (drag?.type !== "todo" || list === undefined) {
      ui.clearDragState();
      return;
    }
    const todo = store.data.todos.find((t) => t.id === drag.id);
    if (todo !== undefined && todo.listId !== list.id) {
      moveTodoAction(drag.id, list.id, null, `Moved to ${list.name}`);
    } else {
      ui.clearDragState();
    }
  }

  function toggleArchived(): void {
    if (list === undefined) return;
    ui.archOpen[list.id] = ui.archOpen[list.id] !== true;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="pane"
  onmousedown={() => (ui.activePane = paneIndex)}
  ondragover={onBgDragOver}
  ondrop={onBgDrop}
>
  <TabBar {paneIndex} activeListId={list?.id ?? null} />
  {#if list !== undefined}
    <QuickAdd {paneIndex} listName={list.name} />
    <div class="rows">
      {#each paneRows.rows as row (row.key)}
        {#if row.kind === "section"}
          <SectionRow
            label={row.label}
            count={row.count}
            toggleable={row.toggleable}
            open={row.open}
            ontoggle={row.toggleable ? toggleArchived : undefined}
          />
        {:else if row.kind === "group"}
          <GroupRow group={row.group} depth={row.depth} count={row.count} open={row.open} {paneIndex} />
        {:else}
          <TodoRow todo={row.todo} depth={row.depth} {paneIndex} />
        {/if}
      {/each}
      {#if paneRows.rows.length === 0}
        {#if isInbox}
          <EmptyState
            title="Inbox zero"
            body="Quick-captured todos land here until you file them into a list. Ctrl+Shift+Space captures from anywhere."
          />
        {:else}
          <EmptyState
            title="Nothing here yet"
            body="Type above and press Enter — capture takes seconds. Shift+Enter opens details right away."
          />
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .pane {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    border: 1px solid var(--color-divider);
    border-radius: 8px;
    background: var(--color-bg);
    overflow: hidden;
  }
  .rows {
    flex: 1;
    overflow-y: auto;
    padding: 2px 0 14px;
  }
</style>
