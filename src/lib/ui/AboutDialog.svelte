<script lang="ts">
  // About dialog (Help → About myTODO): app identity plus the build metadata
  // a bug report needs. The version is baked in at build time — anything but
  // a tagged release build shows the -dev suffix.
  import { BUILD_INFO } from "$lib/build-info";
  import { APP_NAME, displayVersion, formatBuiltAt, versionReport } from "$lib/core/build-info";
  import { openWebUrl } from "$lib/ipc";
  import { ui } from "$lib/state/ui.svelte";
  import { updater } from "$lib/state/updater.svelte";
  import releaseIconUrl from "../../../src-tauri/icons/128x128.png";
  import devIconUrl from "../../../src-tauri/icons/dev/128x128.png";

  const REPO_URL = "https://github.com/lexandro/mytodo";

  const builtAt = formatBuiltAt(BUILD_INFO.builtAt);
  const isDev = BUILD_INFO.channel === "dev";
  // matches the icon the exe itself carries (tauri.dev.conf.json)
  const iconUrl = isDev ? devIconUrl : releaseIconUrl;

  function close(): void {
    ui.aboutOpen = false;
  }

  function fail(what: string, e: unknown): void {
    ui.showToast(`${what}: ${e instanceof Error ? e.message : String(e)}`);
  }

  async function copyVersionInfo(): Promise<void> {
    try {
      await navigator.clipboard.writeText(versionReport(BUILD_INFO));
      ui.showToast("Version info copied");
    } catch (e) {
      fail("Copy failed", e);
    }
  }

  async function openRepo(): Promise<void> {
    try {
      await openWebUrl(REPO_URL);
    } catch (e) {
      fail("Cannot open the browser", e);
    }
  }
</script>

{#if ui.aboutOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="dialog-backdrop" onclick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div class="dialog about">
      <div class="identity">
        <img class="app-icon" src={iconUrl} alt="" width="64" height="64" />
        <div class="names">
          <span class="dialog-title">{APP_NAME}</span>
          <span class="tagline">Fast, keyboard-first local todo workspace for Windows</span>
          <span class="version" class:dev={isDev}>{displayVersion(BUILD_INFO)}</span>
        </div>
      </div>

      <div class="meta">
        <span class="key">Build</span>
        <span class="val">
          {isDev ? "development build" : "release build"}{builtAt === null ? "" : ` · ${builtAt}`}
        </span>
        <span class="key">Commit</span>
        <span class="val mono">{BUILD_INFO.commit}</span>
        <span class="key">Data</span>
        <span class="val">local database next to the executable — no account, no cloud</span>
      </div>

      <div class="links">
        <button class="link" onclick={() => void openRepo()}>Source &amp; releases on GitHub</button>
        <span class="dot">·</span>
        <span>MIT License · © 2026 lexandro</span>
      </div>

      <div class="dialog-actions">
        <button class="btn btn-ghost" onclick={() => void copyVersionInfo()}>Copy version info</button>
        <span class="spacer"></span>
        <button
          class="btn btn-secondary"
          disabled={updater.status === "checking" || updater.status === "downloading"}
          onclick={() => void updater.check(true)}
        >
          {updater.status === "checking" ? "Checking…" : "Check for updates"}
        </button>
        <button class="btn btn-primary" onclick={close}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .about {
    width: min(430px, 100%);
  }
  .identity {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
  .app-icon {
    flex: none;
    border-radius: var(--radius-md);
  }
  .names {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .tagline {
    font-size: 11.5px;
    color: var(--color-neutral-500);
    line-height: 1.4;
  }
  .version {
    margin-top: 4px;
    align-self: flex-start;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    padding: 2px 9px;
    border-radius: var(--radius-sm);
    background: var(--color-accent-800);
    color: var(--color-accent-100);
  }
  .version.dev {
    background: transparent;
    border: 1px dashed var(--color-neutral-600);
    color: var(--color-neutral-400);
  }
  .meta {
    display: grid;
    grid-template-columns: 58px 1fr;
    gap: 3px 10px;
    font-size: 11.5px;
    padding-top: 2px;
    border-top: 1px solid var(--color-divider);
  }
  .key {
    color: var(--color-neutral-600);
  }
  .val {
    color: var(--color-neutral-400);
  }
  .mono {
    font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
    user-select: text;
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--color-neutral-600);
  }
  .link {
    border: none;
    background: transparent;
    color: var(--color-accent);
    font: inherit;
    padding: 0;
    cursor: pointer;
  }
  .link:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .spacer {
    flex: 1;
  }
  .dialog-actions .btn {
    font-size: 12.5px;
  }
</style>
