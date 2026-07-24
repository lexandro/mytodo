// AI run engine: lifecycle (start → stream → finish/cancel), concurrency
// guard, persistence and toasts. The provider stream shapes stay inside
// core/ai-stream + core/ai-result — this module only orchestrates.
// A run is bound to its list/todo context and survives panel close and
// pane/tab switches (aiprompt §39); the panel (AI6) merely renders `runs`.

import { logActivity } from "$lib/core/activity";
import { applyProposals } from "$lib/core/ai-apply";
import { buildRunPrompt } from "$lib/core/ai-context";
import { selectProvider } from "$lib/core/ai-providers";
import { resultFromText } from "$lib/core/ai-result";
import {
  capLog, hasActiveRunForWorkspace, rowsToRuns, runToRow,
} from "$lib/core/ai-runs";
import { parseStreamLine } from "$lib/core/ai-stream";
import {
  ACTION_LABELS, ACTION_MODES, PROVIDER_LABELS, type AIAction, type AIRun,
} from "$lib/core/ai-types";
import { newId } from "$lib/core/ids";
import {
  aiRunCancel, aiRunPut, aiRunStart, aiRunsLoad, onAiRunEvent, type UnlistenFn,
} from "$lib/ipc";
import { aiConfig } from "./ai-config.svelte";
import { store } from "./store.svelte";
import { ui } from "./ui.svelte";

export type StartRunError = { message: string; openAiClients?: boolean };

interface LiveRunState {
  unlisten: UnlistenFn | null;
  resultText: string;
  providerError: string | null;
  stderrTail: string[];
  cancelRequested: boolean;
}

class AiRunsState {
  runs = $state<AIRun[]>([]);
  private live = new Map<string, LiveRunState>();

