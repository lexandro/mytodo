<script lang="ts">
  // Settings shell: sidebar of sections on the left, the selected section on
  // the right. Sections own their state and their own footers — this file only
  // routes. New section = one entry in core/settings-sections.ts + one branch.
  import { SETTINGS_SECTIONS, settingsSection } from "$lib/core/settings-sections";
  import { ui } from "$lib/state/ui.svelte";
  import SettingsAppearance from "./SettingsAppearance.svelte";
  import SettingsColors from "./SettingsColors.svelte";
  import SettingsFiles from "./SettingsFiles.svelte";
  import SettingsShortcuts from "./SettingsShortcuts.svelte";

  const current = $derived(settingsSection(ui.settingsSection));

  function close(): void {
    ui.settingsOpen = false;
  }
</script>

{#if ui.settingsOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="dialog-backdrop" onclick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div class="dialog settings">
      <span class="dialog-title s-title">Settings</span>

      <div class="body">
        <nav class="sidebar">
          {#each SETTINGS_SECTIONS as section (section.id)}
            <button
              class="nav-item"
              class:active={section.id === current.id}
              onclick={() => (ui.settingsSection = section.id)}
            >
              <span class="glyph">{section.glyph}</span>
              <span class="nav-label">{section.label}</span>
            </button>
          {/each}
        </nav>

        <div class="content">
          <div class="head">
            <h4 class="head-title">{current.label}</h4>
            <p class="head-hint">{current.hint}</p>
          </div>
          {#if current.id === "appearance"}
            <SettingsAppearance />
          {:else if current.id === "todo-colors"}
            <SettingsColors />
          {:else if current.id === "shortcuts"}
            <SettingsShortcuts />
          {:else if current.id === "files"}
            <SettingsFiles />
          {/if}
        </div>
      </div>

      <div class="dialog-actions">
        <button class="btn btn-primary" onclick={() => close()}>Done</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings {
    width: min(880px, 100%);
    height: min(620px, 100%);
  }
  .s-title {
    font-size: 16px;
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 16px;
  }
  .sidebar {
    width: 176px;
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-right: 14px;
    border-right: 1px solid var(--color-divider);
    overflow-y: auto;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 10px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--color-neutral-400);
    font: inherit;
    font-size: 12.5px;
    text-align: left;
    cursor: pointer;
  }
  .nav-item:hover {
    background: color-mix(in srgb, var(--color-text) 6%, transparent);
    color: var(--color-text);
  }
  .nav-item.active {
    background: color-mix(in srgb, var(--color-accent) 14%, transparent);
    color: var(--color-text);
  }
  .glyph {
    width: 16px;
    text-align: center;
    font-size: 13px;
    flex: none;
  }
  .nav-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .content {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-right: 4px;
  }
  .head {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 2px;
  }
  .head-title {
    font-family: var(--font-heading);
    font-weight: var(--font-heading-weight);
    font-size: 14.5px;
    margin: 0;
  }
  .head-hint {
    font-size: 11px;
    color: var(--color-neutral-500);
    margin: 0;
  }
</style>
