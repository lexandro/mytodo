<script lang="ts">
  // App shell per COMPONENTS.md: TitleBar → main row (rail | center | detail)
  // → StatusBar. Owns startup (store.init), global keyboard handling and the
  // app-wide native-context-menu suppression.
  import { ensureInbox } from "$lib/core/bootstrap";
  import { handleKeydown } from "$lib/state/keyboard";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";
  import ContextMenu from "./ContextMenu.svelte";
  import DetailPanel from "./DetailPanel.svelte";
  import ListRail from "./ListRail.svelte";
  import StatusBar from "./StatusBar.svelte";
  import TitleBar from "./TitleBar.svelte";
  import Toast from "./Toast.svelte";
  import TodoPane from "./TodoPane.svelte";

  $effect(() => {
    void store.init((data) => {
      ensureInbox(data);
    });
  });

  // first load: point pane 0 at the first list
  $effect(() => {
    if (store.loaded && ui.panes[0].listId === null && store.data.lists.length > 0) {
      const first = [...store.data.lists].sort((a, b) => a.order - b.order)[0];
      ui.updatePane(0, { listId: first.id });
    }
  });

  // custom menus replace the native context menu app-wide (INTERACTIONS.md)
  function suppressNativeMenu(e: Event): void {
    e.preventDefault();
  }
</script>

<svelte:document oncontextmenu={suppressNativeMenu} />
<svelte:window onkeydown={handleKeydown} />

<div class="shell">
  <TitleBar />
  <div class="main-row">
    {#if store.loadError !== null}
      <div class="center-message">
        <h4>Cannot open the local database</h4>
        <p class="text-muted">{store.loadError}</p>
        <p class="text-muted">
          The app data lives in the <code>data/</code> folder next to the
          executable. Check that the folder is writable, then restart.
        </p>
      </div>
    {:else if !store.loaded}
      <div class="center-message text-muted">Loading…</div>
    {:else}
      <ListRail />
      <div class="center">
        {#if ui.view === "main"}
          <div class="pane-grid">
            <TodoPane paneIndex={0} />
          </div>
        {:else if ui.view === "pinned"}
          <div class="center-message text-muted">Pinned todos view — F5 fázis</div>
        {:else}
          <div class="center-message text-muted">Trash view — F5 fázis</div>
        {/if}
      </div>
      {#if ui.view === "main"}
        <DetailPanel />
      {/if}
    {/if}
  </div>
  <StatusBar />
</div>
<ContextMenu />
<Toast />

<style>
  .shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    user-select: none;
  }
  .main-row {
    flex: 1;
    display: flex;
    min-height: 0;
  }
  .center {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .pane-grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    gap: 8px;
    padding: 8px;
  }
  .center-message {
    margin: auto;
    max-width: 420px;
    text-align: center;
  }
  .center-message h4 {
    font-size: 15px;
    margin-bottom: var(--space-2);
  }
</style>
