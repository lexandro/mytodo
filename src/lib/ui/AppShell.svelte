<script lang="ts">
  // App shell per COMPONENTS.md: TitleBar → main row (rail | center | detail)
  // → StatusBar. Owns startup (store.init), global keyboard handling and the
  // app-wide native-context-menu suppression.
  import { ensureInbox } from "$lib/core/bootstrap";
  import { createTodo } from "$lib/core/todos-ops";
  import { onQuickAdd } from "$lib/ipc";
  import { aiConfig } from "$lib/state/ai-config.svelte";
  import { aiRuns } from "$lib/state/ai-runs.svelte";
  import { handleKeydown } from "$lib/state/keyboard";
  import {
    TODO_FS_MAX, TODO_FS_MIN, persistAppearance, persistUiSettings, restoreUiSettings,
  } from "$lib/state/settings-sync.svelte";
  import { SHORTCUT_SETTINGS_KEY, shortcutManager } from "$lib/state/shortcut-manager.svelte";
  import { SHORTCUT_OFFER_KEY, shortcutOffer } from "$lib/state/shortcut-offer.svelte";
  import { store } from "$lib/state/store.svelte";
  import { ui } from "$lib/state/ui.svelte";
  import { updater } from "$lib/state/updater.svelte";
  import { WINDOW_STATE_KEY, restoreWindowState, startWindowStateSaving } from "$lib/state/window-state";
  import AboutDialog from "./AboutDialog.svelte";
  import AIClientsDialog from "./AIClientsDialog.svelte";
  import AIPanel from "./AIPanel.svelte";
  import CommandPalette from "./CommandPalette.svelte";
  import ContextMenu from "./ContextMenu.svelte";
  import DetailPanel from "./DetailPanel.svelte";
  import GlobalPinnedStrip from "./GlobalPinnedStrip.svelte";
  import GlobalSearch from "./GlobalSearch.svelte";
  import RestoreDialog from "./RestoreDialog.svelte";
  import SettingsDialog from "./SettingsDialog.svelte";
  import ShortcutOfferDialog from "./ShortcutOfferDialog.svelte";
  import ShortcutsDialog from "./ShortcutsDialog.svelte";
  import ListRail from "./ListRail.svelte";
  import PinnedView from "./PinnedView.svelte";
  import StatusBar from "./StatusBar.svelte";
  import TitleBar from "./TitleBar.svelte";
  import Toast from "./Toast.svelte";
  import TodoPane from "./TodoPane.svelte";
  import TrashView from "./TrashView.svelte";
  import WorkspaceSettingsDialog from "./WorkspaceSettingsDialog.svelte";

  $effect(() => {
    void store
      .init((data) => {
        ensureInbox(data);
      })
      .then(() => restoreUiSettings())
      .then((all) => {
        settingsRestored = true;
        // startup registration never blocks the app (shortcut.md §16)
        void shortcutManager.init(all[SHORTCUT_SETTINGS_KEY]);
        void restoreWindowState(all[WINDOW_STATE_KEY]).then(() => startWindowStateSaving());
        updater.startAutoCheck();
        void shortcutOffer.init(all[SHORTCUT_OFFER_KEY]);
        aiConfig.restore(all, store.data.lists.map((l) => l.id));
        void aiRuns.load();
      });
  });

  // quickadd window emits; the MAIN window owns the write + toast
  $effect(() => {
    const unlisten = onQuickAdd(({ title, listId }) => {
      const list = store.data.lists.find((l) => l.id === listId);
      if (list === undefined) return;
      store.apply("add todo", (data) => {
        createTodo(data, listId, null, title, Date.now());
      });
      ui.showToast(`Added to ${list.name}`, true);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
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

  // theme attribute drives the token overrides in tokens.css; "system"
  // follows the Windows dark-mode setting live
  $effect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    ui.systemDark = media.matches;
    const onChange = (e: MediaQueryListEvent): void => {
      ui.systemDark = e.matches;
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  });
  $effect(() => {
    document.documentElement.dataset.theme = ui.effectiveTheme;
  });

  // UI scale zooms the whole shell; todo font size only touches todo rows.
  // --ui-zoom compensates vh units (zoom scales layout but not vh).
  $effect(() => {
    document.documentElement.style.setProperty("zoom", String(ui.uiScale / 100));
    document.documentElement.style.setProperty("--ui-zoom", String(ui.uiScale / 100));
    document.documentElement.style.setProperty("--tfs", `${ui.todoFs}px`);
  });
  $effect(() => {
    if (settingsRestored) persistAppearance();
  });

  // Ctrl + wheel resizes todo text (SHORTCUTS.md); explicit non-passive
  // listener because preventDefault must suppress browser zoom
  $effect(() => {
    const onWheel = (e: WheelEvent): void => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const next = ui.todoFs + (e.deltaY < 0 ? 1 : -1);
      ui.todoFs = Math.max(TODO_FS_MIN, Math.min(TODO_FS_MAX, next));
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
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
      <AIPanel />
    {/if}
  </div>
  <StatusBar />
</div>
<ContextMenu />
<GlobalSearch />
<CommandPalette />
<SettingsDialog />
<WorkspaceSettingsDialog />
<AIClientsDialog />
<ShortcutsDialog />
<AboutDialog />
<RestoreDialog />
<ShortcutOfferDialog />
<Toast />

<style>
  .shell {
    display: flex;
    flex-direction: column;
    height: calc(100vh / var(--ui-zoom, 1));
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
