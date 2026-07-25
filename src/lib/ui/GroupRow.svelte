<script lang="ts">
  // Group row: caret toggles collapse; whole-row highlight = drop INTO the
  // group (appended + auto-expanded); inline rename in place.
  import type { Group } from "$lib/core/types";
  import { dropTodoIntoGroup, toggleGroupAction } from "$lib/state/actions";
  import { openContextMenu } from "$lib/state/menus";
  import { groupMenuItems } from "$lib/state/menus-lists";
  import { ui } from "$lib/state/ui.svelte";
  import InlineRename from "./InlineRename.svelte";

  let {
    group, depth, count, open, paneIndex,
  }: { group: Group; depth: number; count: number; open: boolean; paneIndex: number } = $props();

  const dropKey = $derived(`${paneIndex}_${group.id}`);
  const dropInto = $derived(ui.drop?.key === dropKey);
  const renaming = $derived(
    ui.renaming?.type === "group" && ui.renaming.id === group.id && ui.renaming.paneIndex === paneIndex,
  );

  function onDragOver(e: DragEvent): void {
    if (ui.drag?.type !== "todo") return;
    e.preventDefault();
    e.stopPropagation();
    if (ui.drop?.key !== dropKey) ui.drop = { key: dropKey, pos: "into" };
  }

  function onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const drag = ui.drag;
    if (drag?.type !== "todo") return;
    dropTodoIntoGroup(drag.id, group.id);
  }
</script>

{#if renaming}
  <InlineRename indent={10 + depth * 16} />
{:else}
  <div
    class="group-row"
    class:drop-into={dropInto}
    style:padding-left={`${10 + depth * 16}px`}
    role="button"
    tabindex="-1"
    onclick={() => toggleGroupAction(group.id)}
    onkeydown={() => {}}
    oncontextmenu={(e) => openContextMenu(e, groupMenuItems(group))}
    ondragover={onDragOver}
    ondragleave={() => { if (ui.drop?.key === dropKey) ui.drop = null; }}
    ondrop={onDrop}
  >
    <span class="caret">{open ? "▾" : "▸"}</span>
    <span class="emoji">{group.emoji}</span>
    <span class="name">{group.name}</span>
    <span class="count">{count}</span>
  </div>
{/if}

<style>
  .group-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 26px;
    padding: 1px 10px 1px;
    cursor: pointer;
  }
  .group-row:hover {
    background: color-mix(in srgb, var(--color-text) 5%, transparent);
  }
  .group-row.drop-into {
    background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  }
  .caret {
    font-size: 8px;
    width: 8px;
    color: var(--color-neutral-500);
  }
  .emoji {
    font-size: 12px;
    width: 16px;
    text-align: center;
  }
  .name {
    font-weight: 500;
    font-size: 12px;
    color: var(--color-neutral-300);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .count {
    font-size: 10px;
    color: var(--color-neutral-600);
    font-variant-numeric: tabular-nums;
  }
</style>
