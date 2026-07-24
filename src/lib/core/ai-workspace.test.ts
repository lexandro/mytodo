import { describe, expect, it } from "vitest";
import {
  isUsableWorkspace, newWorkspaceLink, relocatedWorkspaceLink, workspaceBasename,
  workspaceTypeFromStatus, type WorkspaceStatus,
} from "./ai-workspace";

const ok = (git: boolean): WorkspaceStatus => ({ exists: true, readable: true, git });

describe("workspaceBasename", () => {
  it("returns the last segment for windows and mixed separators", () => {
    expect(workspaceBasename("C:\\Projects\\conference")).toBe("conference");
    expect(workspaceBasename("C:/Projects/conference/")).toBe("conference");
    expect(workspaceBasename("\\\\server\\share\\árvíztűrő tükörfúrógép")).toBe("árvíztűrő tükörfúrógép");
  });

  it("falls back to the raw path for a bare drive root", () => {
    expect(workspaceBasename("C:\\")).toBe("C:");
    expect(workspaceBasename("")).toBe("");
  });
});

describe("status mapping", () => {
  it("usable requires exists AND readable", () => {
    expect(isUsableWorkspace(ok(false))).toBe(true);
    expect(isUsableWorkspace({ exists: true, readable: false, git: false })).toBe(false);
    expect(isUsableWorkspace({ exists: false, readable: false, git: false })).toBe(false);
  });

  it("git flag decides the workspace type", () => {
    expect(workspaceTypeFromStatus(ok(true))).toBe("git");
    expect(workspaceTypeFromStatus(ok(false))).toBe("generic");
  });
});

describe("link construction", () => {
  it("new link starts with empty brief and no preferred provider", () => {
    expect(newWorkspaceLink("C:\\p", ok(true))).toEqual({
      path: "C:\\p",
      type: "git",
      brief: "",
      preferredProvider: null,
    });
  });

  it("relocation keeps brief + provider but re-detects the type", () => {
    const prev = newWorkspaceLink("C:\\old", ok(true));
    const moved = relocatedWorkspaceLink(
      { ...prev, brief: "Bun only", preferredProvider: "codex" },
      "D:\\new",
      ok(false),
    );
    expect(moved).toEqual({ path: "D:\\new", type: "generic", brief: "Bun only", preferredProvider: "codex" });
  });
});
