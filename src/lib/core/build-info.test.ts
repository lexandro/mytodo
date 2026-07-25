import { describe, expect, it } from "vitest";
import {
  UNKNOWN_COMMIT, displayVersion, formatBuiltAt, versionReport, versionSummary,
  type BuildInfo,
} from "./build-info";

function info(partial: Partial<BuildInfo> = {}): BuildInfo {
  return {
    version: "1.0.1",
    channel: "release",
    commit: "a1b2c3d",
    builtAt: "2026-07-25T12:32:00.000Z",
    ...partial,
  };
}

describe("displayVersion", () => {
  it("leaves a release version untouched", () => {
    expect(displayVersion(info())).toBe("1.0.1");
  });

  it("marks every non-release build with -dev", () => {
    expect(displayVersion(info({ channel: "dev" }))).toBe("1.0.1-dev");
  });
});

describe("versionSummary", () => {
  it("appends the commit in parentheses", () => {
    expect(versionSummary(info({ channel: "dev" }))).toBe("myTODO 1.0.1-dev (a1b2c3d)");
  });

  it("omits the commit when git was unavailable", () => {
    expect(versionSummary(info({ commit: UNKNOWN_COMMIT }))).toBe("myTODO 1.0.1");
  });
});

describe("formatBuiltAt", () => {
  it("formats a valid stamp in local time (timezone-independent check)", () => {
    const local = new Date(2026, 6, 25, 14, 32).toISOString();
    expect(formatBuiltAt(local)).toBe("2026-07-25 14:32");
  });

  it("returns null for an unparsable stamp", () => {
    expect(formatBuiltAt("not-a-date")).toBeNull();
  });
});

describe("versionReport", () => {
  it("lists identity, channel, commit and build time", () => {
    const local = new Date(2026, 6, 25, 14, 32).toISOString();
    expect(versionReport(info({ channel: "dev", builtAt: local }))).toBe(
      ["myTODO 1.0.1-dev (a1b2c3d)", "channel: dev", "commit: a1b2c3d", "built: 2026-07-25 14:32"].join("\n"),
    );
  });

  it("falls back to the raw stamp when it cannot be parsed", () => {
    expect(versionReport(info({ builtAt: "nope" }))).toContain("built: nope");
  });
});
