// Model catalog per AI client — the FALLBACK list. Neither CLI has a "list
// models" command, but Codex caches the models its account may use, so the
// backend can offer the real ones (src-tauri/src/ai/models.rs); this catalog
// is what we show until/unless that succeeds. A free-text "custom" value is
// always allowed — an unknown name simply fails visibly in the run.
// null = pass no --model flag at all, i.e. the client's own default.

import type { AIProviderId } from "./ai-types";

export interface ModelOption {
  /** Value passed to the CLI's --model flag. */
  value: string;
  label: string;
  /** Short "when to pick this" note for the picker. */
  note: string;
}

export const MODEL_CATALOG: Record<AIProviderId, readonly ModelOption[]> = {
  claude: [
    { value: "opus", label: "Opus", note: "most capable" },
    { value: "sonnet", label: "Sonnet", note: "balanced" },
    { value: "haiku", label: "Haiku", note: "fastest" },
    { value: "fable", label: "Fable", note: "latest alias" },
  ],
  // codex exec wants the real slugs: `openai/sol` is rejected by the backend
  // for ChatGPT-account logins even though the interactive TUI accepts it
  codex: [
    { value: "gpt-5.6-sol", label: "GPT-5.6-Sol", note: "most capable" },
    { value: "gpt-5.6-terra", label: "GPT-5.6-Terra", note: "balanced" },
    { value: "gpt-5.6-luna", label: "GPT-5.6-Luna", note: "fast and affordable" },
  ],
};

/** What a client reported about its own models (see ai/models.rs). */
export interface DiscoveredModels {
  models: ModelOption[];
  /** true = the complete list (Codex); false = extras on top (Claude Code). */
  complete: boolean;
}

export function noModels(): DiscoveredModels {
  return { models: [], complete: false };
}

/**
 * What the picker offers. A complete list replaces the catalog; extras are
 * appended to it (first entry wins on duplicate names). Nothing discovered
 * leaves the catalog untouched.
 */
export function resolveModelOptions(
  provider: AIProviderId,
  discovered: DiscoveredModels,
): readonly ModelOption[] {
  const catalog = MODEL_CATALOG[provider];
  if (discovered.models.length === 0) return catalog;
  if (discovered.complete) return discovered.models;
  const knownValues = new Set(catalog.map((option) => option.value));
  const knownLabels = new Set(catalog.map((option) => option.label));
  const extras = discovered.models
    .filter((option) => !knownValues.has(option.value))
    // an extra may share its label with an alias ("Fable" vs the 1M variant);
    // spelling out the name keeps the two rows distinguishable
    .map((option) =>
      knownLabels.has(option.label) ? { ...option, label: `${option.label} (${option.value})` } : option,
    );
  return [...catalog, ...extras];
}

/** Label for the "use whatever the CLI is configured for" choice. */
export const CLIENT_DEFAULT_LABEL = "Client default";

export const MAX_MODEL_NAME_LENGTH = 64;

/**
 * Model names travel into the CLI argv, so the charset is restricted: no
 * leading dash (would read as a flag) and no whitespace or shell-ish
 * characters. Brackets are allowed — real names use them
 * (`claude-fable-5[1m]`) and they mean nothing to CreateProcess or cmd.exe.
 * Mirrored by validate_model in src-tauri/src/ai/run.rs.
 */
export function isValidModelName(name: string): boolean {
  if (name === "" || name.length > MAX_MODEL_NAME_LENGTH) return false;
  if (name.startsWith("-")) return false;
  return /^[A-Za-z0-9._/:[\]-]+$/.test(name);
}

/** Persisted value → the name to send, or null for the client's default. */
export function normalizeModel(raw: unknown): string | null {
  return typeof raw === "string" && isValidModelName(raw) ? raw : null;
}

/** Display name: catalog label when known, else the raw name. */
export function modelLabel(provider: AIProviderId, model: string | null): string {
  if (model === null) return CLIENT_DEFAULT_LABEL;
  return MODEL_CATALOG[provider].find((option) => option.value === model)?.label ?? model;
}

/** True when the model is a free-text name rather than a catalog entry. */
export function isCustomModel(provider: AIProviderId, model: string | null): boolean {
  return model !== null && !MODEL_CATALOG[provider].some((option) => option.value === model);
}
