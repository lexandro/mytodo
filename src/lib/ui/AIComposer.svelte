<script lang="ts">
  // The console: type a message to the workspace, pick the model and the
  // permission mode. Enter sends, Shift+Enter adds a newline. The mode locks
  // once the thread has turns — a resumed session keeps the sandbox it was
  // created with (see chatModeLocked).
  import {
    CLIENT_DEFAULT_LABEL, isCustomModel, isValidModelName,
  } from "$lib/core/ai-models";
  import type { AIProviderId } from "$lib/core/ai-types";
  import { chatModeLocked, sendChatMessage, setChatMode } from "$lib/state/ai-actions";
  import { aiConfig } from "$lib/state/ai-config.svelte";
  import { aiModels } from "$lib/state/ai-models.svelte";
  import type { AiPanelState } from "$lib/state/ui.svelte";

  let {
    panel, provider, busy,
  }: { panel: AiPanelState; provider: AIProviderId; busy: boolean } = $props();

  const CUSTOM = "__custom__";
  const model = $derived(aiConfig.clients[provider].model);
  const locked = $derived(chatModeLocked(panel));

  // the client's own list is fetched the first time a picker is shown, never
  // on startup; the fallback catalog is what the select uses meanwhile
  $effect(() => {
    aiModels.ensureLoaded(provider);
  });
  const modelOptions = $derived(aiModels.options(provider));
  let customOpen = $state(false);
  const selectValue = $derived(
    customOpen || isCustomModel(provider, model) ? CUSTOM : (model ?? ""),
  );

  function onModelChange(e: Event & { currentTarget: HTMLSelectElement }): void {
    const value = e.currentTarget.value;
    customOpen = value === CUSTOM;
    if (!customOpen) aiConfig.setModel(provider, value === "" ? null : value);
  }

  // on change, not on input: the model is a persisted setting, and writing it
  // per keystroke would be a settings round-trip per character
  function onCustomChange(e: Event & { currentTarget: HTMLInputElement }): void {
    const value = e.currentTarget.value.trim();
    if (value !== "" && !isValidModelName(value)) {
      e.currentTarget.value = model ?? "";
      return;
    }
    aiConfig.setModel(provider, value === "" ? null : value);
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (!busy) void sendChatMessage();
  }
</script>

<div class="composer">
  <textarea
    class="input draft"
    placeholder="Ask about this list or give a task… (Enter sends, Shift+Enter newline)"
    bind:value={panel.draft}
    onkeydown={onKeydown}
  ></textarea>

  <div class="controls">
    <select class="input pick" value={selectValue} onchange={onModelChange} title="Model">
      <option value="">{CLIENT_DEFAULT_LABEL}</option>
      {#each modelOptions as option (option.value)}
        <option value={option.value}>{option.label}{option.note === "" ? "" : ` — ${option.note}`}</option>
      {/each}
      <option value={CUSTOM}>Custom…</option>
    </select>

    <div class="modes" title={locked ? "Fixed for this conversation — start a new chat to change it" : "Permission mode"}>
      <button
        class="mode"
        class:on={panel.chatMode !== "execute"}
        disabled={locked}
        onclick={() => setChatMode("analyze")}
      >
        Read-only
      </button>
      <button
        class="mode execute"
        class:on={panel.chatMode === "execute"}
        disabled={locked}
        onclick={() => setChatMode("execute")}
      >
        Execute
      </button>
    </div>

    <button
      class="btn btn-primary send"
      disabled={busy || panel.draft.trim() === ""}
      onclick={() => void sendChatMessage()}
    >
      {busy ? "Running…" : "Send"}
    </button>
  </div>

  {#if aiModels.isLoading(provider)}
    <p class="loading">Reading available models from the client…</p>
  {/if}

  {#if selectValue === CUSTOM}
    <input
      class="input custom"
      placeholder="Model name passed to the CLI (e.g. claude-opus-5)"
      value={isCustomModel(provider, model) ? model : ""}
      onchange={onCustomChange}
    />
  {/if}
</div>

<style>
  .composer {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-top: 1px solid var(--color-divider);
    padding-top: 9px;
  }
  .draft {
    min-height: 54px;
    max-height: 140px;
    resize: vertical;
    font-size: 12px;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .pick {
    width: auto;
    flex: 1;
    min-width: 0;
    min-height: 26px;
    font-size: 11px;
    padding: 2px 4px;
  }
  .modes {
    display: flex;
    flex: none;
  }
  .mode {
    border: 1px solid var(--color-divider);
    background: transparent;
    color: var(--color-neutral-500);
    font: inherit;
    font-size: 10.5px;
    padding: 4px 7px;
    cursor: pointer;
  }
  .mode:first-child {
    border-radius: 6px 0 0 6px;
    border-right: none;
  }
  .mode:last-child {
    border-radius: 0 6px 6px 0;
  }
  .mode.on {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  }
  .mode.execute.on {
    border-color: #e0a36c;
    color: #e0a36c;
    background: color-mix(in srgb, #e0a36c 14%, transparent);
  }
  .mode:disabled {
    cursor: default;
    opacity: 0.75;
  }
  .send {
    flex: none;
    font-size: 12px;
    padding: 4px 12px;
  }
  .custom {
    min-height: 26px;
    font-size: 11.5px;
  }
  .loading {
    font-size: 10px;
    color: var(--color-neutral-600);
  }
</style>
