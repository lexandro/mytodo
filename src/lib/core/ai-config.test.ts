import { describe, expect, it } from "vitest";
import {
  defaultAiClients, effectiveProvider, normalizeAiClients, normalizeWorkspaceLinks,
} from "./ai-config";
import type { WorkspaceLink } from "./ai-types";

describe("normalizeAiClients", () => {
  it("returns defaults for garbage input", () => {
    expect(normalizeAiClients(undefined)).toEqual(defaultAiClients());
    expect(normalizeAiClients("nope")).toEqual(defaultAiClients());
    expect(normalizeAiClients(42)).toEqual(defaultAiClients());
  });

  it("keeps valid fields and repairs invalid ones per provider", () => {
    const result = normalizeAiClients({
      claude: { enabled: false, path: "C:\\bin\\claude.exe", version: "2.1.4" },
      codex: { enabled: "yes", path: 7, version: "" },
      defaultClient: "codex",
    });
    expect(result.claude).toEqual({ enabled: false, path: "C:\\bin\\claude.exe", version: "2.1.4" });
    expect(result.codex).toEqual({ enabled: true, path: null, version: null });
    expect(result.defaultClient).toBe("codex");
  });

  it("rejects an unknown defaultClient", () => {
    expect(normalizeAiClients({ defaultClient: "gemini" }).defaultClient).toBe("claude");
  });
});

describe("normalizeWorkspaceLinks", () => {
  it("drops entries without a path and keeps valid siblings", () => {
    const links = normalizeWorkspaceLinks({
      l1: { path: "C:\\Projects\\conference", type: "git", brief: "Bun only", preferredProvider: "claude" },
      l2: { path: "", type: "git" },
      l3: { type: "generic" },
      l4: null,
    });
    expect(Object.keys(links)).toEqual(["l1"]);
    expect(links.l1.brief).toBe("Bun only");
  });

  it("repairs unknown type/provider to safe values", () => {
    const links = normalizeWorkspaceLinks({
      l1: { path: "D:\\árvíztűrő tükörfúrógép", type: "svn", brief: 3, preferredProvider: "gemini" },
    });
    expect(links.l1).toEqual({
      path: "D:\\árvíztűrő tükörfúrógép",
      type: "generic",
      brief: "",
      preferredProvider: null,
    });
  });

  it("returns empty map for non-object input", () => {
    expect(normalizeWorkspaceLinks(null)).toEqual({});
    expect(normalizeWorkspaceLinks([1, 2])).toEqual({});
  });
});

describe("effectiveProvider", () => {
  const link = (preferred: WorkspaceLink["preferredProvider"]): WorkspaceLink => ({
    path: "C:\\p",
    type: "generic",
    brief: "",
    preferredProvider: preferred,
  });

  it("workspace preference wins over the global default", () => {
    const clients = { ...defaultAiClients(), defaultClient: "claude" as const };
    expect(effectiveProvider(link("codex"), clients)).toBe("codex");
  });

  it("falls back to the global default when unset or unlinked", () => {
    const clients = { ...defaultAiClients(), defaultClient: "codex" as const };
    expect(effectiveProvider(link(null), clients)).toBe("codex");
    expect(effectiveProvider(undefined, clients)).toBe("codex");
  });
});
