<script lang="ts">
  // Settings → Appearance: theme, UI scale, todo text size. The title bar's
  // "%" popover and the View menu are shortcuts into the same three settings.
  import { TODO_FS_MAX, TODO_FS_MIN, UI_SCALES } from "$lib/state/settings-sync.svelte";
  import { ui } from "$lib/state/ui.svelte";

  const THEMES: { value: typeof ui.theme; label: string }[] = [
    { value: "system", label: "Follow system" },
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
  ];
</script>

<div class="field">
  <span class="field-label">Theme</span>
  <div class="chips">
    {#each THEMES as theme (theme.value)}
      <button
        class="chip"
        class:active={ui.theme === theme.value}
        onclick={() => (ui.theme = theme.value)}
      >
        {theme.label}
      </button>
    {/each}
  </div>
</div>

<div class="field">
  <span class="field-label">UI scale</span>
  <div class="chips">
    {#each UI_SCALES as scale (scale)}
      <button class="chip" class:active={ui.uiScale === scale} onclick={() => (ui.uiScale = scale)}>
        {scale}%
      </button>
    {/each}
  </div>
  <span class="hint">Zooms the whole window — lists, panels and dialogs alike.</span>
</div>

<div class="field">
  <span class="field-label">Todo text size</span>
  <div class="stepper">
    <button class="chip step" onclick={() => (ui.todoFs = Math.max(TODO_FS_MIN, ui.todoFs - 1))}>
      A−
    </button>
    <span class="fs-value">{ui.todoFs}px</span>
    <button class="chip step" onclick={() => (ui.todoFs = Math.min(TODO_FS_MAX, ui.todoFs + 1))}>
      A+
    </button>
  </div>
  <span class="hint">Ctrl + mouse wheel does the same over the todo list.</span>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field-label {
    font-size: 12.5px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .chip {
    border: 1px solid var(--color-divider);
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 11.5px;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
  }
  .chip:hover {
    border-color: var(--color-accent);
  }
  .chip.active {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .step {
    width: 38px;
    padding: 4px 0;
  }
  .fs-value {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: var(--color-neutral-400);
    width: 44px;
    text-align: center;
  }
  .hint {
    font-size: 10.5px;
    color: var(--color-neutral-600);
  }
</style>
