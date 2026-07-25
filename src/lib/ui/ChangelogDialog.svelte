<script lang="ts">
  // Help → What's new. CHANGELOG.md is inlined at build time, so the list
  // always matches the shipped binary, and rendered as real elements (the
  // parser lives in core/changelog.ts) — no markdown library, no {@html}.
  import { BUILD_INFO } from "$lib/build-info";
  import { currentRelease, parseChangelog } from "$lib/core/changelog";
  import { ui } from "$lib/state/ui.svelte";
  import changelogSource from "../../../CHANGELOG.md?raw";

  const releases = parseChangelog(changelogSource);
  const current = currentRelease(releases, BUILD_INFO.version, BUILD_INFO.channel === "dev");

  function heading(version: string | null): string {
    return version === null ? "Unreleased" : `Version ${version}`;
  }

  /** Marks the entry that describes the build the user is running. */
  function badge(version: string | null): string | null {
    if (current === undefined || current.version !== version) return null;
    return version === null ? "in this dev build" : "you are running this";
  }
</script>

{#if ui.changelogOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="dialog-backdrop" onclick={(e) => { if (e.target === e.currentTarget) ui.changelogOpen = false; }}>
    <div class="dialog changelog">
      <span class="dialog-title c-title">What's new</span>

      <div class="scroll">
        {#each releases as release (release.version ?? "unreleased")}
          <section class="release">
            <div class="release-head">
              <span class="version">{heading(release.version)}</span>
              {#if release.date !== null}
                <span class="date">{release.date}</span>
              {/if}
              {#if badge(release.version) !== null}
                <span class="badge" class:dev={release.version === null}>{badge(release.version)}</span>
              {/if}
            </div>
            {#if release.intro !== null}
              <p class="intro">{release.intro}</p>
            {/if}
            {#each release.sections as section (section.title)}
              <div class="section">
                <span class="section-title {section.title.toLowerCase()}">{section.title}</span>
                <ul>
                  {#each section.items as item, i (i)}
                    <li>
                      {#each item as segment, s (s)}
                        {#if segment.bold}
                          <b>{segment.text}</b>
                        {:else if segment.italic}
                          <i>{segment.text}</i>
                        {:else if segment.code}
                          <code>{segment.text}</code>
                        {:else}{segment.text}{/if}
                      {/each}
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          </section>
        {/each}
      </div>

      <div class="dialog-actions">
        <button class="btn btn-primary" onclick={() => (ui.changelogOpen = false)}>Done</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .changelog {
    width: min(560px, 100%);
    max-height: min(78vh, 700px);
  }
  .c-title {
    font-size: 16px;
  }
  .scroll {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-right: 4px;
  }
  .release {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .release-head {
    display: flex;
    align-items: baseline;
    gap: 8px;
    border-bottom: 1px solid var(--color-divider);
    padding-bottom: 4px;
  }
  .version {
    font-size: 13px;
    font-weight: 500;
  }
  .date {
    font-size: 10.5px;
    color: var(--color-neutral-600);
    font-variant-numeric: tabular-nums;
    flex: 1;
  }
  .badge {
    font-size: 9.5px;
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--color-accent-800);
    color: var(--color-accent-100);
  }
  .badge.dev {
    background: transparent;
    border: 1px dashed var(--color-neutral-600);
    color: var(--color-neutral-400);
  }
  .intro {
    font-size: 11.5px;
    color: var(--color-neutral-400);
    line-height: 1.5;
  }
  .section {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .section-title {
    font-size: 9.5px;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--color-neutral-500);
  }
  .section-title.added {
    color: #7cc98f;
  }
  .section-title.fixed {
    color: #e0a36c;
  }
  ul {
    margin: 0;
    padding-left: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  li {
    font-size: 11.5px;
    line-height: 1.5;
    color: var(--color-neutral-400);
  }
  li b {
    color: var(--color-text);
    font-weight: 500;
  }
  li code {
    font-family: var(--font-mono, "Cascadia Mono", Consolas, monospace);
    font-size: 10.5px;
    background: color-mix(in srgb, var(--color-text) 7%, transparent);
    border-radius: 4px;
    padding: 0 4px;
  }
</style>
