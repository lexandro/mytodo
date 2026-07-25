<script lang="ts">
  // Per-list color names. The palette itself is central (Settings → Todo
  // colors); here a list says what a color means to it — "Blue" can be
  // "Waiting for review" at work and "Groceries" at home. One color per row,
  // because the name is the point.
  import { labelNameOverride } from "$lib/core/label-names";
  import { centralLabelName, sortedLabels } from "$lib/core/labels";
  import { openSettings } from "$lib/state/actions";
  import { setLabelNameAction } from "$lib/state/actions-labels";
  import { store } from "$lib/state/store.svelte";

  let { listId, listName, onclose }: { listId: string; listName: string; onclose: () => void } =
    $props();

  const labels = $derived(sortedLabels(store.data, "todo"));

  function onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) onclose();
  }

  function openCentral(): void {
    onclose();
    openSettings("todo-colors");
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="dialog-backdrop" onclick={onBackdropClick}>
  <div class="dialog manager">
    <span class="dialog-title mgr-title">Color names in {listName}</span>
    <p class="lead">
      The colors are shared by every list; the names are yours to set per list.
      Leave a field empty to fall back to the shared name.
    </p>

    <div class="rows">
      {#each labels as label (label.id)}
        {@const own = labelNameOverride(store.data, listId, label.id)}
        <div class="row">
          <span class="swatch" style:background={label.color}></span>
          <input
            class="input name"
            class:overridden={own !== null}
            placeholder={centralLabelName(store.data, label.id)}
            value={own ?? ""}
            onchange={(e) => setLabelNameAction(listId, label.id, e.currentTarget.value)}
          />
          {#if own !== null}
            <button
              class="reset"
              title="Use the shared name"
              onclick={() => setLabelNameAction(listId, label.id, null)}
            >
              ↺
            </button>
          {:else}
            <span class="reset placeholder"></span>
          {/if}
        </div>
      {/each}
    </div>

    <div class="footer">
      <button class="btn btn-ghost palette" onclick={() => openCentral()}>
        Edit the shared palette…
      </button>
      <div class="spacer"></div>
      <button class="btn btn-primary" onclick={() => onclose()}>Done</button>
    </div>
  </div>
</div>

<style>
  .manager {
    width: min(430px, 100%);
  }
  .mgr-title {
    font-size: 16px;
  }
  .lead {
    font-size: 11px;
    color: var(--color-neutral-500);
    line-height: 1.45;
    margin: 0;
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 5px;
    max-height: 48vh;
    overflow-y: auto;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .swatch {
    width: 15px;
    height: 15px;
    flex: none;
    border-radius: 50%;
  }
  .name {
    flex: 1;
    min-width: 0;
    min-height: 27px;
    font-size: 12.5px;
  }
  .name::placeholder {
    color: var(--color-neutral-600);
  }
  .name.overridden {
    border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
  }
  .reset {
    width: 22px;
    flex: none;
    border: none;
    background: transparent;
    color: var(--color-neutral-600);
    font-size: 12px;
    cursor: pointer;
  }
  .reset:hover {
    color: var(--color-accent);
  }
  .reset.placeholder {
    cursor: default;
  }
  .footer {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .palette {
    font-size: 11.5px;
    padding: 2px 6px;
  }
  .spacer {
    flex: 1;
  }
</style>
