import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS_SECTION, SETTINGS_SECTIONS, isSettingsSectionId, settingsSection,
} from "./settings-sections";

describe("SETTINGS_SECTIONS", () => {
  it("has unique ids", () => {
    const ids = SETTINGS_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every section a label, a glyph and a hint", () => {
    for (const section of SETTINGS_SECTIONS) {
      expect(section.label.length).toBeGreaterThan(0);
      expect(section.glyph.length).toBeGreaterThan(0);
      expect(section.hint.length).toBeGreaterThan(0);
    }
  });

  it("defaults to the first section", () => {
    expect(DEFAULT_SETTINGS_SECTION).toBe(SETTINGS_SECTIONS[0].id);
  });
});

describe("isSettingsSectionId", () => {
  it("accepts every registered id", () => {
    for (const section of SETTINGS_SECTIONS) {
      expect(isSettingsSectionId(section.id)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(isSettingsSectionId("nope")).toBe(false);
    expect(isSettingsSectionId(null)).toBe(false);
    expect(isSettingsSectionId(3)).toBe(false);
  });
});

describe("settingsSection", () => {
  it("resolves a known id", () => {
    expect(settingsSection("files").label).toBe("Files");
  });

  it("falls back to the first section for an unknown id", () => {
    // a persisted id from an older build must never blank the dialog
    const unknown = "gone" as unknown as (typeof SETTINGS_SECTIONS)[number]["id"];
    expect(settingsSection(unknown)).toBe(SETTINGS_SECTIONS[0]);
  });
});
