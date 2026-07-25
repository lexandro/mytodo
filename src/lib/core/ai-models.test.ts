import { describe, expect, it } from "vitest";
import {
  CLIENT_DEFAULT_LABEL, MODEL_CATALOG, isCustomModel, isValidModelName,
  modelLabel, noModels, normalizeModel, resolveModelOptions,
} from "./ai-models";

describe("isValidModelName", () => {
  it("accepts catalog names of both providers", () => {
    for (const options of Object.values(MODEL_CATALOG)) {
      for (const option of options) expect(isValidModelName(option.value)).toBe(true);
    }
  });

  it("accepts full model names and versioned custom names", () => {
    expect(isValidModelName("claude-opus-5")).toBe(true);
    expect(isValidModelName("gpt-5.6-terra")).toBe(true);
    expect(isValidModelName("openai/terra")).toBe(true); // API-style slugs too
    expect(isValidModelName("claude-fable-5[1m]")).toBe(true); // 1M variants
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
    expect(modelLabel("codex", "gpt-5.6-luna")).toBe("GPT-5.6-Luna");
    // a slug discovered at runtime has no catalog entry — show it verbatim
    expect(modelLabel("codex", "gpt-5.4-mini")).toBe("gpt-5.4-mini");
    expect(modelLabel("claude", "claude-opus-5")).toBe("claude-opus-5");
    expect(modelLabel("claude", null)).toBe(CLIENT_DEFAULT_LABEL);
  });
});

describe("resolveModelOptions", () => {
  it("a COMPLETE list replaces the catalog (Codex)", () => {
    const models = [{ value: "gpt-9-nova", label: "GPT-9-Nova", note: "brand new" }];
    expect(resolveModelOptions("codex", { models, complete: true })).toEqual(models);
  });

  it("EXTRAS are appended to the catalog (Claude Code)", () => {
    const models = [{ value: "claude-fable-5[1m]", label: "Fable 1M", note: "long context" }];
    const options = resolveModelOptions("claude", { models, complete: false });
    expect(options.slice(0, MODEL_CATALOG.claude.length)).toEqual([...MODEL_CATALOG.claude]);
    expect(options[options.length - 1]).toEqual(models[0]);
  });

  it("an extra that duplicates a catalog entry is not shown twice", () => {
    const models = [{ value: "sonnet", label: "Sonnet (cached)", note: "dup" }];
    const options = resolveModelOptions("claude", { models, complete: false });
    expect(options.filter((o) => o.value === "sonnet")).toHaveLength(1);
  });

  it("spells out an extra that shares a label with an alias", () => {
    // real case: the `fable` alias and the 1M variant are both "Fable"
    const models = [{ value: "claude-fable-5[1m]", label: "Fable", note: "1M context" }];
    const options = resolveModelOptions("claude", { models, complete: false });
    const labels = options.map((o) => o.label);
    expect(labels).toContain("Fable");
    expect(labels).toContain("Fable (claude-fable-5[1m])");
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("falls back to the catalog when nothing could be read", () => {
    expect(resolveModelOptions("codex", noModels())).toBe(MODEL_CATALOG.codex);
    expect(resolveModelOptions("claude", noModels())).toBe(MODEL_CATALOG.claude);
  });
});

describe("isCustomModel", () => {
  it("separates catalog picks from free-text names", () => {
    expect(isCustomModel("claude", "haiku")).toBe(false);
    expect(isCustomModel("claude", "claude-haiku-4-5-20251001")).toBe(true);
    expect(isCustomModel("codex", "gpt-5.6-sol")).toBe(false);
    expect(isCustomModel("codex", null)).toBe(false);
  });
});
