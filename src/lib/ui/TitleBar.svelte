<script lang="ts">
  // TitleBar (38px): brand → menu bar (F9) → spacer → layout switcher →
  // caption buttons. The whole bar is the drag region.
  import { showQuickAddWindow, windowClose, windowMinimize, windowToggleMaximize } from "$lib/ipc";
  import { ui } from "$lib/state/ui.svelte";
  import AIActionMenu from "./AIActionMenu.svelte";
  import LayoutSwitcher from "./LayoutSwitcher.svelte";
  import MenuBar from "./MenuBar.svelte";
  import ScaleControls from "./ScaleControls.svelte";
</script>

<header class="titlebar" data-tauri-drag-region>
  <div class="brand" data-tauri-drag-region>
    <span class="brand-mark">✓</span>
    <span class="brand-name">myTODO</span>
  </div>
  <MenuBar />
  <div class="spacer" data-tauri-drag-region></div>
  <LayoutSwitcher />
  <AIActionMenu />
  <button
    class="tool-btn"
    title="Global quick add — Ctrl+Shift+Space"
    onclick={() => void showQuickAddWindow()}
  >
    <svg width="13" height="14" viewBox="0 0 12 14">
      <path d="M7 1 1.5 8H5.5L4.5 13 10.5 5.5H6.5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
    </svg>
  </button>
  <ScaleControls />
  <button
    class="tool-btn"
    title="Toggle light / dark"
    onclick={() => (ui.theme = ui.effectiveTheme === "dark" ? "light" : "dark")}
  >
    {#if ui.effectiveTheme === "dark"}
      <svg width="13" height="13" viewBox="0 0 14 14">
        <path d="M12.5 8.6A5.5 5.5 0 1 1 5.4 1.5a4.4 4.4 0 0 0 7.1 7.1z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
      </svg>
    {:else}
      <svg width="14" height="14" viewBox="0 0 14 14">
        <circle cx="7" cy="7" r="3" fill="none" stroke="currentColor" stroke-width="1.3" />
        <path d="M7 .8v1.6M7 11.6v1.6M.8 7h1.6M11.6 7h1.6M2.6 2.6l1.1 1.1M10.3 10.3l1.1 1.1M11.4 2.6l-1.1 1.1M3.7 10.3l-1.1 1.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
      </svg>
    {/if}
  </button>
  <button class="tool-btn" title="Settings" onclick={() => (ui.settingsOpen = true)}>
    <svg width="14" height="14" viewBox="0 0 24 24">
      <path
        d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.6 3.5c0-.6-.06-1.1-.17-1.63l2.04-1.6-2-3.46-2.4 1a8.3 8.3 0 0 0-2.83-1.64L14.87 2h-4l-.37 2.67c-1.05.36-2 .92-2.82 1.64l-2.4-1-2 3.47 2.04 1.59a8.5 8.5 0 0 0 0 3.26l-2.04 1.6 2 3.46 2.4-1c.82.72 1.77 1.28 2.82 1.64L10.87 22h4l.37-2.67a8.3 8.3 0 0 0 2.82-1.64l2.4 1 2-3.47-2.03-1.59c.11-.53.17-1.08.17-1.63z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
    </svg>
  </button>
  <div class="caption-buttons">
    <button class="caption" title="Minimize" onclick={() => void windowMinimize()}>─</button>
    <button class="caption" title="Maximize" onclick={() => void windowToggleMaximize()}>▢</button>
    <button class="caption caption-close" title="Close" onclick={() => void windowClose()}>✕</button>
  </div>
</header>

<style>
  .titlebar {
    height: 38px;
    flex: none;
    display: flex;
    align-items: center;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-divider);
    user-select: none;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 10px;
  }
  .brand-mark {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    background: var(--color-accent);
    color: var(--color-bg);
    font-size: 11px;
    line-height: 16px;
    text-align: center;
  }
  .brand-name {
    font-size: 13px;
    font-weight: 500;
  }
  .spacer {
    flex: 1;
    align-self: stretch;
  }
  .tool-btn {
    background: transparent;
    border: none;
    color: var(--color-neutral-400);
    width: 28px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 6px;
    margin-left: 4px;
  }
  .tool-btn:hover {
    background: color-mix(in srgb, var(--color-text) 8%, transparent);
    color: var(--color-accent);
  }
  .caption-buttons {
    display: flex;
    align-self: stretch;
    margin-left: 8px;
  }
  .caption {
    width: 40px;
    height: 38px;
    border: none;
    background: transparent;
    color: var(--color-neutral-400);
    font-size: 11px;
    cursor: default;
  }
  .caption:hover {
    background: color-mix(in srgb, var(--color-text) 8%, transparent);
    color: var(--color-text);
  }
  .caption-close:hover {
    background: #c42b1c;
    color: #fff;
  }
</style>
