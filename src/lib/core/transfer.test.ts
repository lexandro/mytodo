import { describe, expect, it } from "vitest";
import { ensureInbox, ensurePresetLabels } from "./bootstrap";
import { createGroup } from "./groups-ops";
import { setLabelName } from "./label-names";
import { customLabels } from "./labels";
import { createList } from "./lists-ops";
import { addSubtask } from "./subtasks-ops";
import { exportJson, parseImport } from "./transfer";
import { createTodo } from "./todos-ops";
import { emptyDomainData, type DomainData, type Group } from "./types";

function fixture(): DomainData {
  const data = emptyDomainData();
  ensureInbox(data);
  ensurePresetLabels(data);
  const list = createList(data, "Work", "💼");
  const g1 = createGroup(data, list.id, null, "Backend") as Group;
  const g2 = createGroup(data, list.id, g1.id, "Auth") as Group;
  const todo = createTodo(data, list.id, g2.id, "Árvíztűrő feladat", 1);
  todo.colorLabelId = "preset-red";
  addSubtask(data, todo.id, "első lépés", 2);
  data.colorLabels.push({ id: "c1", name: "Fontos", color: "#e0567a", order: 9000 });
  setLabelName(data, list.id, "preset-red", "Blocked");
  return data;
}

describe("serialization roundtrip", () => {
  it("export → import preserves every table", () => {
    const original = fixture();
    const result = parseImport(exportJson(original, 42));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.lists).toEqual(original.lists);
    expect(result.data.groups).toEqual(original.groups);
    expect(result.data.todos).toEqual(original.todos);
    expect(result.data.subtasks).toEqual(original.subtasks);
    expect(result.data.activity).toEqual(original.activity);
    expect(result.data.colorLabels).toEqual(original.colorLabels);
    expect(result.data.labelNames).toEqual(original.labelNames);
  });

  it("restores the built-in palette for a file written before colors were rows", () => {
    const data = fixture();
    const exported = JSON.parse(exportJson(data, 1));
    exported.data.colorLabels = []; // an old export carried no palette at all
    delete exported.data.labelNames;
    const result = parseImport(JSON.stringify(exported));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.colorLabels).toHaveLength(8);
    // the todo pointed at preset-red and keeps its color
    expect(result.data.todos[0].colorLabelId).toBe("preset-red");
  });

  it("drops todo colors that the file does not define", () => {
    const data = fixture();
    const exported = JSON.parse(exportJson(data, 1));
    exported.data.todos[0].colorLabelId = "gone";
    const result = parseImport(JSON.stringify(exported));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.todos[0].colorLabelId).toBeNull();
  });
});

describe("parseImport validation", () => {
  it("rejects garbage and foreign files", () => {
    expect(parseImport("not json").ok).toBe(false);
    expect(parseImport("{}").ok).toBe(false);
    expect(parseImport('{"app":"other","format":1,"data":{}}').ok).toBe(false);
  });

  it("rejects unknown references", () => {
    const data = fixture();
    const broken = JSON.parse(exportJson(data, 1));
    broken.data.todos[0].listId = "missing";
    expect(parseImport(JSON.stringify(broken)).ok).toBe(false);
  });

  it("rejects group depth over 3 (import cannot bypass the cap)", () => {
    const data = fixture();
    const exported = JSON.parse(exportJson(data, 1));
    const g2 = data.groups[1];
    exported.data.groups.push({
      id: "g3", listId: g2.listId, parentId: g2.id, name: "L3", emoji: "", order: 1, collapsed: false,
    });
    exported.data.groups.push({
      id: "g4", listId: g2.listId, parentId: "g3", name: "L4", emoji: "", order: 1, collapsed: false,
    });
    const result = parseImport(JSON.stringify(exported));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("3-level");
  });

  it("rejects duplicate ids", () => {
    const data = fixture();
    const exported = JSON.parse(exportJson(data, 1));
    exported.data.todos.push({ ...exported.data.todos[0] });
    expect(parseImport(JSON.stringify(exported)).ok).toBe(false);
  });

  it("caps added colors at 12 and keeps every built-in", () => {
    const data = fixture();
    const exported = JSON.parse(exportJson(data, 1));
    for (let i = 0; i < 20; i += 1) {
      exported.data.colorLabels.push({ id: `x${i}`, name: null, color: "#fff", order: 10000 + i });
    }
    const result = parseImport(JSON.stringify(exported));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(customLabels(result.data)).toHaveLength(12);
    expect(result.data.colorLabels).toHaveLength(20); // 8 built-in + 12 added
  });

  it("guarantees a fixed Inbox even when the file has none", () => {
    const exported = {
      app: "mytodo", format: 1, exportedAt: 1,
      data: { lists: [], groups: [], todos: [], subtasks: [], activity: [], colorLabels: [] },
    };
    const result = parseImport(JSON.stringify(exported));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.lists.some((l) => l.fixed)).toBe(true);
  });
});
