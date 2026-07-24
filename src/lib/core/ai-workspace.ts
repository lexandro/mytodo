// Pure linked-workspace helpers: basename display, status → link mapping.
// The actual filesystem probing lives behind ipc.ts (workspace_check).

import type { WorkspaceLink, WorkspaceType } from "./ai-types";

/** Mirrors WorkspaceStatus in src-tauri/src/workspace.rs. */
export interface WorkspaceStatus {
  exists: boolean;
  readable: boolean;
  git: boolean;
}

/** Last path segment for chip display; handles \ and /, trailing separators. */
export function workspaceBasename(path: string): string {
  const parts = path.split(/[\\/]+/).filter((part) => part !== "");
  return parts.length === 0 ? path : parts[parts.length - 1];
}

export function isUsableWorkspace(status: WorkspaceStatus): boolean {
  return status.exists && status.readable;
}

export function workspaceTypeFromStatus(status: WorkspaceStatus): WorkspaceType {
  return status.git ? "git" : "generic";
}

export const WORKSPACE_TYPE_LABELS: Record<WorkspaceType, string> = {
  git: "Git repository",
  generic: "Generic folder",
};

export function newWorkspaceLink(path: string, status: WorkspaceStatus): WorkspaceLink {
  return { path, type: workspaceTypeFromStatus(status), brief: "", preferredProvider: null };
}

/** Locate…/Change…: new directory, brief + preferred provider survive. */
export function relocatedWorkspaceLink(
  prev: WorkspaceLink,
  path: string,
  status: WorkspaceStatus,
): WorkspaceLink {
  return { ...prev, path, type: workspaceTypeFromStatus(status) };
}
