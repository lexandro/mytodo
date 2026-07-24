<script lang="ts">
  // AI panel ready phase (design §AIRunPanel): task box → action cards →
  // question (Ask) → provider + status hint → mode display → brief preview
  // → Run. Execute is amber and relabels the Run button.
  import { effectiveProvider } from "$lib/core/ai-config";
  import {
    ACTION_DESCRIPTIONS, ACTION_LABELS, ACTION_MODES, PROVIDER_LABELS,
    TODO_ACTIONS, WORKSPACE_ACTIONS, isTodoAction, type AIAction,
  } from "$lib/core/ai-types";
  import { openAiClientsFromPanel, panelTodoTitle, runFromPanel } from "$lib/state/ai-actions";
  import { aiConfig } from "$lib/state/ai-config.svelte";
  import { store } from "$lib/state/store.svelte";
  import { ui, type AiPanelState } from "$lib/state/ui.svelte";

  let { panel }: { panel: AiPanelState } = $props();

  const listName = $derived(store.data.lists.find((l) => l.id === panel.listId)?.name ?? "?");
  const todoTitle = $derived(panelTodoTitle(panel));
  const link = $derived(aiConfig.linkFor(panel.listId));
  const provider = $derived(effectiveProvider(link, aiConfig.clients));
  const providerConfig = $derived(aiConfig.clients[provider]);
  const providerHint = $derived(
    !providerConfig.enabled
      ? `${PROVIDER_LABELS[provider]} is disabled in the AI Clients settings.`
      : providerConfig.path === null
        ? `${PROVIDER_LABELS[provider]} has not been detected yet.`
        : null,
  );
  const mode = $derived(ACTION_MODES[panel.action]);
  const actions = $derived(panel.todoId !== null ? [...TODO_ACTIONS, ...WORKSPACE_ACTIONS] : [...WORKSPACE_ACTIONS]);

  function pick(action: AIAction): void {
    panel.action = action;
    if (!isTodoAction(action)) return;
  }
</script>

<div class="ready">
  <div class="task-box">
    <span class="field-label">{panel.todoId !== null && isTodoAction(panel.action) ? "Task" : "Workspace"}</span>
    <p class="task-title">
      {panel.todoId !== null && isTodoAction(panel.action) ? (todoTitle ?? "?") : listName}
    </p>
  </div>

  <div class="actions">
    {#each actions as action (action)}
      <button class="action-card" class:selected={panel.action === action} onclick={() => pick(action)}>
        <span class="name">{ACTION_LABELS[action]}</span>
        <span class="desc">{ACTION_DESCRIPTIONS[action]}</span>
      </button>
    {/each}
  </div>

  {#if panel.action === "askWorkspace"}
    <textarea
      class="input question"
      placeholder="Ask one question about this workspace…"
      bind:value={panel.question}
    ></textarea>
  {/if}

  <div class="meta-row">
    <span class="field-label">Provider</span>
    <span class="provider">{PROVIDER_LABELS[provider]}{providerConfig.version === null ? "" : ` v${providerConfig.version}`}</span>
    <button class="btn btn-ghost mini" onclick={openAiClientsFromPanel}>AI Clients…</button>
  </div>
  {#if providerHint !== null}
    <p class="hint warn">{providerHint}</p>
  {/if}

  <div class="mode {mode}">
    <span class="mode-dot">●</span>
    <span class="mode-name">{mode === "analyze" ? "Analyze" : mode === "plan" ? "Plan" : "Execute"}</span>
    <span class="mode-hint">{mode === "execute" ? "may modify workspace" : "read only"}</span>
  </div>

  {#if link !== undefined && link.brief.trim() !== ""}
    <div class="brief">
      <span class="field-label">AI Brief</span>
      <p class="brief-text">{link.brief}</p>
    </div>
  {/if}

  {#if panel.error !== null}
    <div class="error-box">
      <p>⚠ {panel.error.message}</p>
      {#if panel.error.openAiClients === true}
        <button class="btn btn-secondary" onclick={openAiClientsFromPanel}>Open AI Clients…</button>
      {/if}
    </div>
  {/if}

  <button
    class="btn btn-primary run"
    class:execute={mode === "execute"}
    disabled={panel.action === "askWorkspace" && panel.question.trim() === ""}
    onclick={() => void runFromPanel()}
  >
    {mode === "execute" ? "Run — may modify workspace" : "Run"}
  </button>
</div>

<style>
  .ready {
    display: flex;
    flex-direction: column;
    gap: 11px;
  }
  .field-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--color-neutral-500);
  }
  .task-box {
    border: 1px solid var(--color-divider);
    border-radius: 7px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .task-title {
    font-size: 12.5px;
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .action-card {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
    padding: 6px 9px;
    border: 1px solid var(--color-divider);
    border-radius: 7px;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .action-card:hover {
    border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
  }
  .action-card.selected {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  }
  .action-card .name {
    font-size: 12px;
  }
  .action-card .desc {
    font-size: 10px;
    color: var(--color-neutral-500);
  }
  .question {
    min-height: 58px;
    resize: vertical;
    font-size: 12px;
  }
  .meta-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .provider {
    font-size: 12px;
    flex: 1;
  }
  .mini {
    font-size: 10.5px;
    padding: 2px 7px;
  }
  .hint {
    font-size: 10.5px;
  }
  .warn {
    color: #e0a36c;
  }
  .mode {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11.5px;
  }
  .mode-dot {
    font-size: 9px;
    color: var(--color-accent);
  }
  .mode.execute .mode-dot,
  .mode.execute .mode-name {
    color: #e0a36c;
  }
  .mode-hint {
    font-size: 10px;
    color: var(--color-neutral-500);
  }
  .brief {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .brief-text {
    font-size: 11px;
    line-height: 1.45;
    color: var(--color-neutral-400);
    white-space: pre-line;
    max-height: 80px;
    overflow-y: auto;
  }
  .error-box {
    border: 1px solid color-mix(in srgb, #e07b7b 45%, transparent);
    border-radius: 7px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
    font-size: 11.5px;
    color: #e07b7b;
  }
  .run.execute {
    border-color: #e0a36c;
    background: color-mix(in srgb, #e0a36c 18%, transparent);
    color: #e0a36c;
  }
</style>
