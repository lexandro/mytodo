// Build metadata shown in the About dialog. The raw values are baked into the
// bundle at build time (vite.config.js `define` → $lib/build-info); this
// module only shapes them for display, so it stays pure and testable.

export type BuildChannel = "release" | "dev";

export interface BuildInfo {
  /** Semver from package.json, e.g. "1.0.1". */
  version: string;
  /** "release" only for tag builds made by the release workflow. */
  channel: BuildChannel;
  /** Short git hash, or UNKNOWN_COMMIT outside a git checkout. */
  commit: string;
  /** ISO-8601 timestamp of the build. */
  builtAt: string;
}

export const APP_NAME = "myTODO";

export const UNKNOWN_COMMIT = "unknown";

/**
 * Dev builds carry a `-dev` suffix so a build from a working tree is never
 * mistaken for the released binary of the same version.
 */
export function displayVersion(info: BuildInfo): string {
  return info.channel === "release" ? info.version : `${info.version}-dev`;
}

/** Single-line identity, e.g. "myTODO 1.0.1-dev (a1b2c3d)". */
export function versionSummary(info: BuildInfo): string {
  const commit = info.commit === UNKNOWN_COMMIT ? "" : ` (${info.commit})`;
  return `${APP_NAME} ${displayVersion(info)}${commit}`;
}

/** Local-time "2026-07-25 14:32"; null when the stamp is unparsable. */
export function formatBuiltAt(builtAt: string): string | null {
  const date = new Date(builtAt);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number): string => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Multi-line block behind the About dialog's copy button (for bug reports). */
export function versionReport(info: BuildInfo): string {
  return [
    versionSummary(info),
    `channel: ${info.channel}`,
    `commit: ${info.commit}`,
    `built: ${formatBuiltAt(info.builtAt) ?? info.builtAt}`,
  ].join("\n");
}
