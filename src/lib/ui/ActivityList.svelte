<script lang="ts">
  // Activity tab: newest-first entries with a 2px left rule.
  import { formatTimestamp } from "$lib/core/time";
  import { store } from "$lib/state/store.svelte";

  let { todoId }: { todoId: string } = $props();

  const events = $derived(
    store.data.activity
      .filter((a) => a.todoId === todoId)
      .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1)),
  );
</script>

<div class="list">
  {#each events as event (event.id)}
    <div class="entry">
      <span class="time">{formatTimestamp(event.createdAt, Date.now())}</span>
      <span class="text">{event.summary}</span>
    </div>
  {/each}
</div>

<style>
  .list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 2px;
  }
  .entry {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding-left: 10px;
    border-left: 2px solid var(--color-divider);
  }
  .time {
    font-size: 10px;
    color: var(--color-neutral-600);
    font-variant-numeric: tabular-nums;
  }
  .text {
    font-size: 12px;
  }
</style>
