import { describe, expect, it } from "vitest";
import { ensurePresetLabels } from "./bootstrap";
import {
  clearListLabelNames, labelName, labelNameId, labelNameOverride, setLabelName,
} from "./label-names";
import { emptyDomainData, type DomainData } from "./types";

function seeded(): DomainData {
  const data = emptyDomainData();
  ensurePresetLabels(data);
  data.lists.push({ id: "work", name: "Work", emoji: "", fixed: false, colorLabelId: null, order: 1000 });
  data.lists.push({ id: "home", name: "Home", emoji: "", fixed: false, colorLabelId: null, order: 2000 });
  return data;
}

describe("labelName", () => {
  it("uses the central name until a list renames the color", () => {
    const data = seeded();
    expect(labelName(data, "work", "preset-blue")).toBe("Blue");
    setLabelName(data, "work", "preset-blue", "Waiting for review");
    expect(labelName(data, "work", "preset-blue")).toBe("Waiting for review");
    expect(labelName(data, "home", "preset-blue")).toBe("Blue");
  });

  it("shows the central name where there is no list context", () => {
    const data = seeded();
    setLabelName(data, "work", "preset-blue", "Waiting for review");
    expect(labelName(data, null, "preset-blue")).toBe("Blue");
  });

  it("reports None for no label", () => {
    expect(labelName(seeded(), "work", null)).toBe("None");
  });
});

describe("setLabelName", () => {
  it("writes one row per list/label pair and updates it in place", () => {
    const data = seeded();
    setLabelName(data, "work", "preset-red", "Blocked");
    setLabelName(data, "work", "preset-red", "On hold");
    expect(data.labelNames).toHaveLength(1);
    expect(data.labelNames[0].id).toBe(labelNameId("work", "preset-red"));
    expect(data.labelNames[0].name).toBe("On hold");
  });

  it("clears the override for an empty value", () => {
    const data = seeded();
    setLabelName(data, "work", "preset-red", "Blocked");
    setLabelName(data, "work", "preset-red", "   ");
    expect(data.labelNames).toHaveLength(0);
    expect(labelNameOverride(data, "work", "preset-red")).toBeNull();
  });

  it("stores nothing when the name equals the central one", () => {
    const data = seeded();
    setLabelName(data, "work", "preset-red", "Red");
    expect(data.labelNames).toHaveLength(0);
  });

  it("trims what it stores", () => {
    const data = seeded();
    setLabelName(data, "work", "preset-red", "  Blocked  ");
    expect(labelNameOverride(data, "work", "preset-red")).toBe("Blocked");
  });
});

describe("clearListLabelNames", () => {
  it("drops only the deleted list's names", () => {
    const data = seeded();
    setLabelName(data, "work", "preset-red", "Blocked");
    setLabelName(data, "home", "preset-red", "Errands");
    clearListLabelNames(data, "work");
    expect(data.labelNames.map((e) => e.listId)).toEqual(["home"]);
  });
});
