<script lang="ts">
  let { title, body }: { title: string; body: string } = $props();
</script>

<div class="empty">
  <svg width="30" height="26" viewBox="0 0 30 26" class="tray">
    <path
      d="M1.5 14 6 2.5h18L28.5 14v9a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 23z M1.5 14H10a5 5 0 0 0 10 0h8.5"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linejoin="round"
    />
  </svg>
  <span class="title">{title}</span>
  <span class="body">{body}</span>
</div>

<style>
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 56px 24px;
    text-align: center;
  }
  .tray {
    color: var(--color-neutral-700);
  }
  .title {
    font-size: 13px;
    color: var(--color-neutral-400);
  }
  .body {
    font-size: 11.5px;
    color: var(--color-neutral-600);
    max-width: 260px;
  }
</style>
