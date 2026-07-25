<script lang="ts">
  // "WS" pill marking a list that has a linked workspace — the same fact the
  // ✦ AI panel depends on, visible where the list name is. Amber "WS!" when
  // the linked directory is currently missing (moved or unplugged drive).
  import { aiConfig } from "$lib/state/ai-config.svelte";

  let { listId }: { listId: string } = $props();

  const link = $derived(aiConfig.linkFor(listId));
  const missing = $derived(aiConfig.isMissing(listId));
</script>

{#if link !== undefined}
  <span
    class="ws"
    class:missing
    title={missing ? `Workspace not found: ${link.path}` : `Workspace: ${link.path}`}
  >
    {missing ? "WS!" : "WS"}
  </span>
{/if}

<style>
  .ws {
    flex: none;
    font-size: 8.5px;
    letter-spacing: 0.06em;
    line-height: 1;
    padding: 2px 4px;
    border-radius: 3px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
    color: var(--color-accent);
  }
  .ws.missing {
    border-color: color-mix(in srgb, #e0a36c 60%, transparent);
    color: #e0a36c;
  }
</style>
