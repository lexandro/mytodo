<script lang="ts">
  // TitleBar (38px): brand → menu bar (F9) → spacer → layout switcher →
  // caption buttons. The whole bar is the drag region.
  import { windowClose, windowMinimize, windowToggleMaximize } from "$lib/ipc";
  import LayoutSwitcher from "./LayoutSwitcher.svelte";
</script>

<header class="titlebar" data-tauri-drag-region>
  <div class="brand" data-tauri-drag-region>
    <span class="brand-mark">✓</span>
    <span class="brand-name">myTODO</span>
  </div>
  <div class="spacer" data-tauri-drag-region></div>
  <LayoutSwitcher />
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
