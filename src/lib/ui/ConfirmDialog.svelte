<script lang="ts">
  // Confirmation dialog — used ONLY for Empty Trash (recorded decision #2);
  // everything else relies on undo + toast.
  let {
    title, body, confirmLabel, onconfirm, oncancel,
  }: {
    title: string;
    body: string;
    confirmLabel: string;
    onconfirm: () => void;
    oncancel: () => void;
  } = $props();

  function onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) oncancel();
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.stopPropagation();
      oncancel();
    }
  }
</script>

<svelte:window onkeydowncapture={onKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="dialog-backdrop" onclick={onBackdropClick}>
  <div class="dialog confirm">
    <span class="dialog-title c-title">{title}</span>
    <p class="dialog-body c-body">{body}</p>
    <div class="dialog-actions">
      <button class="btn btn-secondary" onclick={() => oncancel()}>Cancel</button>
      <button class="btn btn-primary danger" onclick={() => onconfirm()}>{confirmLabel}</button>
    </div>
  </div>
</div>

<style>
  .confirm {
    width: min(360px, 100%);
  }
  .c-title {
    font-size: 16px;
  }
  .c-body {
    font-size: 12.5px;
    margin: 0;
  }
  .danger {
    color: #e07b7b;
    border-color: #e07b7b;
  }
  .danger:hover {
    background: color-mix(in srgb, #e07b7b 12%, transparent);
  }
</style>
