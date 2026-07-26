<script lang="ts">
  // Settings → Behavior: how a todo reacts to what you do with it.
  // Today that is one switch; the section exists so the next one has a home.
  import { ui } from "$lib/state/ui.svelte";
</script>

<div class="field">
  <button
    class="switch-row"
    role="switch"
    aria-checked={ui.moveByStatus}
    onclick={() => (ui.moveByStatus = !ui.moveByStatus)}
  >
    <span class="track" class:on={ui.moveByStatus}><span class="knob"></span></span>
    <span class="text">
      <span class="switch-label">Move by status</span>
      <span class="hint">
        In progress jumps to the top, done and cancelled sink to the bottom.
      </span>
    </span>
  </button>
  <span class="note">
    The move happens inside the todo's own group — it never leaves it. Pinned
    todos stay in the Pinned section. This is a real reorder, so switching it
    off leaves already-moved todos where they are.
  </span>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .switch-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid var(--color-divider);
    border-radius: 8px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .switch-row:hover {
    border-color: var(--color-accent);
  }
  .track {
    flex: none;
    width: 30px;
    height: 17px;
    margin-top: 1px;
    border-radius: 999px;
    border: 1px solid var(--color-divider);
    background: color-mix(in srgb, var(--color-text) 8%, transparent);
    position: relative;
    transition: background 120ms ease, border-color 120ms ease;
  }
  .track.on {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 45%, transparent);
  }
  .knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: var(--color-neutral-400);
    transition: transform 120ms ease, background 120ms ease;
  }
  .track.on .knob {
    transform: translateX(13px);
    background: var(--color-accent);
  }
  .text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .switch-label {
    font-size: 12.5px;
  }
  .hint {
    font-size: 10.5px;
    color: var(--color-neutral-600);
  }
  .note {
    font-size: 10.5px;
    line-height: 1.5;
    color: var(--color-neutral-600);
  }
</style>
