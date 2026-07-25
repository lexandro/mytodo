// AI client + workspace-link settings models (aiprompt §10/§41): stored as
// JSON in the portable SQLite settings table under the keys below. Values
// arriving from disk are untrusted (another machine, older version) — the
// normalize functions accept unknown and fall back field-by-field, so a
// broken value can never take the app down. Credentials are never stored.

import { normalizeModel } from "./ai-models";
import { isProviderId, type AIProviderId, type WorkspaceLink, type WorkspaceType } from "./ai-types";

export const AI_CLIENTS_KEY = "aiClients";
export const WORKSPACES_KEY = "workspaces";

/** Persisted per-provider config; runtime status (detected/ready) is not. */
export interface AIClientConfig {
  enabled: boolean;
  /** Validated executable path, or null when never detected/selected. */
  path: string | null;
  /** Version reported by the validated executable (display only). */
  version: string | null;
  /**
   * Model passed to this client's --model flag; null = the client's own
   * default. Global per client (the panel's picker writes here too), because
   * neither CLI can enumerate its models for us.
   */
  model: string | null;
}

export interface AIClientsSettings {
  claude: AIClientConfig;
  codex: AIClientConfig;
  defaultClient: AIProviderId;
}

/** listId → linked workspace. Missing key = list is unlinked. */
export type WorkspaceLinks = Record<string, WorkspaceLink>;

export function defaultAiClients(): AIClientsSettings {
  const client = (): AIClientConfig => ({
    enabled: true, path: null, version: null, model: null,
  });
  return { claude: client(), codex: client(), defaultClient: "claude" };
}

function normalizeClient(raw: unknown, fallback: AIClientConfig): AIClientConfig {
  if (typeof raw !== "object" || raw === null) return fallback;
  const v = raw as Record<string, unknown>;
  return {
    enabled: typeof v.enabled === "boolean" ? v.enabled : fallback.enabled,
    path: typeof v.path === "string" && v.path !== "" ? v.path : null,
    version: typeof v.version === "string" && v.version !== "" ? v.version : null,
    // a bogus name from disk must never reach the CLI argv
    model: normalizeModel(v.model),
  };
}

export function normalizeAiClients(raw: unknown): AIClientsSettings {
  const defaults = defaultAiClients();
  if (typeof raw !== "object" || raw === null) return defaults;
  const v = raw as Record<string, unknown>;
  return {
    claude: normalizeClient(v.claude, defaults.claude),
    codex: normalizeClient(v.codex, defaults.codex),
    defaultClient: isProviderId(v.defaultClient) ? v.defaultClient : defaults.defaultClient,
  };
}

function isWorkspaceType(value: unknown): value is WorkspaceType {
  return value === "git" || value === "generic";
}

function normalizeLink(raw: unknown): WorkspaceLink | null {
  if (typeof raw !== "object" || raw === null) return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.path !== "string" || v.path === "") return null;
  return {
    path: v.path,
    type: isWorkspaceType(v.type) ? v.type : "generic",
    brief: typeof v.brief === "string" ? v.brief : "",
    preferredProvider: isProviderId(v.preferredProvider) ? v.preferredProvider : null,
  };
}

/** Invalid entries are dropped; a valid link never blocks on a broken one. */
export function normalizeWorkspaceLinks(raw: unknown): WorkspaceLinks {
  if (typeof raw !== "object" || raw === null) return {};
  const links: WorkspaceLinks = {};
  for (const [listId, value] of Object.entries(raw as Record<string, unknown>)) {
    const link = normalizeLink(value);
    if (link !== null) links[listId] = link;
  }
  return links;
}

/**
 * The provider a run on this workspace should use: the workspace preference
 * when set, else the global default. Availability is NOT checked here — an
 * unavailable provider must fail visibly, never silently fall back (§10).
 */
export function effectiveProvider(
  link: WorkspaceLink | undefined,
  clients: AIClientsSettings,
): AIProviderId {
  return link?.preferredProvider ?? clients.defaultClient;
}
