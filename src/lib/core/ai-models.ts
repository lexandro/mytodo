// Model catalog per AI client. Neither CLI can list its models (there is no
// `claude models` / `codex models` command), so the catalog is curated here
// and a free-text "custom" value is always allowed — an unknown name simply
// fails visibly in the run, the same way a wrong flag would.
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
  codex: [
    { value: "openai/sol", label: "Sol", note: "most capable" },
    { value: "openai/terra", label: "Terra", note: "balanced" },
    { value: "openai/luna", label: "Luna", note: "cheapest" },
  ],
};

/** Label for the "use whatever the CLI is configured for" choice. */
export const CLIENT_DEFAULT_LABEL = "Client default";

export const MAX_MODEL_NAME_LENGTH = 64;

/**
 * Model names travel into the CLI argv, so the charset is restricted: no
 * leading dash (would read as a flag) and no whitespace or shell-ish
 * characters. Mirrored by validate_model in src-tauri/src/ai/run.rs.
 */
export function isValidModelName(name: string): boolean {
  if (name === "" || name.length > MAX_MODEL_NAME_LENGTH) return false;
  if (name.startsWith("-")) return false;
  return /^[A-Za-z0-9._/:-]+$/.test(name);
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
