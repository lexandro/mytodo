import { describe, expect, it } from "vitest";
import { LIST_ICONS } from "./list-icons";

describe("LIST_ICONS", () => {
  it("offers 36 icons — six themed rows of six", () => {
    expect(LIST_ICONS).toHaveLength(36);
    expect(LIST_ICONS.length % 6).toBe(0);
  });

  it("has no duplicates", () => {
    expect(new Set(LIST_ICONS).size).toBe(LIST_ICONS.length);
  });

  it("holds single emoji, never empty strings or plain text", () => {
    for (const icon of LIST_ICONS) {
      expect(icon.length).toBeGreaterThan(0);
      expect(/^\p{Extended_Pictographic}️?$/u.test(icon)).toBe(true);
    }
  });
});