  /** Startup load; interrupted rows already surface as failed via rowToRun. */
  async load(): Promise<void> {
    try {
      this.runs = rowsToRuns(await aiRunsLoad());
    } catch (e) {
      ui.showToast(`Could not load AI run history: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  runsForList(listId: string): AIRun[] {
    return this.runs.filter((run) => run.listId === listId);
  }

  runsForTodo(todoId: string): AIRun[] {
    return this.runs.filter((run) => run.todoId === todoId);
  }

  runById(runId: string): AIRun | undefined {
    return this.runs.find((run) => run.id === runId);
  }

  /**
   * The normal entry point: builds the run context from the live domain
   * data (AIContextBuilder) and starts the run.
   */
  async startAction(params: {
    listId: string;
    todoId: string | null;
    action: AIAction;
    question?: string;
  }): Promise<StartRunError | null> {
    const link = aiConfig.linkFor(params.listId);
    if (link === undefined) return { message: "Link a workspace to use AI." };
    const question = params.question?.trim() ?? "";
    const prompt = buildRunPrompt(store.data, link, {
      action: params.action,
      listId: params.listId,
      todoId: params.todoId,
      question: question === "" ? null : question,
    });
    return this.startRun({ ...params, prompt });
  }

  /**
   * Starts a run for a prepared prompt. All guards fail with a human
   * message and NO side effects: missing/unusable workspace, unavailable
   * provider (no silent fallback), one-run-per-workspace concurrency.
   */
  async startRun(params: {
    listId: string;
    todoId: string | null;
    action: AIAction;
    prompt: string;
  }): Promise<StartRunError | null> {
    const link = aiConfig.linkFor(params.listId);
    if (link === undefined) {
      return { message: "Link a workspace to use AI." };
    }
    await aiConfig.refreshMissing(params.listId);
    if (aiConfig.isMissing(params.listId)) {
      return { message: "Workspace not found." };
    }
    const selection = selectProvider(link, aiConfig.clients);
    if (!selection.ok) {
      return { message: selection.message, openAiClients: true };
    }
    const pathByList = this.workspacePathByList();
    if (hasActiveRunForWorkspace(this.runs, pathByList, link.path)) {
      return { message: "Another AI operation is already running for this workspace." };
    }

    const run: AIRun = {
      id: newId(),
      listId: params.listId,
      todoId: params.todoId,
      provider: selection.provider,
      action: params.action,
      mode: ACTION_MODES[params.action],
      status: "running",
      startedAt: Date.now(),
      finishedAt: null,
      sessionId: null,
      log: [],
      result: null,
      error: null,
    };
    const liveState: LiveRunState = {
      unlisten: null,
      resultText: "",
      providerError: null,
      stderrTail: [],
      cancelRequested: false,
    };
    this.live.set(run.id, liveState);
    this.runs = [run, ...this.runs];
    this.persist(run);

    try {
      // subscribe BEFORE spawn — no event can be lost
      liveState.unlisten = await onAiRunEvent(run.id, (event) => this.onEvent(run.id, event));
      await aiRunStart({
        runId: run.id,
        provider: selection.provider,
        exePath: selection.path,
        workspaceDir: link.path,
        mode: run.mode,
        prompt: params.prompt,
      });
      this.logRunActivity(run, "started");
      return null;
    } catch (e) {
      this.cleanupLive(run.id);
      const message = e instanceof Error ? e.message : String(e);
      this.updateRun(run.id, { status: "failed", finishedAt: Date.now(), error: message });
      return { message, openAiClients: true };
    }
  }

  /** Explicit user cancel; the run finishes as "cancelled" on exit. */
  async cancelRun(runId: string): Promise<void> {
    const liveState = this.live.get(runId);
    if (liveState !== undefined) liveState.cancelRequested = true;
    try {
      await aiRunCancel(runId);
    } catch (e) {
      ui.showToast(`Cancel failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private onEvent(runId: string, event: { kind: string; [key: string]: unknown }): void {
    const run = this.runById(runId);
    const liveState = this.live.get(runId);
    if (run === undefined || liveState === undefined) return;
    if (event.kind === "line") {
      const line = event.line as string;
      if (event.stream === "stderr") {
        liveState.stderrTail = [...liveState.stderrTail.slice(-9), line];
        return;
      }
      const update = parseStreamLine(run.provider, line);
      const patch: Partial<AIRun> = {};
      if (update.progress !== null) patch.log = capLog([...run.log, update.progress]);
      if (update.sessionId !== null) patch.sessionId = update.sessionId;
      if (update.resultText !== null) liveState.resultText = update.resultText;
      if (update.error !== null) liveState.providerError = update.error;
      if (Object.keys(patch).length > 0) this.updateRun(runId, patch);
      return;
    }
    if (event.kind === "exit") {
      this.finishRun(runId, event.code as number | null);
    }
  }

  private finishRun(runId: string, code: number | null): void {
    const run = this.runById(runId);
    const liveState = this.live.get(runId);
    if (run === undefined || liveState === undefined) return;
    this.cleanupLive(runId);

    let patch: Partial<AIRun>;
    if (liveState.cancelRequested) {
      patch = { status: "cancelled", error: null };
    } else if (liveState.providerError !== null) {
      patch = { status: "failed", error: liveState.providerError };
    } else if (code === 0) {
      patch = { status: "completed", result: resultFromText(liveState.resultText), error: null };
    } else {
      const detail = liveState.stderrTail.join("\n").trim();
      patch = {
        status: "failed",
        error: detail === "" ? `The AI client exited with code ${code ?? "unknown"}.` : detail,
      };
    }
    patch.finishedAt = Date.now();
    this.updateRun(runId, patch);

    const finished = this.runById(runId);
    if (finished !== undefined) {
      this.persist(finished);
      this.logRunActivity(finished, finished.status);
      const label = ACTION_LABELS[finished.action];
      if (finished.status === "completed") ui.showToast(`AI ${label} completed`);
      else if (finished.status === "failed") ui.showToast(`AI ${label} failed`);
    }
  }

  /**
   * Apply Selected (aiprompt §29): validates + applies the chosen proposals
   * in ONE store.apply — a single Ctrl+Z reverts the whole batch. Invalid
   * proposals surface per-row errors and are never half-applied.
   */
  applySelected(runId: string, proposalIds: readonly string[]): Record<string, string> {
    const run = this.runById(runId);
    if (run === undefined || run.result === null) return {};
    const chosen = run.result.proposals.filter(
      (p) => proposalIds.includes(p.id) && !p.applied,
    );
    if (chosen.length === 0) return {};
    let outcome: ReturnType<typeof applyProposals> = { appliedIds: [], errors: {} };
    store.apply("apply AI proposals", (data) => {
      outcome = applyProposals(data, chosen, run.listId, Date.now());
    });
    if (outcome.appliedIds.length > 0) {
      const result = {
        ...run.result,
        proposals: run.result.proposals.map((p) =>
          outcome.appliedIds.includes(p.id) ? { ...p, applied: true } : p,
        ),
      };
      this.updateRun(runId, { result });
      const updated = this.runById(runId);
      if (updated !== undefined) this.persist(updated);
      const n = outcome.appliedIds.length;
      ui.showToast(`Applied ${n} ${n === 1 ? "change" : "changes"} — one batch, Ctrl+Z undoes it`, true);
    }
    return outcome.errors;
  }

  /** High-level activity entries on the todo the run belongs to (§30). */
  private logRunActivity(run: AIRun, phase: "started" | AIRun["status"]): void {
    const todoId = run.todoId;
    if (todoId === null) return;
    const wording = phase === "running" ? "started" : phase;
    const summary = `AI ${ACTION_LABELS[run.action]} ${wording} (${PROVIDER_LABELS[run.provider]})`;
    // activity notes about runs are not undoable edits — Ctrl+Z must not
    // eat them together with real data changes
    store.apply("ai activity", (data) => {
      logActivity(data, todoId, "ai", summary, Date.now());
    }, { undoable: false });
  }

  /** Marks proposals applied + persists (used by the apply flow in AI5). */
  updateRun(runId: string, patch: Partial<AIRun>): void {
    this.runs = this.runs.map((run) => (run.id === runId ? { ...run, ...patch } : run));
  }

  persist(run: AIRun): void {
    void aiRunPut(runToRow(run)).catch(() => {
      ui.showToast("Could not save the AI run — check the data folder.");
    });
  }

  private cleanupLive(runId: string): void {
    const liveState = this.live.get(runId);
    if (liveState !== undefined && liveState.unlisten !== null) liveState.unlisten();
    this.live.delete(runId);
  }

  private workspacePathByList(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(aiConfig.workspaces).map(([listId, link]) => [listId, link.path]),
    );
  }
}

export const aiRuns = new AiRunsState();
