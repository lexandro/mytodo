import { describe, expect, it } from "vitest";
import { defaultAiClients } from "./ai-config";
import type { WorkspaceLink } from "./ai-types";
import {
  parseVersion, selectProvider, statusFromProbe, statusFromTest,
  type ProbeOutcome, type TestOutcome,
} from "./ai-providers";

const okProbe: ProbeOutcome = { kind: "ok", versionOutput: "2.1.4 (Claude Code)", message: null };

describe("parseVersion", () => {
  it("extracts the first dotted number from a banner", () => {
    expect(parseVersion("2.1.4 (Claude Code)")).toBe("2.1.4");
    expect(parseVersion("codex-cli 0.5.0")).toBe("0.5.0");
    expect(parseVersion("v1.2")).toBe("1.2");
  });

  it("returns null for missing/unparseable output", () => {
    expect(parseVersion(null)).toBeNull();
    expect(parseVersion("no numbers here")).toBeNull();
  });
});

describe("statusFromProbe", () => {
  it("ok → detected with parsed version", () => {
    expect(statusFromProbe("claude", okProbe)).toEqual({
      status: "detected",
      version: "2.1.4",
      message: null,
    });
  });

  it("missing/timeout/identity → notDetected with a human message", () => {
    const missing = statusFromProbe("codex", { kind: "missing", versionOutput: null, message: null });
    expect(missing.status).toBe("notDetected");
    expect(missing.message).toContain("Codex was not found");
    const identity = statusFromProbe("claude", { kind: "identityMismatch", versionOutput: null, message: null });
    expect(identity.message).toContain("does not appear to be Claude Code");
  });

  it("invalid passes through the backend's specific message", () => {
    const invalid = statusFromProbe("claude", {
      kind: "invalid",
      versionOutput: null,
      message: "'.txt' is not an executable type (expected .exe, .cmd or .bat).",
    });
    expect(invalid.message).toContain(".txt");
  });
});

describe("statusFromTest", () => {
  it("probe ok + ready=false → notReady with the auth message", () => {
    const test: TestOutcome = { probe: okProbe, ready: false, readinessMessage: "Not logged in" };
    const info = statusFromTest("codex", test);
    expect(info.status).toBe("notReady");
    expect(info.message).toContain("not authenticated");
    expect(info.version).toBe("2.1.4");
  });

  it("probe ok + unknown readiness stays detected (never a false alarm)", () => {
    const info = statusFromTest("claude", { probe: okProbe, ready: null, readinessMessage: null });
    expect(info.status).toBe("detected");
  });

  it("failed probe wins over readiness", () => {
    const info = statusFromTest("codex", {
      probe: { kind: "missing", versionOutput: null, message: null },
      ready: null,
      readinessMessage: null,
    });
    expect(info.status).toBe("notDetected");
  });
});

describe("selectProvider — no silent fallback (aiprompt §10)", () => {
  const link = (preferred: WorkspaceLink["preferredProvider"]): WorkspaceLink => ({
    path: "C:\\p",
    type: "git",
    brief: "",
    preferredProvider: preferred,
  });

  it("uses the preferred provider when configured and available", () => {
    const clients = defaultAiClients();
    clients.codex.path = "C:\\bin\\codex.cmd";
    const result = selectProvider(link("codex"), clients);
    expect(result).toEqual({ ok: true, provider: "codex", path: "C:\\bin\\codex.cmd" });
  });

  it("falls back to the global default ONLY when no preference is set", () => {
    const clients = defaultAiClients();
    clients.defaultClient = "codex";
    clients.codex.path = "C:\\bin\\codex.cmd";
    expect(selectProvider(link(null), clients)).toMatchObject({ ok: true, provider: "codex" });
  });

  it("preferred-but-missing provider errors instead of silently switching", () => {
    const clients = defaultAiClients();
    clients.claude.path = "C:\\bin\\claude.exe"; // the OTHER one is available
    const result = selectProvider(link("codex"), clients);
    expect(result.ok).toBe(false);
    expect(result.provider).toBe("codex");
    if (!result.ok) expect(result.message).toContain("Codex was not found");
  });

  it("disabled provider errors with an enable hint", () => {
    const clients = defaultAiClients();
    clients.claude.enabled = false;
    clients.claude.path = "C:\\bin\\claude.exe";
    const result = selectProvider(undefined, clients);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("disabled");
  });
});
