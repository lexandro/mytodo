<script lang="ts">
  // Result blocks (design COMPONENTS.md §AIResult): task-execution-record
  // look — only the blocks the action produced, in a fixed order.
  import { modelLabel } from "$lib/core/ai-models";
  import { PROVIDER_LABELS, type AIRun } from "$lib/core/ai-types";
  import { aiRuns } from "$lib/state/ai-runs.svelte";
  import AIProposalList from "./AIProposalList.svelte";

  let { run }: { run: AIRun } = $props();

  const result = $derived(run.result);
  const elapsed = $derived(
    run.finishedAt === null ? "" : `${Math.round((run.finishedAt - run.startedAt) / 1000)}s`,
  );
  const model = $derived(modelLabel(run.provider, run.model));
  let detailsOpen = $state(false);

  const VERDICT_LABEL = {
    complete: "Complete",
    partial: "Partially complete",
    incomplete: "Incomplete",
    uncertain: "Uncertain",
  } as const;

  function applyRecommendation(): void {
    const proposalId = result?.recommendation?.proposalId;
    if (proposalId != null) aiRuns.applySelected(run.id, [proposalId]);
  }

  const recommendedApplied = $derived(
    result?.proposals.find((p) => p.id === result?.recommendation?.proposalId)?.applied === true,
  );
</script>

{#if result !== null}
  <div class="result">
    <p class="status-line">{PROVIDER_LABELS[run.provider]} · {model} · {elapsed}</p>
    {#if result.question !== null}
      <div class="block"><span class="field-label">Question</span><p class="text">{result.question}</p></div>
    {/if}
    {#if result.verdict !== null}
      <div class="verdict {result.verdict.value}">
        <span class="verdict-value">{VERDICT_LABEL[result.verdict.value]}</span>
        <span class="verdict-why">{result.verdict.why}</span>
      </div>
    {/if}
    {#if result.summary !== null}
      <div class="block">
        <!-- a chat answer is prose: labelling it "Summary" would read as a form -->
        {#if run.action !== "chat"}
          <span class="field-label">Summary</span>
        {/if}
        <p class="text">{result.summary}</p>
      </div>
    {/if}
    {#if result.answer !== null}
      <div class="block"><span class="field-label">Answer</span><p class="text">{result.answer}</p></div>
    {/if}
    {#if result.checks.length > 0}
      <div class="block">
        <span class="field-label">Checks</span>
        {#each result.checks as check, i (i)}
          <p class="check" class:bad={!check.ok}>{check.ok ? "✓" : "⚠"} {check.text}</p>
        {/each}
      </div>
    {/if}
    {#if result.mapping.length > 0}
      <div class="block">
        <span class="field-label">Todos ↔ workspace</span>
        {#each result.mapping as row, i (i)}
          <p class="map-row">
            <span class="map-text">{row.text}</span>
            <span class="map-tone {row.tone}">
              {row.tone === "done" ? "Likely completed" : row.tone === "missing" ? "Still missing" : row.tone === "partial" ? "Partially completed" : "New suggestion"}
            </span>
          </p>
        {/each}
      </div>
    {/if}
    {#if result.findings.length > 0}
      <div class="block">
        <span class="field-label">Findings</span>
        {#each result.findings as finding, i (i)}
          <p class="finding">{finding}</p>
        {/each}
      </div>
    {/if}
    {#if result.recommendation !== null}
      <div class="recommendation">
        <span class="field-label">Recommendation</span>
        <p class="text">{result.recommendation.text}</p>
        {#if result.recommendation.proposalId !== null}
          <button class="btn btn-secondary" disabled={recommendedApplied} onclick={applyRecommendation}>
            {recommendedApplied ? "Applied" : "Apply Recommendation"}
          </button>
        {/if}
      </div>
    {/if}
    {#if result.proposals.length > 0}
      <AIProposalList runId={run.id} action={run.action} proposals={result.proposals} />
    {/if}
    {#if run.log.length > 0}
      <button class="btn btn-ghost details-toggle" onclick={() => (detailsOpen = !detailsOpen)}>
        {detailsOpen ? "Hide details" : "Show details"}
      </button>
      {#if detailsOpen}
        <pre class="log">{run.log.join("\n")}</pre>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .result {
    display: flex;
    flex-direction: column;
    gap: 11px;
  }
  .status-line {
    font-size: 10.5px;
    color: var(--color-neutral-500);
    font-variant-numeric: tabular-nums;
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .field-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--color-neutral-500);
  }
  .text {
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-line;
  }
  .verdict {
    border: 1px solid var(--color-divider);
    border-radius: 7px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .verdict-value {
    font-size: 12.5px;
    font-weight: 500;
  }
  .verdict.complete .verdict-value { color: #7cc98f; }
  .verdict.partial .verdict-value { color: #e0a36c; }
  .verdict.incomplete .verdict-value { color: #e07b7b; }
  .verdict-why {
    font-size: 11px;
    color: var(--color-neutral-400);
  }
  .check {
    font-size: 11.5px;
    color: #7cc98f;
  }
  .check.bad {
    color: #e0a36c;
  }
  .map-row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 11.5px;
  }
  .map-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .map-tone {
    flex: none;
    font-size: 10.5px;
  }
  .map-tone.done { color: #7cc98f; }
  .map-tone.missing { color: #e07b7b; }
  .map-tone.partial { color: #e0a36c; }
  .map-tone.new { color: var(--color-accent); }
  .finding {
    font-size: 11.5px;
    line-height: 1.45;
    border-left: 2px solid var(--color-divider);
    padding-left: 8px;
  }
  .recommendation {
    border: 1px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
    border-radius: 7px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: flex-start;
  }
  .details-toggle {
    align-self: flex-start;
    font-size: 11px;
  }
  .log {
    font-family: var(--font-mono, "Cascadia Mono", Consolas, monospace);
    font-size: 10.5px;
    line-height: 1.5;
    color: var(--color-neutral-400);
    background: color-mix(in srgb, var(--color-text) 4%, transparent);
    border-radius: 6px;
    padding: 8px;
    overflow-x: auto;
    white-space: pre-wrap;
  }
</style>
