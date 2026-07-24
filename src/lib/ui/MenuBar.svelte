<script lang="ts">
  // Menu bar with classic Windows roaming: while a menu is open, hovering
  // another menu button moves the open menu there.
  import { MENUS } from "$lib/state/menubar";
  import { ui } from "$lib/state/ui.svelte";

  function toggle(name: string): void {
    ui.menuOpen = ui.menuOpen === name ? null : name;
  }

  function roam(name: string): void {
    if (ui.menuOpen !== null && ui.menuOpen !== name) ui.menuOpen = name;
  }

  function onWindowMousedown(e: MouseEvent): void {
    if (ui.menuOpen === null) return;
    const target = e.target;
    if (target instanceof HTMLElement && target.closest(".menubar") !== null) return;
    ui.menuOpen = null;
  }
</script>

<svelte:window onmousedown={onWindowMousedown} />

<div class="menubar">
  {#each MENUS as menu (menu.name)}
    <div class="menu-slot">
      <button
        class="menu-btn"
        class:open={ui.menuOpen === menu.name}
        onclick={() => toggle(menu.name)}
        onmouseenter={() => roam(menu.name)}
      >
        {menu.name}
      </button>
      {#if ui.menuOpen === menu.name}
        <div class="dropdown">
          {#each menu.items() as entry, i (i)}
            {#if entry.separator === true}
              <div class="sep"></div>
            {:else}
              <button
                class="item"
                class:disabled={entry.disabled === true}
                disabled={entry.disabled === true}
                onclick={() => entry.action?.()}
              >
                <span class="label">{entry.label}</span>
                {#if entry.hint !== undefined && entry.hint !== ""}
                  <span class="hint">{entry.hint}</span>
                {/if}
              </button>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .menubar {
    display: flex;
    margin-left: 8px;
  }
  .menu-slot {
    position: relative;
  }
  .menu-btn {
    border: none;
    background: transparent;
    color: var(--color-neutral-400);
    font: inherit;
    font-size: 12px;
    padding: 4px 9px;
    border-radius: 5px;
    cursor: default;
    white-space: nowrap;
  }
  .menu-btn:hover,
  .menu-btn.open {
    background: color-mix(in srgb, var(--color-text) 8%, transparent);
    color: var(--color-text);
  }
  .dropdown {
    position: absolute;
    top: 29px;
    left: 0;
    z-index: 66;
    min-width: 234px;
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
