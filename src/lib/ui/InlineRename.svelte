<script lang="ts">
  // Inline rename input. Enter commits, Esc cancels, blur commits. For lists
  // and groups a leading emoji edits the emoji ("🎤 Conference App"); todos
  // edit the title only. `fill` = the input sits inside a row (todo edit
  // mode) instead of replacing the whole row.
  import { cancelRename, commitRename } from "$lib/state/actions";
  import { ui } from "$lib/state/ui.svelte";

  let { indent = 0, fill = false }: { indent?: number; fill?: boolean } = $props();

  function autofocus(el: HTMLInputElement): void {
    el.focus();
    el.select();
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key !== "Enter" && e.key !== "Escape") return;
    // the window handler must not also act on it (Esc would close the detail panel)
    e.stopPropagation();
    if (e.key === "Enter") commitRename();
    else cancelRename();
  }
</script>

{#if ui.renaming !== null}
  <input
    class="input rename"
    class:fill
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
  /* inside a todo row: takes the title's slot, so the row does not jump */
  .rename.fill {
    flex: 1;
    min-width: 0;
    min-height: 22px;
    margin: 0;
    padding: 1px 5px;
    font-size: var(--tfs, 13px);
  }
</style>
