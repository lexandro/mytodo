<script lang="ts">
  // Bottom-center toast (~4s): message + Undo for undo-able actions.
  // One at a time; the newest replaces the previous.
  import { undoAction } from "$lib/state/actions";
  import { ui } from "$lib/state/ui.svelte";
</script>

{#if ui.toast !== null}
  <div class="toast">
    <span>{ui.toast.message}</span>
    {#if ui.toast.undoable}
      <button class="undo" onclick={() => undoAction()}>Undo</button>
      <span class="hint">Ctrl+Z</span>
    {/if}
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    left: 50%;
    bottom: 34px;
    transform: translateX(-50%);
    z-index: 80;
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--color-surface);
    box-shadow: var(--shadow-md);
    border-radius: 999px;
    padding: 7px 14px;
    font-size: 12.5px;
    animation: toast-in 0.14s ease;
    white-space: nowrap;
  }
  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translate(-50%, 6px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
  .undo {
    border: none;
    background: transparent;
    color: var(--color-accent);
    font: inherit;
    font-size: 12.5px;
    cursor: pointer;
    padding: 0;
  }
  .undo:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .hint {
    font-size: 10px;
    color: var(--color-neutral-600);
  }
</style>
