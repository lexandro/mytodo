import { describe, expect, it } from "vitest";
import { formatEmojiName, parseEmojiName } from "./emoji";

describe("parseEmojiName", () => {
  it("splits a leading emoji from the name", () => {
    expect(parseEmojiName("🎤 Conference App")).toEqual({ emoji: "🎤", name: "Conference App" });
  });

  it("handles variation-selector emoji", () => {
    expect(parseEmojiName("🖥️ Home Server")).toEqual({ emoji: "🖥️", name: "Home Server" });
  });

  it("leaves plain names untouched", () => {
    expect(parseEmojiName("Conference App")).toEqual({ emoji: null, name: "Conference App" });
  });

  it("does not treat mid-string emoji as a prefix", () => {
    expect(parseEmojiName("App 🎤 name").emoji).toBeNull();
  });
});

describe("formatEmojiName", () => {
  it("round-trips with parseEmojiName", () => {
    const formatted = formatEmojiName("🎤", "Conference App");
    expect(parseEmojiName(formatted)).toEqual({ emoji: "🎤", name: "Conference App" });
    expect(formatEmojiName("", "Plain")).toBe("Plain");
  });
});
