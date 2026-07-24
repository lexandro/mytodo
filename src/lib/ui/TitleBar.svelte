<script lang="ts">
  // TitleBar (38px): brand → menu bar (F9) → spacer → layout switcher →
  // caption buttons. The whole bar is the drag region.
  import { showQuickAddWindow, windowClose, windowMinimize, windowToggleMaximize } from "$lib/ipc";
  import { ui } from "$lib/state/ui.svelte";
  import LayoutSwitcher from "./LayoutSwitcher.svelte";
</script>

<header class="titlebar" data-tauri-drag-region>
  <div class="brand" data-tauri-drag-region>
    <span class="brand-mark">✓</span>
    <span class="brand-name">myTODO</span>
  </div>
  <div class="spacer" data-tauri-drag-region></div>
  <LayoutSwitcher />
  <button
    class="tool-btn"
    title="Global quick add — Ctrl+Shift+Space"
    onclick={() => void showQuickAddWindow()}
  >
    <svg width="13" height="14" viewBox="0 0 12 14">
      <path d="M7 1 1.5 8H5.5L4.5 13 10.5 5.5H6.5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
    </svg>
  </button>
  <button class="tool-btn" title="Settings" onclick={() => (ui.settingsOpen = true)}>
    <svg width="13" height="13" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="1.3" />
      <path d="M7 1.2v1.8M7 11v1.8M1.2 7H3M11 7h1.8M2.9 2.9l1.3 1.3M9.8 9.8l1.3 1.3M11.1 2.9 9.8 4.2M4.2 9.8l-1.3 1.3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
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
