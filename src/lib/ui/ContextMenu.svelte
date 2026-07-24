<script lang="ts">
  // Fixed-position surface menu; Esc or outside click closes. Items come
  // from the builders in state/menus.ts.
  import { ui } from "$lib/state/ui.svelte";

  function onWindowMousedown(e: MouseEvent): void {
    if (ui.ctxMenu === null) return;
    const target = e.target;
    if (target instanceof HTMLElement && target.closest(".ctx-menu") !== null) return;
    ui.ctxMenu = null;
  }
</script>

<svelte:window onmousedown={onWindowMousedown} />

{#if ui.ctxMenu !== null}
  <div class="ctx-menu" style:left={`${ui.ctxMenu.x}px`} style:top={`${ui.ctxMenu.y}px`}>
    {#each ui.ctxMenu.items as item, i (i)}
      {#if item.separator === true}
        <div class="sep"></div>
      {:else}
        <button
          class="item"
          class:danger={item.danger === true}
          class:disabled={item.disabled === true}
          disabled={item.disabled === true}
          onclick={() => item.action()}
        >
          <span class="label">{item.label}</span>
          {#if item.hint !== undefined && item.hint !== ""}
            <span class="hint">{item.hint}</span>
          {/if}
        </button>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .ctx-menu {
    position: fixed;
    z-index: 66;
    min-width: 208px;
    background: var(--color-surface);
    border-radius: 8px;
    box-shadow: var(--shadow-md);
    padding: 4px;
    display: flex;
    flex-direction: column;
    animation: menu-in 0.1s ease;
  }
  @keyframes menu-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  .item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 12.5px;
    border-radius: 5px;
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
  }
  .item:hover:not(.disabled) {
    background: color-mix(in srgb, var(--color-text) 7%, transparent);
  }
  .item.danger {
    color: #e07b7b;
  }
  .item.disabled {
    color: var(--color-neutral-600);
    cursor: default;
  }
  .label {
    flex: 1;
  }
  .hint {
    font-size: 10px;
    color: var(--color-neutral-600);
  }
  .sep {
    height: 1px;
    background: var(--color-divider);
    margin: 4px 8px;
  }
</style>
