<script lang="ts">
  // Command palette (Ctrl+K): fuzzy list/command switcher, same keyboard
  // model as global search.
  import { paletteCommands } from "$lib/state/palette";
  import { ui } from "$lib/state/ui.svelte";

  const results = $derived(ui.palette === null ? [] : paletteCommands(ui.palette.query));
  const activeIndex = $derived(
    ui.palette === null ? 0 : Math.max(0, Math.min(ui.palette.index, results.length - 1)),
  );

  function autofocus(el: HTMLInputElement): void {
    el.focus();
  }

  function onKeydown(e: KeyboardEvent): void {
    if (ui.palette === null) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      ui.palette.index = Math.min(results.length - 1, activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      ui.palette.index = Math.max(0, activeIndex - 1);
    } else if (e.key === "Enter" && results[activeIndex] !== undefined) {
      results[activeIndex].run();
    }
  }
</script>

{#if ui.palette !== null}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="dialog-backdrop pal-backdrop" onclick={(e) => { if (e.target === e.currentTarget) ui.palette = null; }}>
    <div class="pal-dialog">
      <input
        class="pal-input"
        use:autofocus
        placeholder="Switch list or run a command…"
        bind:value={ui.palette.query}
        oninput={() => { if (ui.palette !== null) ui.palette.index = 0; }}
        onkeydown={onKeydown}
      />
      <div class="results">
        {#each results as cmd, i (cmd.name)}
          <button class="result" class:active={i === activeIndex} onclick={() => cmd.run()}>
            <span class="emoji">{cmd.emoji}</span>
            <span class="name">{cmd.name}</span>
            <span class="hint">{cmd.hint}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .pal-backdrop {
    align-items: start;
    padding-top: 14vh;
    display: flex;
    justify-content: center;
  }
  .pal-dialog {
    width: min(460px, 92%);
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: pal-in 0.12s ease;
  }
  @keyframes pal-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  .pal-input {
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 13.5px;
    outline: none;
    caret-color: var(--color-accent);
    padding: 11px 13px;
    border-bottom: 1px solid var(--color-divider);
  }
  .results {
    max-height: 42vh;
    overflow-y: auto;
    padding: 4px;
    display: flex;
    flex-direction: column;
  }
  .result {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 6px 9px;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 12.5px;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
  }
  .result:hover {
    background: color-mix(in srgb, var(--color-text) 7%, transparent);
  }
  .result.active {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  }
  .emoji {
    width: 18px;
    text-align: center;
  }
  .name {
    flex: 1;
  }
  .hint {
    font-size: 10px;
    color: var(--color-neutral-600);
  }
</style>
