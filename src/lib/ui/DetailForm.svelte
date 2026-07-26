<script lang="ts">
  // Details tab: title, status pills, emoji + pins, location, color,
  // description with auto-detected links, subtasks, meta, action row.
  import { STATUS_LABEL } from "$lib/core/activity";
  import { detectLinks } from "$lib/core/links";
  import { formatTimestamp } from "$lib/core/time";
  import type { Todo, TodoStatus } from "$lib/core/types";
  import { setTodoStatus, trashTodoAction } from "$lib/state/actions";
  import {
    duplicateAction, openLink, renameTodoAction, setArchivedAction,
    setDescriptionAction, setEmojiAction, togglePinAction,
  } from "$lib/state/actions-detail";
  import { ui } from "$lib/state/ui.svelte";
  import DetailLocation from "./DetailLocation.svelte";
  import ColorPicker from "./ColorPicker.svelte";
  import SubtaskList from "./SubtaskList.svelte";

  let { todo }: { todo: Todo } = $props();

  // local drafts committed on blur/change (autosave, undo-able per edit)
  let titleDraft = $state("");
  let descDraft = $state("");
  let emojiDraft = $state("");
  // re-seed drafts when another todo is selected
  $effect(() => {
    titleDraft = todo.title;
    descDraft = todo.description;
    emojiDraft = todo.emoji;
  });

  const statuses: TodoStatus[] = ["open", "progress", "done", "cancelled"];
  const links = $derived(detectLinks(todo.description));

  // F2 bumps focusTitleTick → focus + select the title (SHORTCUTS.md)
  let titleEl = $state<HTMLTextAreaElement | null>(null);
  let seenTick = ui.focusTitleTick;
  $effect(() => {
    if (ui.focusTitleTick === seenTick) return;
    seenTick = ui.focusTitleTick;
    titleEl?.focus();
    titleEl?.select();
  });

  function pickStatus(status: TodoStatus): void {
    setTodoStatus(todo.id, status);
  }
</script>

<textarea
  class="input title"
  rows="2"
  bind:this={titleEl}
  bind:value={titleDraft}
  onblur={() => {
    renameTodoAction(todo.id, titleDraft);
    titleDraft = todo.title; // rejected (blank) edits reset to the real title
  }}
></textarea>

<div class="field">
  <span class="label">Status</span>
  <div class="pills">
    {#each statuses as status (status)}
      <button
        class="pill"
        class:active={todo.status === status}
        onclick={() => pickStatus(status)}
      >
        {STATUS_LABEL[status]}
      </button>
    {/each}
  </div>
</div>

<div class="pair">
  <div class="field emoji-field">
    <span class="label" title="Press Win + . for the Windows emoji picker">Emoji</span>
    <input
      class="input emoji-input"
      placeholder="Win + ."
      bind:value={emojiDraft}
      onblur={() => setEmojiAction(todo.id, emojiDraft)}
    />
  </div>
  <div class="field pin-field">
    <span class="label">Pin</span>
    <div class="pin-pair">
      <button
        class="pin-btn"
        class:active={todo.pinLocal}
        onclick={() => togglePinAction(todo.id, "local")}
      >
        List
      </button>
      <button
        class="pin-btn"
        class:active={todo.pinGlobal}
        onclick={() => togglePinAction(todo.id, "global")}
      >
        Global
      </button>
    </div>
  </div>
</div>

<DetailLocation {todo} />

<ColorPicker {todo} />

<div class="field">
  <span class="label">Description</span>
  <textarea
    class="input desc"
    rows="4"
    placeholder="Notes, links, file paths — plain text"
    bind:value={descDraft}
    onblur={() => setDescriptionAction(todo.id, descDraft)}
  ></textarea>
  {#if links.length > 0}
    <div class="links">
      {#each links as link (link.text)}
        <button class="link" onclick={() => void openLink(link.type, link.text)}>
          {link.type === "url" ? "↗" : "📁"}
          {link.text}
        </button>
      {/each}
    </div>
  {/if}
</div>

<SubtaskList todoId={todo.id} />

<div class="meta">
  Created {formatTimestamp(todo.createdAt, Date.now())} · Updated {formatTimestamp(todo.updatedAt, Date.now())}
</div>

<div class="action-row">
  <button class="btn btn-secondary act" onclick={() => duplicateAction(todo.id)}>Duplicate</button>
  <button class="btn btn-secondary act" onclick={() => setArchivedAction(todo.id, !todo.archived)}>
    {todo.archived ? "Restore" : "Archive"}
  </button>
  <button class="btn btn-secondary act danger" onclick={() => trashTodoAction(todo.id)}>Delete</button>
</div>

<style>
  .title {
    resize: none;
    font-size: 13.5px;
    font-weight: 500;
    min-height: 52px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .label {
    font-size: 12px;
    color: color-mix(in srgb, var(--color-text) 70%, transparent);
  }
  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .pill {
    border: 1px solid var(--color-divider);
    color: var(--color-neutral-400);
    background: transparent;
    font: inherit;
    font-size: 11.5px;
    padding: 3px 10px;
    border-radius: 999px;
    cursor: pointer;
    white-space: nowrap;
  }
  .pill:hover {
    border-color: var(--color-accent);
  }
  .pill.active {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }
  .pair {
    display: flex;
    gap: 10px;
  }
  .emoji-field {
    width: 64px;
  }
  .emoji-input {
    text-align: center;
    min-height: 30px;
    font-size: 14px;
  }
  .pin-field {
    flex: 1;
  }
  .pin-pair {
    display: flex;
    gap: 4px;
  }
  .pin-btn {
    flex: 1;
    border: 1px solid var(--color-divider);
    color: var(--color-neutral-400);
    background: transparent;
    font: inherit;
    font-size: 11.5px;
    padding: 5px 4px;
    border-radius: 6px;
    cursor: pointer;
  }
  .pin-btn:hover {
    border-color: var(--color-accent);
  }
  .pin-btn.active {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }
  .desc {
    font-size: 12px;
    line-height: 1.5;
  }
  .links {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 5px;
  }
  .link {
    border: none;
    background: transparent;
    color: var(--color-accent);
    font: inherit;
    font-size: 11px;
    text-align: left;
    cursor: pointer;
    padding: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .meta {
    font-size: 10px;
    color: var(--color-neutral-600);
  }
  .action-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .act {
    font-size: 11.5px;
    padding: 4px 10px;
  }
  .danger {
    color: #e07b7b;
    border-color: color-mix(in srgb, #e07b7b 40%, transparent);
  }
</style>
