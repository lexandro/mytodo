<script lang="ts">
  // Global Quick Add — a tiny always-on-top window (Ctrl+Shift+Space).
  // Deliberately NOT a mini app: one input, one dropdown (COMPONENTS.md).
  // The todo itself is created by the MAIN window (single in-memory
  // authority): this window emits an event and hides.
  import { byOrder } from "$lib/core/ordering";
  import type { List } from "$lib/core/types";
  import { dbLoadAll, emitQuickAdd, windowHide } from "$lib/ipc";

  let lists = $state<List[]>([]);
  let title = $state("");
  let targetId = $state<string | null>(null);
  let inputEl = $state<HTMLInputElement | null>(null);

  async function refresh(): Promise<void> {
    try {
      const data = await dbLoadAll();
      lists = [...data.lists].sort(byOrder);
      // default target: Inbox
      if (targetId === null || !lists.some((l) => l.id === targetId)) {
        targetId = lists.find((l) => l.fixed)?.id ?? lists[0]?.id ?? null;
      }
    } catch {
      // main window surfaces DB errors; the quick add stays silent
    }
  }

  $effect(() => {
    void refresh();
    const onFocus = (): void => {
      void refresh();
      inputEl?.focus();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  });

  async function submit(): Promise<void> {
    const trimmed = title.trim();
    if (trimmed === "" || targetId === null) return;
    await emitQuickAdd({ title: trimmed, listId: targetId });
    title = "";
    await windowHide();
  }

  async function onKeydown(e: KeyboardEvent): Promise<void> {
    if (e.key === "Enter") {
      await submit();
    } else if (e.key === "Escape") {
      title = "";
      await windowHide();
    }
  }
</script>

<svelte:window onkeydown={(e) => void onKeydown(e)} />

<div class="card">
  <div class="header">
    <span class="kicker">Quick add</span>
    <span class="hint">lands in the selected list</span>
  </div>
  <!-- svelte-ignore a11y_autofocus -->
  <input
    class="input main-input"
    autofocus
    bind:this={inputEl}
    placeholder="What needs doing?"
    bind:value={title}
  />
  <div class="target-row">
    <span class="target-label">Target</span>
    <select class="input target" bind:value={targetId}>
      {#each lists as list (list.id)}
        <option value={list.id}>{list.emoji === "" ? list.name : `${list.emoji} ${list.name}`}</option>
      {/each}
    </select>
  </div>
  <div class="footer">Enter adds · Esc dismisses</div>
</div>

<style>
  :global(body) {
    overflow: hidden;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 13px 14px;
    height: 100vh;
    background: var(--color-surface);
    border: 1px solid var(--color-divider);
    border-radius: 10px;
    box-sizing: border-box;
  }
  .header {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .kicker {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-accent);
  }
  .hint {
    font-size: 10px;
    color: var(--color-neutral-600);
  }
  .main-input {
    min-height: 34px;
    font-size: 13.5px;
  }
  .target-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .target-label {
    font-size: 11px;
    color: var(--color-neutral-500);
  }
  .target {
    flex: 1;
    min-height: 28px;
    font-size: 12px;
  }
  .footer {
    font-size: 10px;
    color: var(--color-neutral-600);
  }
</style>
