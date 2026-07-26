<script lang="ts">
  // One pane: TabBar → QuickAdd → row list (pinned / tree / archived) →
  // empty state. The pane background is a drop target: dropping a todo from
  // another list moves it to this list's root.
  import inboxWatermark from "$lib/assets/inbox-watermark.png";
  import { labelColor } from "$lib/core/labels";
  import { buildPaneRows } from "$lib/core/rows";
  import { todoMatches } from "$lib/core/search";
  import { moveTodoAction } from "$lib/state/actions";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";
  import EmptyState from "./EmptyState.svelte";
  import FilterBar from "./FilterBar.svelte";
  import GroupRow from "./GroupRow.svelte";
  import ListSelector from "./ListSelector.svelte";
  import QuickAdd from "./QuickAdd.svelte";
  import SectionRow from "./SectionRow.svelte";
  import TabBar from "./TabBar.svelte";
  import TodoRow from "./TodoRow.svelte";

  let { paneIndex, single = true }: { paneIndex: number; single?: boolean } = $props();

  const isActivePane = $derived(ui.activePane === paneIndex);

  const pane = $derived(ui.panes[paneIndex]);
  const list = $derived(
    store.data.lists.find((l) => l.id === pane.listId) ?? store.data.lists[0],
  );
  const filterQuery = $derived(pane.filterOpen ? pane.filterText.trim() : "");
  const paneRows = $derived(
    list === undefined
      ? { rows: [], visibleTodoIds: [] }
      : buildPaneRows(store.data, {
          listId: list.id,
          archivedOpen: ui.archOpen[list.id] === true,
          matches:
            filterQuery === ""
              ? undefined
              : (todo) => todoMatches(store.data, filterQuery, todo),
        }),
  );
  const isInbox = $derived(list?.fixed === true);
  const listColor = $derived(labelColor(store.data, list?.colorLabelId ?? null));

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
  class:active-pane={!single && isActivePane}
  onmousedown={() => (ui.activePane = paneIndex)}
  ondragover={onBgDragOver}
  ondrop={onBgDrop}
>
  {#if listColor !== null}
    <!-- the pane wears its list's color, so a split view says where you are -->
    <div class="pane-color" style:background={listColor}></div>
  {/if}
  {#if single}
    <TabBar {paneIndex} activeListId={list?.id ?? null} />
  {:else}
    <ListSelector {paneIndex} activeListId={list?.id ?? null} />
  {/if}
  {#if list !== undefined}
    <QuickAdd {paneIndex} listName={list.name} />
    {#if pane.filterOpen}
      <FilterBar {paneIndex} matchCount={paneRows.visibleTodoIds.length} />
    {/if}
    {#if isInbox}
      <!-- faint app-icon watermark — Inbox only, behind the rows -->
      <div class="inbox-watermark" style:background-image={`url(${inboxWatermark})`}></div>
    {/if}
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
          <TodoRow
            todo={row.todo}
            depth={row.depth}
            childCount={row.childCount}
            open={row.open}
            {paneIndex}
          />
        {/if}
      {/each}
      {#if paneRows.rows.length === 0}
        {#if filterQuery !== ""}
          <EmptyState
            title="No matches"
            body="Search is fuzzy and accent-insensitive — árvíztűrő matches ARVIZTURO. Try fewer letters."
          />
        {:else if isInbox}
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
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    border: 1px solid var(--color-divider);
    border-radius: 8px;
    background: var(--color-bg);
    overflow: hidden;
  }
  .pane.active-pane {
    border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
  }
  .pane-color {
    height: 3px;
    flex: none;
  }
  .inbox-watermark {
    position: absolute;
    inset: 0;
    background-repeat: no-repeat;
    background-position: center 58%;
    background-size: min(72%, 480px);
    opacity: 0.05;
    pointer-events: none;
  }
  :global([data-theme="light"]) .inbox-watermark {
    opacity: 0.09;
  }
  .rows {
    flex: 1;
    overflow-y: auto;
    padding: 2px 0 14px;
    position: relative;
  }
</style>
