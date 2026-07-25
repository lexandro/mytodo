import { describe, expect, it } from "vitest";
import {
  CLIENT_DEFAULT_LABEL, MODEL_CATALOG, isCustomModel, isValidModelName,
  modelLabel, normalizeModel,
} from "./ai-models";

describe("isValidModelName", () => {
  it("accepts catalog names of both providers", () => {
    for (const options of Object.values(MODEL_CATALOG)) {
      for (const option of options) expect(isValidModelName(option.value)).toBe(true);
    }
  });

  it("accepts full model names and versioned custom names", () => {
    expect(isValidModelName("claude-opus-5")).toBe(true);
    expect(isValidModelName("gpt-5.4")).toBe(true);
    expect(isValidModelName("openai/terra")).toBe(true);
  });

  it("rejects anything that could be read as a flag or shell text", () => {
    expect(isValidModelName("--dangerously-skip-permissions")).toBe(false);
    expect(isValidModelName("-p")).toBe(false);
    expect(isValidModelName("sonnet && del *")).toBe(false);
    expect(isValidModelName("sonnet extra")).toBe(false);
    expect(isValidModelName("")).toBe(false);
    expect(isValidModelName("x".repeat(65))).toBe(false);
  });
});

describe("normalizeModel", () => {
  it("keeps a valid name and drops everything else", () => {
    expect(normalizeModel("sonnet")).toBe("sonnet");
    expect(normalizeModel("--evil")).toBeNull();
    expect(normalizeModel(null)).toBeNull();
    expect(normalizeModel(42)).toBeNull();
  });
});

describe("modelLabel", () => {
  it("uses the catalog label, the raw name, or the default wording", () => {
    expect(modelLabel("claude", "sonnet")).toBe("Sonnet");
    expect(modelLabel("codex", "openai/luna")).toBe("Luna");
    expect(modelLabel("claude", "claude-opus-5")).toBe("claude-opus-5");
    expect(modelLabel("claude", null)).toBe(CLIENT_DEFAULT_LABEL);
  });
});

describe("isCustomModel", () => {
  it("separates catalog picks from free-text names", () => {
    expect(isCustomModel("claude", "haiku")).toBe(false);
    expect(isCustomModel("claude", "claude-haiku-4-5-20251001")).toBe(true);
    expect(isCustomModel("codex", null)).toBe(false);
  });
});
