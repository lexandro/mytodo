import { describe, expect, it } from "vitest";
import { ensurePresetLabels } from "./bootstrap";
import { setLabelName } from "./label-names";
import {
  DEFAULT_LABELS, canAddCustomLabel, centralLabelName, customLabels, deleteCustomLabel,
  isBuiltinLabel, labelColor, nextLabelOrder, resetBuiltinLabels, sortedLabels, tintBackground,
} from "./labels";
import {
  MAX_CUSTOM_LABELS, emptyDomainData, type DomainData, type PaletteKind,
} from "./types";

function seeded(): DomainData {
  const data = emptyDomainData();
  ensurePresetLabels(data);
  return data;
}

function addCustom(
  data: DomainData,
  id: string,
  name: string | null = null,
  kind: PaletteKind = "todo",
): void {
  data.colorLabels.push({ id, kind, name, color: "#123456", order: nextLabelOrder(data, kind) });
}

describe("built-in palette", () => {
  it("seeds both palettes with their default names", () => {
    const data = seeded();
    expect(sortedLabels(data, "todo").map((l) => l.name))
      .toEqual(DEFAULT_LABELS.todo.map((d) => d.name));
    expect(sortedLabels(data, "list").map((l) => l.name))
      .toEqual(DEFAULT_LABELS.list.map((d) => d.name));
  });

  it("keeps the two palettes apart", () => {
    const data = seeded();
    const todoIds = sortedLabels(data, "todo").map((l) => l.id);
    const listIds = sortedLabels(data, "list").map((l) => l.id);
    expect(todoIds.some((id) => listIds.includes(id))).toBe(false);
  });

  it("leaves an already customised built-in alone on the next launch", () => {
    const data = seeded();
    const red = data.colorLabels.find((l) => l.id === "preset-red");
    if (red === undefined) throw new Error("seed failed");
    red.name = "Blocked";
    red.color = "#ff0000";
    ensurePresetLabels(data);
    expect(data.colorLabels.filter((l) => l.id === "preset-red")).toHaveLength(1);
    expect(red.name).toBe("Blocked");
  });

  it("restores a built-in that went missing (a todo may still point at it)", () => {
    const data = seeded();
    data.colorLabels = data.colorLabels.filter((l) => l.id !== "preset-blue");
    ensurePresetLabels(data);
    expect(labelColor(data, "preset-blue")).toBe("#6ca3e0");
  });

  it("knows which ids are built-in", () => {
    expect(isBuiltinLabel("preset-green")).toBe(true);
    expect(isBuiltinLabel("anything-else")).toBe(false);
  });
});

describe("added colors", () => {
  it("keeps built-ins out of the custom count and its cap", () => {
    const data = seeded();
    expect(customLabels(data, "todo")).toHaveLength(0);
    expect(canAddCustomLabel(data, "todo")).toBe(true);
    for (let i = 0; i < MAX_CUSTOM_LABELS; i += 1) addCustom(data, `c${i}`);
    expect(customLabels(data, "todo")).toHaveLength(MAX_CUSTOM_LABELS);
    expect(canAddCustomLabel(data, "todo")).toBe(false);
    // the list palette has its own cap
    expect(canAddCustomLabel(data, "list")).toBe(true);
  });

  it("orders a new color after everything else in its own palette", () => {
    const data = seeded();
    addCustom(data, "c1");
    expect(sortedLabels(data, "todo").at(-1)?.id).toBe("c1");
    expect(sortedLabels(data, "list").at(-1)?.id).toBe("list-slate");
  });

  it("deleting one clears the todos, lists and per-list names that used it", () => {
    const data = seeded();
    data.lists.push({
      id: "l1", name: "Work", emoji: "", fixed: false, colorLabelId: "lc1", order: 1000,
    });
    addCustom(data, "c1", "Fontos");
    addCustom(data, "lc1", "Deep sea", "list");
    data.todos.push({
      id: "t1", listId: "l1", groupId: null, title: "T", description: "", status: "open",
      emoji: "", colorLabelId: "c1", pinLocal: false, pinGlobal: false, archived: false,
      trashed: false, trashedAt: null, order: 1000, createdAt: 1, updatedAt: 1,
    });
    setLabelName(data, "l1", "c1", "Sürgős");

    deleteCustomLabel(data, "c1");
    deleteCustomLabel(data, "lc1");

    expect(customLabels(data, "todo")).toHaveLength(0);
    expect(customLabels(data, "list")).toHaveLength(0);
    expect(data.todos[0].colorLabelId).toBeNull();
    expect(data.lists[0].colorLabelId).toBeNull();
    expect(data.labelNames).toHaveLength(0);
  });

  it("refuses to delete a built-in", () => {
    const data = seeded();
    deleteCustomLabel(data, "preset-red");
    expect(labelColor(data, "preset-red")).toBe("#e07b7b");
  });
});

describe("tintBackground", () => {
  it("is transparent without a color and a faint mix with one", () => {
    expect(tintBackground(null)).toBe("transparent");
    expect(tintBackground("#5fc2b0")).toContain("#5fc2b0");
  });
});

describe("names and colors", () => {
  it("falls back to the hex when an added color has no name", () => {
    const data = seeded();
    addCustom(data, "c1", null);
    expect(centralLabelName(data, "c1")).toBe("#123456");
  });

  it("reports None for an unset or unknown label", () => {
    const data = seeded();
    expect(centralLabelName(data, null)).toBe("None");
    expect(centralLabelName(data, "gone")).toBe("None");
    expect(labelColor(data, "gone")).toBeNull();
  });
});

describe("resetBuiltinLabels", () => {
  it("restores the shipped name, color and order — and keeps added colors", () => {
    const data = seeded();
    addCustom(data, "c1", "Fontos");
    const red = data.colorLabels.find((l) => l.id === "preset-red");
    if (red === undefined) throw new Error("seed failed");
    red.name = "Blocked";
    red.color = "#000000";

    resetBuiltinLabels(data, "todo");

    expect(red.name).toBe("Red");
    expect(red.color).toBe("#e07b7b");
    expect(customLabels(data, "todo").map((l) => l.name)).toEqual(["Fontos"]);
  });

  it("touches only the palette it was asked for", () => {
    const data = seeded();
    const listBlue = data.colorLabels.find((l) => l.id === "list-blue");
    if (listBlue === undefined) throw new Error("seed failed");
    listBlue.name = "Ocean";

    resetBuiltinLabels(data, "todo");
    expect(listBlue.name).toBe("Ocean");

    resetBuiltinLabels(data, "list");
    expect(listBlue.name).toBe("Blue");
  });
});
