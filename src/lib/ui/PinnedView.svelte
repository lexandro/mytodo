<script lang="ts">
  // Pinned todos view: GLOBAL section first, then per-list local pins
  // (lists without pins omitted). Clicking a row navigates home.
  import { locationPath } from "$lib/core/activity";
  import { labelColor } from "$lib/core/labels";
  import { byOrder } from "$lib/core/ordering";
  import type { List, Todo } from "$lib/core/types";
  import { navigateHome } from "$lib/state/actions-views";
  import { store } from "$lib/state/store.svelte";

  interface Section {
    key: string;
    title: string;
    accent: boolean;
    items: Todo[];
  }

  const sections = $derived.by((): Section[] => {
    const live = store.data.todos.filter((t) => !t.trashed);
    const result: Section[] = [];
    const global = live.filter((t) => t.pinGlobal).sort(byOrder);
    if (global.length > 0) result.push({ key: "global", title: "Global", accent: true, items: global });
    for (const list of [...store.data.lists].sort(byOrder) as List[]) {
      const local = live.filter((t) => t.listId === list.id && t.pinLocal).sort(byOrder);
      if (local.length > 0) {
        result.push({
          key: list.id,
          title: list.emoji === "" ? list.name : `${list.emoji} ${list.name}`,
          accent: false,
          items: local,
        });
      }
    }
    return result;
  });

  function statusGlyph(todo: Todo): string {
    return todo.status === "done" ? "✓" : todo.status === "cancelled" ? "✕" : "";
  }
</script>

<div class="view">
  <div class="head">
    <h4>Pinned todos</h4>
    <span class="hint">click any todo to jump to its home</span>
  </div>
  {#each sections as section (section.key)}
    <div class="sec-label" class:accent={section.accent}>{section.title}</div>
    {#each section.items as todo (todo.id)}
      <button
        class="row"
        style:border-left-color={labelColor(store.data, todo.colorLabelId) ?? "transparent"}
        onclick={() => navigateHome(todo.id)}
      >
        <span class="circle" class:done={todo.status === "done"} class:progress={todo.status === "progress"}>
          {statusGlyph(todo)}
        </span>
        <span class="emoji">{todo.emoji}</span>
        <span class="title">{todo.title}</span>
        <span class="spacer"></span>
        <span class="crumb">{locationPath(store.data, todo.listId, todo.groupId)}</span>
        <span class="chev">›</span>
      </button>
    {/each}
  {/each}
  {#if sections.length === 0}
    <p class="empty">Nothing pinned yet — pin a todo from its context menu or details.</p>
  {/if}
</div>

<style>
  .view {
    flex: 1;
    overflow-y: auto;
    padding: 18px 22px;
  }
  .head {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 10px;
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
  .sec-label {
    font-size: 9.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-neutral-500);
    padding: 14px 0 5px;
  }
  .sec-label.accent {
    color: var(--color-accent);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 30px;
    padding: 2px 8px;
    border: none;
    border-left: 3px solid transparent;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    border-radius: 0 6px 6px 0;
    width: 100%;
    text-align: left;
  }
  .row:hover {
    background: color-mix(in srgb, var(--color-text) 5%, transparent);
  }
  .circle {
    width: 14px;
    height: 14px;
    flex: none;
    border-radius: 50%;
    border: 1.5px solid var(--color-neutral-600);
    color: var(--color-accent-100);
    font-size: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .circle.progress {
    border-color: var(--color-accent);
    background: linear-gradient(90deg, var(--color-accent) 0 50%, transparent 50%);
  }
  .circle.done {
    border-color: var(--color-accent-600);
    background: var(--color-accent-600);
  }
  .emoji {
    width: 18px;
    text-align: center;
    font-size: 12px;
  }
  .title {
    font-size: 12.5px;
  }
  .spacer {
    flex: 1;
  }
  .crumb {
    font-size: 10.5px;
    color: var(--color-neutral-500);
  }
  .chev {
    font-size: 9px;
    color: var(--color-neutral-600);
  }
  .empty {
    font-size: 12px;
    color: var(--color-neutral-600);
    padding: 24px 0;
  }
</style>
