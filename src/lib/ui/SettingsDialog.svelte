<script lang="ts">
  // Settings dialog — Global Shortcuts section (shortcut.md §11): keyboard
  // recorder fields, enable toggles, summon behavior, reset defaults.
  import {
    ACTION_LABELS, acceleratorFromEvent, validateAccelerator,
    type GlobalAction,
  } from "$lib/core/shortcuts";
  import { appPaths, type AppPaths } from "$lib/ipc";
  import { shortcutManager } from "$lib/state/shortcut-manager.svelte";
  import { ui } from "$lib/state/ui.svelte";
  import FolderRow from "./FolderRow.svelte";

  const actions: GlobalAction[] = ["summon", "quickAdd", "pinned", "search"];

  // asked for when the dialog opens, never at startup
  let paths = $state<AppPaths | null>(null);
  $effect(() => {
    if (!ui.settingsOpen || paths !== null) return;
    void appPaths()
      .then((p) => (paths = p))
      .catch(() => {
        // the paths are informational; a failure just leaves the rows empty
      });
  });

  let recording = $state<GlobalAction | null>(null);
  let errors = $state<Partial<Record<GlobalAction, string>>>({});
  let warnings = $state<Partial<Record<GlobalAction, string>>>({});

  // While the recorder is armed, live OS hotkeys are suspended — otherwise
  // pressing an active shortcut (e.g. Ctrl+Alt+T) would trigger its action
  // mid-recording AND be swallowed before the recorder could capture it.
  // The cleanup also covers Esc, backdrop close and dialog unmount.
  $effect(() => {
    if (recording === null) return;
    void shortcutManager.suspendRegistrations();
    return () => {
      void shortcutManager.resumeRegistrations();
    };
  });

  async function onRecorderKey(e: KeyboardEvent, action: GlobalAction): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      recording = null;
      return;
    }
    const accelerator = acceleratorFromEvent(e);
    if (accelerator === null) return; // still holding modifiers
    const validation = validateAccelerator(accelerator);
    warnings = { ...warnings, [action]: validation.warning ?? undefined };
    // rebind BEFORE disarming: the resume in the effect cleanup then
    // re-registers from the already-updated config (no transient old accel)
    const error = await shortcutManager.rebind(action, accelerator);
    errors = { ...errors, [action]: error ?? undefined };
    recording = null;
  }

  async function toggleEnabled(action: GlobalAction): Promise<void> {
    const error = await shortcutManager.setEnabled(
      action,
      !shortcutManager.config.bindings[action].enabled,
    );
    errors = { ...errors, [action]: error ?? undefined };
  }

  function close(): void {
    ui.settingsOpen = false;
    recording = null;
  }
</script>

{#if ui.settingsOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="dialog-backdrop" onclick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div class="dialog settings">
      <span class="dialog-title s-title">Settings</span>

      <div class="section-label">Global shortcuts</div>
      {#each actions as action (action)}
        {@const binding = shortcutManager.config.bindings[action]}
        <div class="row">
          <span class="name">{ACTION_LABELS[action]}</span>
          <button
            class="recorder"
            class:recording={recording === action}
            onclick={() => (recording = action)}
            onkeydown={(e) => { if (recording === action) void onRecorderKey(e, action); }}
          >
            {recording === action ? "Press shortcut…" : binding.accelerator ?? "Not assigned"}
          </button>
          <button
            class="toggle"
            class:on={binding.enabled}
            onclick={() => void toggleEnabled(action)}
          >
            {binding.enabled ? "Enabled" : "Disabled"}
          </button>
        </div>
        {#if errors[action] !== undefined}
          <div class="error">{errors[action]}</div>
        {/if}
        {#if warnings[action] !== undefined && errors[action] === undefined}
          <div class="warning">{warnings[action]}</div>
        {/if}
      {/each}

      <div class="section-label">Summon shortcut behavior</div>
      <div class="behavior">
        <label class="radio-row">
          <input
            type="radio"
            checked={shortcutManager.config.summonBehavior === "toggle"}
            onchange={() => void shortcutManager.setSummonBehavior("toggle")}
          />
          Summon / Hide toggle
        </label>
        <label class="radio-row">
          <input
            type="radio"
            checked={shortcutManager.config.summonBehavior === "always"}
            onchange={() => void shortcutManager.setSummonBehavior("always")}
          />
          Always summon / focus
        </label>
      </div>

      <div class="section-label">Files</div>
      <FolderRow label="Data" path={paths?.dataDir ?? ""} />
      <FolderRow label="Backups" path={paths?.backupDir ?? ""} />
      <p class="files-note">
        Everything lives next to the executable — copy the folder and your data
        moves with it.
      </p>

      <div class="dialog-actions">
        <button class="btn btn-ghost" onclick={() => void shortcutManager.resetDefaults()}>
          Reset defaults
        </button>
        <button class="btn btn-primary" onclick={() => close()}>Done</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings {
    width: min(520px, 100%);
  }
  .files-note {
    font-size: 10.5px;
    color: var(--color-neutral-600);
    line-height: 1.45;
  }
  .s-title {
    font-size: 16px;
  }
  .section-label {
    font-size: 10px;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--color-neutral-500);
    margin-top: 4px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .name {
    flex: 1;
    font-size: 12.5px;
  }
  .recorder {
    min-width: 160px;
    border: 1px solid var(--color-divider);
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
  }
  .recorder:hover {
    border-color: var(--color-accent);
  }
  .recorder.recording {
    border-color: var(--color-accent);
    color: var(--color-accent);
    animation: pulse 1s ease infinite alternate;
  }
  @keyframes pulse {
    from {
      background: transparent;
    }
    to {
      background: color-mix(in srgb, var(--color-accent) 10%, transparent);
    }
  }
  .toggle {
    width: 74px;
    border: 1px solid var(--color-divider);
    background: transparent;
    color: var(--color-neutral-500);
    font: inherit;
    font-size: 11px;
    padding: 4px 0;
    border-radius: 6px;
    cursor: pointer;
  }
  .toggle.on {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
  .error {
    font-size: 11px;
    color: #e07b7b;
  }
  .warning {
    font-size: 11px;
    color: #e0a36c;
  }
  .behavior {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .radio-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    cursor: pointer;
  }
</style>
