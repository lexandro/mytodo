<script lang="ts">
  // App shell per COMPONENTS.md: TitleBar → main row (rail | center | detail)
  // → StatusBar. Owns startup (store.init) and global chrome behaviors.
  import { ensureInbox } from "$lib/core/bootstrap";
  import { store } from "$lib/state/store.svelte";
  import StatusBar from "./StatusBar.svelte";
  import TitleBar from "./TitleBar.svelte";

  $effect(() => {
    void store.init(ensureInbox);
  });

  // custom menus replace the native context menu app-wide (INTERACTIONS.md)
  function suppressNativeMenu(e: Event): void {
    e.preventDefault();
  }
</script>

<svelte:document oncontextmenu={suppressNativeMenu} />

<div class="shell">
  <TitleBar />
  <div class="main-row">
    {#if store.loadError !== null}
      <div class="load-error">
        <h4>Cannot open the local database</h4>
        <p class="text-muted">{store.loadError}</p>
        <p class="text-muted">
          The app data lives in the <code>data/</code> folder next to the
          executable. Check that the folder is writable, then restart.
        </p>
      </div>
    {:else if !store.loaded}
      <div class="load-error text-muted">Loading…</div>
    {:else}
      <!-- rail | panes | detail arrive in later phases -->
      <div class="center-placeholder text-muted">
        {store.data.lists.length} list(s) loaded
      </div>
    {/if}
  </div>
  <StatusBar />
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }
  .main-row {
    flex: 1;
    display: flex;
    min-height: 0;
  }
  .load-error,
  .center-placeholder {
    margin: auto;
    max-width: 420px;
    text-align: center;
  }
  .load-error h4 {
    font-size: 15px;
    margin-bottom: var(--space-2);
  }
</style>
