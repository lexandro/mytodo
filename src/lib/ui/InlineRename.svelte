<script lang="ts">
  // Inline rename input for lists and groups. Enter commits, Esc cancels,
  // blur commits. A leading emoji edits the emoji ("🎤 Conference App").
  import { cancelRename, commitRename } from "$lib/state/actions";
  import { ui } from "$lib/state/ui.svelte";

  let { indent = 0 }: { indent?: number } = $props();

  function autofocus(el: HTMLInputElement): void {
    el.focus();
    el.select();
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter") commitRename();
    else if (e.key === "Escape") cancelRename();
  }
</script>

{#if ui.renaming !== null}
  <input
    class="input rename"
    style:margin-left={indent > 0 ? `${indent}px` : undefined}
    use:autofocus
    bind:value={ui.renaming.value}
    onkeydown={onKeydown}
    onblur={() => commitRename()}
  />
{/if}

<style>
  .rename {
    min-height: 28px;
    font-size: 12.5px;
    margin: 1px 2px;
    width: auto;
  }
</style>
