<script lang="ts">
  // Proposal review (design COMPONENTS.md §ProposalList): checkbox rows with
  // uppercase kind tags, Select all / Clear, Apply Selected as ONE undoable
  // batch. "The AI only proposes — nothing changes until you apply."
  import type { AIAction, AIProposal, ProposalKind } from "$lib/core/ai-types";
  import { aiRuns } from "$lib/state/ai-runs.svelte";

  let { runId, action, proposals }: { runId: string; action: AIAction; proposals: AIProposal[] } = $props();

  const KIND_TAG: Record<ProposalKind, string> = {
    createTodo: "CREATE TODO",
    updateTodo: "UPDATE TODO",
    changeStatus: "CHANGE STATUS",
    addSubtask: "ADD SUBTASK",
    updateSubtask: "UPDATE SUBTASK",
    moveTodo: "MOVE TODO",
    archiveTodo: "ARCHIVE TODO",
  };

  const caption = $derived(
    action === "breakIntoSubtasks"
      ? "Proposed Subtasks"
      : action === "suggestTodos"
        ? "Potential Todos"
        : action === "reconcile"
          ? "Suggested Changes"
          : "Proposed Todo Changes",
  );
  const applyLabel = $derived(action === "suggestTodos" ? "Add Selected" : "Apply Selected");

  // selection = user overrides on top of the default (AI-recommended rows
  // are pre-checked). No $effect mirroring props into state — that reads
  // and writes the same store and blows the update depth.
  let overrides = $state<Record<string, boolean>>({});
  let errors = $state<Record<string, string>>({});

  function isChecked(p: AIProposal): boolean {
    return p.applied ? false : (overrides[p.id] ?? p.recommended);
  }

  const pending = $derived(proposals.filter((p) => !p.applied));
  const selectedCount = $derived(pending.filter((p) => overrides[p.id] ?? p.recommended).length);

  function setAll(value: boolean): void {
    const next = { ...overrides };
    for (const p of pending) next[p.id] = value;
    overrides = next;
  }

  function apply(): void {
    const ids = pending.filter((p) => overrides[p.id] ?? p.recommended).map((p) => p.id);
    errors = aiRuns.applySelected(runId, ids);
  }
</script>

<div class="proposals">
  <div class="head">
    <span class="caption">{caption}</span>
    <button class="btn btn-ghost mini" onclick={() => setAll(selectedCount < pending.length)}>
      {selectedCount < pending.length ? "Select all" : "Clear selection"}
    </button>
  </div>
  <p class="note">The AI only proposes — nothing changes until you apply.</p>
  <div class="rows">
    {#each proposals as proposal (proposal.id)}
      <label class="row" class:applied={proposal.applied}>
        <input
          type="checkbox"
          disabled={proposal.applied}
          checked={isChecked(proposal)}
          onchange={(e) => (overrides = { ...overrides, [proposal.id]: e.currentTarget.checked })}
        />
        <span class="kind">{KIND_TAG[proposal.action.kind]}</span>
        <span class="label" title={proposal.label}>{proposal.label}</span>
        {#if proposal.applied}
          <span class="applied-tail">applied</span>
        {/if}
      </label>
      {#if errors[proposal.id] !== undefined}
        <p class="row-error">{errors[proposal.id]}</p>
      {/if}
    {/each}
  </div>
  <button class="btn btn-primary apply" disabled={selectedCount === 0} onclick={apply}>
    {applyLabel} ({selectedCount})
  </button>
</div>

<style>
  .proposals {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .caption {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--color-neutral-500);
  }
  .mini {
    font-size: 10.5px;
    padding: 2px 7px;
  }
  .note {
    font-size: 10px;
    color: var(--color-neutral-600);
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 7px;
    border: 1px solid var(--color-divider);
    border-radius: 6px;
    cursor: pointer;
  }
  .row:focus-within {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }
  .row.applied {
    opacity: 0.5;
    cursor: default;
  }
  .row input {
    flex: none;
  }
  .kind {
    font-size: 8.5px;
    letter-spacing: 0.05em;
    color: var(--color-neutral-500);
    flex: none;
    width: 76px;
  }
  .label {
    font-size: 11.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
  .applied-tail {
    font-size: 9.5px;
    color: #7cc98f;
    flex: none;
  }
  .row-error {
    font-size: 10.5px;
    color: #e07b7b;
    padding-left: 8px;
  }
  .apply {
    align-self: flex-start;
  }
  .apply:disabled {
    opacity: 0.45;
    cursor: default;
  }
</style>
