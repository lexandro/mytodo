// Final-result normalization (aiprompt §23–§24): the run prompt asks the
// agent to end with a fenced ```json envelope; this module extracts it and
// maps it to AIRunResult. Order of preference: fenced JSON → whole-text
// JSON → controlled fallback (the text becomes the summary). Proposals get
// local ids and derived labels — the provider never dictates row identity.

import { parseProposalAction } from "./ai-proposals";
import { parseRunResult } from "./ai-runs";
import { STATUS_LABEL } from "./activity";
import type { AIProposal, AIRunResult, ProposalAction } from "./ai-types";
import { emptyRunResult } from "./ai-types";

const FENCE_RE = /```(?:json)?\s*\n([\s\S]*?)```/g;

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** LAST fenced JSON block wins — earlier fences may be examples/quotes. */
function extractEnvelope(text: string): unknown {
  let lastFence: string | null = null;
  for (const match of text.matchAll(FENCE_RE)) lastFence = match[1];
  if (lastFence !== null) {
    const parsed = tryParse(lastFence.trim());
    if (parsed !== null) return parsed;
  }
  return tryParse(text.trim());
}

export function proposalLabel(action: ProposalAction): string {
  switch (action.kind) {
    case "createTodo":
      return `Create todo "${action.title}"`;
    case "updateTodo":
      return action.title === null ? "Update todo description" : `Rename todo to "${action.title}"`;
    case "changeStatus":
      return `Change status to ${STATUS_LABEL[action.status]}`;
    case "addSubtask":
      return `Add subtask "${action.text}"`;
    case "updateSubtask":
      return action.checked === null ? "Update subtask text" : `Mark subtask ${action.checked ? "done" : "open"}`;
    case "moveTodo":
      return "Move todo";
    case "archiveTodo":
      return "Archive todo";
  }
}

/**
 * Raw envelope proposals → reviewable AIProposal rows: strict action shape
 * (invalid entries dropped), local ids, derived labels, recommended
 * defaults to true (pre-checked in the review UI).
 */
function normalizeProposals(raw: unknown): AIProposal[] {
  if (!Array.isArray(raw)) return [];
  const proposals: AIProposal[] = [];
  for (const entry of raw) {
    const action = parseProposalAction(entry);
    if (action === null) continue;
    const v = entry as Record<string, unknown>;
    proposals.push({
      id: `p${proposals.length + 1}`,
      label: typeof v.label === "string" && v.label !== "" ? v.label : proposalLabel(action),
      recommended: typeof v.recommended === "boolean" ? v.recommended : true,
      applied: false,
      action,
    });
  }
  return proposals;
}

/**
 * Final agent text → structured result. Never throws: a malformed envelope
 * degrades to a summary-only result (§24 controlled fallback).
 */
export function resultFromText(text: string): AIRunResult {
  const envelope = extractEnvelope(text);
  if (typeof envelope !== "object" || envelope === null) {
    const fallback = emptyRunResult();
    fallback.summary = text.trim() === "" ? null : text.trim();
    return fallback;
  }
  const raw = envelope as Record<string, unknown>;
  const result = parseRunResult(raw);
  // envelope proposals come WITHOUT ids/flags — normalize them here
  result.proposals = normalizeProposals(raw.proposals);
  // envelope recommendation: {text, proposal?} — the optional action becomes
  // a proposal row so "Apply Recommendation" flows through the same boundary
  result.recommendation = null;
  const rec = raw.recommendation as Record<string, unknown> | null | undefined;
  if (typeof rec === "object" && rec !== null && typeof rec.text === "string") {
    const action = parseProposalAction(rec.proposal);
    if (action === null) {
      result.recommendation = { text: rec.text, proposalId: null };
    } else {
      const proposal: AIProposal = {
        id: `p${result.proposals.length + 1}`,
        label: proposalLabel(action),
        recommended: true,
        applied: false,
        action,
      };
      result.proposals.push(proposal);
      result.recommendation = { text: rec.text, proposalId: proposal.id };
    }
  }
  if (result.summary === null && result.answer === null && result.findings.length === 0) {
    // envelope parsed but empty-ish: keep the raw text so nothing is lost
    result.summary = text.trim() === "" ? null : text.trim();
  }
  return result;
}
