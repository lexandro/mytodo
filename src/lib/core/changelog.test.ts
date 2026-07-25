import { describe, expect, it } from "vitest";
import { currentRelease, parseChangelog, parseInline } from "./changelog";

const SAMPLE = `# Changelog

Intro text that must be ignored.

## Unreleased

### Added

- **Conversations** — follow-up messages continue the client's own
  session, so the assistant remembers the thread.
- Plain item with \`code\` in it.

### Fixed

- A [linked](https://example.com) fix.

## v1.0.1 — 2026-07-24

Short release intro.

### Fixed

- **Recording a shortcut** no longer triggers it.
`;

const plain = (text: string) => ({ text, bold: false, italic: false, code: false });

describe("parseInline", () => {
  it("splits bold, italic, code and plain runs in order", () => {
    expect(parseInline("**Bold** then *soft* then `code` then plain")).toEqual([
      { text: "Bold", bold: true, italic: false, code: false },
      plain(" then "),
      { text: "soft", bold: false, italic: true, code: false },
      plain(" then "),
      { text: "code", bold: false, italic: false, code: true },
      plain(" then plain"),
    ]);
  });

  it("does not mistake bold for two italics", () => {
    expect(parseInline("**Settings → Files**")).toEqual([
      { text: "Settings → Files", bold: true, italic: false, code: false },
    ]);
  });

  it("keeps a link's text and drops its target", () => {
    expect(parseInline("see [Semantic Versioning](https://semver.org) here")).toEqual([
      plain("see "),
      plain("Semantic Versioning"),
      plain(" here"),
    ]);
  });

  it("returns a single plain run for plain text", () => {
    expect(parseInline("nothing special")).toEqual([plain("nothing special")]);
  });
});

describe("parseChangelog", () => {
  const releases = parseChangelog(SAMPLE);

  it("keeps file order and separates unreleased from versioned entries", () => {
    expect(releases).toHaveLength(2);
    expect(releases[0]).toMatchObject({ version: null, date: null });
    expect(releases[1]).toMatchObject({ version: "1.0.1", date: "2026-07-24" });
  });

  it("groups items under their section", () => {
    expect(releases[0].sections.map((s) => s.title)).toEqual(["Added", "Fixed"]);
    expect(releases[0].sections[0].items).toHaveLength(2);
    expect(releases[0].sections[1].items).toHaveLength(1);
  });

  it("joins a wrapped bullet into one item", () => {
    const first = releases[0].sections[0].items[0];
    const text = first.map((s) => s.text).join("");
    expect(text).toBe(
      "Conversations — follow-up messages continue the client's own session, so the assistant remembers the thread.",
    );
    expect(first[0]).toEqual({ text: "Conversations", bold: true, italic: false, code: false });
  });

  it("keeps a release intro but drops the file's own intro", () => {
    expect(releases[1].intro).toBe("Short release intro.");
    expect(releases[0].intro).toBeNull();
    expect(JSON.stringify(releases)).not.toContain("must be ignored");
  });

  it("survives an empty or headingless file", () => {
    expect(parseChangelog("")).toEqual([]);
    expect(parseChangelog("just prose\n\n- a bullet")).toEqual([]);
  });
});

describe("currentRelease", () => {
  const releases = parseChangelog(SAMPLE);

  it("a release build points at its own version", () => {
    expect(currentRelease(releases, "1.0.1", false)?.version).toBe("1.0.1");
    expect(currentRelease(releases, "9.9.9", false)).toBeUndefined();
  });

  it("a dev build points at the unreleased block", () => {
    expect(currentRelease(releases, "1.0.1", true)?.version).toBeNull();
  });

  it("a dev build with no unreleased block falls back to its version", () => {
    const onlyReleased = parseChangelog("## v1.0.1 — 2026-07-24\n\n### Fixed\n\n- x\n");
    expect(currentRelease(onlyReleased, "1.0.1", true)?.version).toBe("1.0.1");
  });
});
