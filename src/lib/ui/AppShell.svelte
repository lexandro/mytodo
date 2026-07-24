<script lang="ts">
  // App shell per COMPONENTS.md: TitleBar → main row (rail | center | detail)
  // → StatusBar. Owns startup (store.init), global keyboard handling and the
  // app-wide native-context-menu suppression.
  import { ensureInbox } from "$lib/core/bootstrap";
  import { handleKeydown } from "$lib/state/keyboard";
  import { persistUiSettings, restoreUiSettings } from "$lib/state/settings-sync.svelte";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";
  import CommandPalette from "./CommandPalette.svelte";
  import ContextMenu from "./ContextMenu.svelte";
  import DetailPanel from "./DetailPanel.svelte";
  import GlobalPinnedStrip from "./GlobalPinnedStrip.svelte";
  import GlobalSearch from "./GlobalSearch.svelte";
  import ListRail from "./ListRail.svelte";
  import PinnedView from "./PinnedView.svelte";
  import StatusBar from "./StatusBar.svelte";
  import TitleBar from "./TitleBar.svelte";
  import Toast from "./Toast.svelte";
  import TodoPane from "./TodoPane.svelte";
  import TrashView from "./TrashView.svelte";

  $effect(() => {
    void store
      .init((data) => {
        ensureInbox(data);
      })
      .then(() => restoreUiSettings())
      .then(() => (settingsRestored = true));
  });

  // fallback after restore: panes without a list point at the first one
  let settingsRestored = $state(false);
  $effect(() => {
    if (!settingsRestored || store.data.lists.length === 0) return;
    if (ui.panes[0].listId === null) {
      const first = [...store.data.lists].sort((a, b) => a.order - b.order)[0];
      ui.updatePane(0, { listId: first.id });
    }
  });

  // persist layout/pane/view state on every change (single-row upsert)
  $effect(() => {
    if (!settingsRestored) return;
    persistUiSettings();
  });

  const paneCount = $derived({ "1": 1, "2v": 2, "2h": 2, "4": 4 }[ui.layout]);
  const paneIndexes = $derived([0, 1, 2, 3].slice(0, paneCount));

  // theme attribute drives the token overrides in tokens.css
  $effect(() => {
    document.documentElement.dataset.theme = ui.theme;
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
  <GlobalPinnedStrip />
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
          <div
            class="pane-grid"
            style:grid-template-columns={ui.layout === "2v" || ui.layout === "4" ? "1fr 1fr" : "1fr"}
            style:grid-template-rows={ui.layout === "2h" || ui.layout === "4" ? "1fr 1fr" : "1fr"}
          >
            {#each paneIndexes as paneIndex (paneIndex)}
              <TodoPane {paneIndex} single={paneCount === 1} />
            {/each}
          </div>
        {:else if ui.view === "pinned"}
          <PinnedView />
        {:else}
          <TrashView />
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
<GlobalSearch />
<CommandPalette />
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
