import { describe, expect, it } from "vitest";
import { ensureInbox } from "./bootstrap";
import {
  duplicateMany, everyDone, everyPinned, setArchivedMany, setColorLabelMany, setPinMany,
  setStatusMany, titleLines, trashMany,
} from "./bulk-ops";
import { createList } from "./lists-ops";
import { createTodo, findTodo, setStatus } from "./todos-ops";
import { nestTodo } from "./todos-tree-ops";
import { emptyDomainData, type DomainData } from "./types";

/** Three top-level todos in one list: "one", "two", "three". */
function base(): { data: DomainData; listId: string; ids: string[] } {
  const data = emptyDomainData();
  ensureInbox(data);
  const list = createList(data, "Work");
  const ids = ["one", "two", "three"].map(
    (title, i) => createTodo(data, list.id, null, title, i + 1).id,
  );
  return { data, listId: list.id, ids };
}

describe("setStatusMany", () => {
  it("reports only the rows that really changed", () => {
    const { data, ids } = base();
    setStatus(data, ids[0], "done", 5);
    expect(setStatusMany(data, ids, "done", 10)).toEqual([ids[1], ids[2]]);
    expect(ids.every((id) => findTodo(data, id)?.status === "done")).toBe(true);
  });
});

describe("everyDone", () => {
  it("is false while one row is still open, and false for nothing selected", () => {
    const { data, ids } = base();
    setStatusMany(data, [ids[0], ids[1]], "done", 5);
    expect(everyDone(data, ids)).toBe(false);
    setStatus(data, ids[2], "done", 6);
    expect(everyDone(data, ids)).toBe(true);
    expect(everyDone(data, [])).toBe(false);
  });
});

describe("setPinMany", () => {
  it("pins a mixed selection outright instead of flipping each row", () => {
    const { data, ids } = base();
    setPinMany(data, [ids[0]], "local", true, 5);
    expect(everyPinned(data, ids, "local")).toBe(false);
    // the action layer's rule: not all pinned → pin all
    expect(setPinMany(data, ids, "local", true, 6)).toBe(2); // the pinned one was left alone
    expect(everyPinned(data, ids, "local")).toBe(true);
    expect(everyPinned(data, ids, "global")).toBe(false);
  });
});

describe("setColorLabelMany", () => {
  it("counts only the rows whose color moved", () => {
    const { data, ids } = base();
    expect(setColorLabelMany(data, ids, "preset-red", 5)).toBe(3);
    expect(setColorLabelMany(data, ids, "preset-red", 6)).toBe(0);
    expect(findTodo(data, ids[1])?.colorLabelId).toBe("preset-red");
  });
});

describe("setArchivedMany", () => {
  it("archives a selected branch once and counts every row it took", () => {
    const { data, ids } = base();
    nestTodo(data, ids[1], ids[0], 5); // "two" becomes a sub-item of "one"
    // both are selected, but only the root is operated on — the sub-item follows
    expect(setArchivedMany(data, [ids[0], ids[1]], true, 6)).toBe(2);
    expect(findTodo(data, ids[1])?.archived).toBe(true);
    expect(findTodo(data, ids[2])?.archived).toBe(false);
  });

  it("ignores rows that are already where they should be", () => {
    const { data, ids } = base();
    setArchivedMany(data, [ids[0]], true, 5);
    expect(setArchivedMany(data, ids, true, 6)).toBe(2);
  });
});

describe("trashMany", () => {
  it("takes whole branches and counts the selected rows that went", () => {
    const { data, ids } = base();
    nestTodo(data, ids[1], ids[0], 5);
    expect(trashMany(data, [ids[0], ids[1]], 6)).toBe(2);
    expect(findTodo(data, ids[0])?.trashed).toBe(true);
    expect(findTodo(data, ids[2])?.trashed).toBe(false);
  });

  it("is a no-op on an already trashed selection", () => {
    const { data, ids } = base();
    trashMany(data, [ids[0]], 5);
    expect(trashMany(data, [ids[0]], 6)).toBe(0);
  });
});

describe("duplicateMany", () => {
  it("makes one copy per selected row", () => {
    const { data, ids } = base();
    const copies = duplicateMany(data, [ids[0], ids[2]], 5);
    expect(copies).toHaveLength(2);
    expect(copies.map((id) => findTodo(data, id)?.title)).toEqual(["one", "three"]);
    expect(data.todos).toHaveLength(5);
  });
});

describe("titleLines", () => {
  it("joins the titles with CRLF for the Windows clipboard", () => {
    const { data, ids } = base();
    expect(titleLines(data, ids)).toBe("one\r\ntwo\r\nthree");
    expect(titleLines(data, ["gone"])).toBe("");
  });
});
