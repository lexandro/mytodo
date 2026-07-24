// Provider status interpretation + selection (aiprompt §10–§12, §37).
// Maps the Rust probe/test outcomes to the design's status set and human
// messages (AI_INTEGRATION.md §AI Clients); decides which provider a run
// uses — with NO silent fallback when it is unavailable.

import type { AIClientsSettings } from "./ai-config";
import { effectiveProvider } from "./ai-config";
import { PROVIDER_LABELS, type AIProviderId, type WorkspaceLink } from "./ai-types";

/** Mirrors ProbeOutcome / TestOutcome in src-tauri/src/ai/providers.rs. */
export interface ProbeOutcome {
  kind: "ok" | "missing" | "invalid" | "timeout" | "identityMismatch";
  versionOutput: string | null;
  message: string | null;
}

export interface TestOutcome {
  probe: ProbeOutcome;
  ready: boolean | null;
  readinessMessage: string | null;
}

/** Design status set: ● Detected / ◌ Detecting… / ○ Not detected / ● not ready. */
export type ProviderUiStatus = "unknown" | "detecting" | "detected" | "notDetected" | "notReady";

export interface ProviderStatusInfo {
  status: ProviderUiStatus;
  /** Short version like "2.1.4", parsed from the banner; null when unknown. */
  version: string | null;
  /** Human problem message (amber line in the card); null when fine. */
  message: string | null;
}

/** First x.y or x.y.z number in a version banner. */
export function parseVersion(raw: string | null): string | null {
  if (raw === null) return null;
  const match = raw.match(/\d+\.\d+(?:\.\d+)*/);
  return match === null ? null : match[0];
}

export function statusFromProbe(provider: AIProviderId, probe: ProbeOutcome): ProviderStatusInfo {
  const label = PROVIDER_LABELS[provider];
  switch (probe.kind) {
    case "ok":
      return { status: "detected", version: parseVersion(probe.versionOutput), message: null };
    case "missing":
      return {
        status: "notDetected",
        version: null,
        message: `${label} was not found. Install it, or select the executable with Browse….`,
      };
    case "timeout":
      return {
        status: "notDetected",
        version: null,
        message: `${label} did not respond in time. Check the installation, then try again.`,
      };
    case "identityMismatch":
      return {
        status: "notDetected",
        version: null,
        message: `The selected file does not appear to be ${label}.`,
      };
    case "invalid":
      return {
        status: "notDetected",
        version: null,
        message: probe.message ?? `The selected file is not a usable ${label} executable.`,
      };
  }
}

export function statusFromTest(provider: AIProviderId, test: TestOutcome): ProviderStatusInfo {
  const base = statusFromProbe(provider, test.probe);
  if (base.status !== "detected" || test.ready !== false) return base;
  const label = PROVIDER_LABELS[provider];
  return {
    status: "notReady",
    version: base.version,
    message: `${label} was found, but is not authenticated. Complete authentication using the ${label} CLI, then Test again.`,
  };
}

// ── run-time provider selection (no silent fallback, §10) ────────────────────

export type ProviderSelection =
  | { ok: true; provider: AIProviderId; path: string }
  | { ok: false; provider: AIProviderId; message: string };

/**
 * The provider a run must use: workspace preference else global default.
 * Unavailable (disabled / never detected) → explicit error for the user;
 * the OTHER provider is never chosen silently.
 */
export function selectProvider(
  link: WorkspaceLink | undefined,
  clients: AIClientsSettings,
): ProviderSelection {
  const provider = effectiveProvider(link, clients);
  const label = PROVIDER_LABELS[provider];
  const config = clients[provider];
  if (!config.enabled) {
    return {
      ok: false,
      provider,
      message: `${label} is disabled. Enable it in the AI Clients settings, or pick another provider for this workspace.`,
    };
  }
  if (config.path === null) {
    return {
      ok: false,
      provider,
      message: `${label} was not found. Select the executable in the AI Clients settings, or pick another provider.`,
    };
  }
  return { ok: true, provider, path: config.path };
}
