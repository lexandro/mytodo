<script lang="ts">
  // "Icon & color…" for a list: a roomy icon grid and the list palette, with a
  // live preview of the rail row above them. Every click applies right away
  // (and is undoable) — Done just closes.
  import { centralLabelName, labelColor, sortedLabels, tintBackground } from "$lib/core/labels";
  import { LIST_ICONS } from "$lib/core/list-icons";
  import { setListColorAction, setListIconAction } from "$lib/state/actions-labels";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";

  const list = $derived(store.data.lists.find((l) => l.id === ui.listAppearance));
  const colors = $derived(sortedLabels(store.data, "list"));
  const previewColor = $derived(labelColor(store.data, list?.colorLabelId ?? null));

  function close(): void {
    ui.listAppearance = null;
  }
</script>

{#if list !== undefined}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="dialog-backdrop" onclick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div class="dialog appearance">
      <span class="dialog-title a-title">Icon &amp; color</span>

      <div class="preview">
        <span class="preview-stripe" style:background={previewColor ?? "transparent"}></span>
        <span class="preview-icon" style:background={tintBackground(previewColor)}>{list.emoji}</span>
        <span class="preview-name">{list.name}</span>
      </div>

      <div class="body">
        <div class="section-row">
          <span class="section">Icon</span>
          <button
            class="clear"
            class:active={list.emoji === ""}
            onclick={() => setListIconAction(list.id, "")}
          >
            No icon
          </button>
        </div>
        <div class="grid">
          {#each LIST_ICONS as icon (icon)}
            <button
              class="cell"
              class:selected={list.emoji === icon}
              onclick={() => setListIconAction(list.id, icon)}
            >{icon}</button>
          {/each}
        </div>

        <span class="section">Color</span>
        <div class="colors">
          <button
            class="chip"
            class:selected={list.colorLabelId === null}
            onclick={() => setListColorAction(list.id, null)}
          >
            <span class="dot none-dot">✕</span>
            None
          </button>
          {#each colors as color (color.id)}
            <button
              class="chip"
              class:selected={list.colorLabelId === color.id}
              onclick={() => setListColorAction(list.id, color.id)}
            >
              <span class="dot" style:background={color.color}></span>
              {centralLabelName(store.data, color.id)}
            </button>
          {/each}
        </div>
      </div>

      <div class="dialog-actions">
        <button class="btn btn-primary" onclick={() => close()}>Done</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .appearance {
    width: min(560px, 100%);
    /* --ui-zoom compensates the UI scale: vh does not follow zoom (AppShell) */
    max-height: calc(100vh / var(--ui-zoom, 1) - 2 * var(--space-4));
    gap: var(--space-4);
  }
  /* the grid is tall: it scrolls before the dialog outgrows a small window */
  .body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding-right: 4px;
  }
  .a-title {
    font-size: 16px;
  }
  .preview {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--color-text) 5%, transparent);
  }
  .preview-stripe {
    width: 3px;
    height: 20px;
    flex: none;
    border-radius: 2px;
  }
  .preview-icon {
    width: 26px;
    height: 26px;
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 15px;
  }
  .preview-name {
    font-size: 13px;
  }
  .section {
    font-size: 10px;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--color-neutral-500);
    margin-bottom: -4px;
  }
  .section-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: -4px;
  }
  .clear {
    border: 1px solid var(--color-divider);
    border-radius: 999px;
    background: transparent;
    color: var(--color-neutral-500);
    font: inherit;
    font-size: 11px;
    padding: 2px 10px;
    cursor: pointer;
  }
  .clear:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
  .clear.active {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  }
  /* six columns on purpose: the icons come in themed rows of six */
  .grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }
  .cell {
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    line-height: 1;
    border: 1px solid transparent;
    border-radius: 10px;
    background: color-mix(in srgb, var(--color-text) 4%, transparent);
    cursor: pointer;
    padding: 0;
  }
  .cell:hover {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  }
  .cell.selected {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
  }
  .colors {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 11px 5px 8px;
    border: 1px solid var(--color-divider);
    border-radius: 999px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }
  .chip:hover {
    border-color: var(--color-accent);
  }
  .chip.selected {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  }
  .dot {
    width: 13px;
    height: 13px;
    border-radius: 50%;
    flex: none;
  }
  .none-dot {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-divider);
    font-size: 7px;
    color: var(--color-neutral-500);
  }
</style>
