import { describe, expect, it } from "vitest";
import { ORDER_STEP, byOrder, needsRebalance, orderBetween, rebalance } from "./ordering";

describe("orderBetween", () => {
  it("starts at ORDER_STEP in an empty scope", () => {
    expect(orderBetween(null, null)).toBe(ORDER_STEP);
  });

  it("appends after the last item", () => {
    expect(orderBetween(3000, null)).toBe(3000 + ORDER_STEP);
  });

  it("prepends before the first item", () => {
    expect(orderBetween(null, 1000)).toBe(0);
  });

  it("takes the midpoint between neighbours", () => {
    expect(orderBetween(1000, 2000)).toBe(1500);
  });
});

describe("needsRebalance", () => {
  it("is false while precision holds", () => {
    expect(needsRebalance(1500, 1000, 2000)).toBe(false);
  });

  it("detects a collapsed midpoint", () => {
    // adjacent doubles: their midpoint rounds onto one of them
    const prev = 1;
    const next = 1 + Number.EPSILON;
    const mid = orderBetween(prev, next);
    expect(needsRebalance(mid, prev, next)).toBe(true);
  });
});

describe("rebalance", () => {
  it("reassigns even spacing and reports only changed items", () => {
    const items = [
      { id: "a", order: 1000 },
      { id: "b", order: 1000.0000001 },
      { id: "c", order: 3000 },
    ];
    const changed = rebalance(items);
    expect(items.map((i) => i.order)).toEqual([1000, 2000, 3000]);
    expect(changed.map((i) => i.id)).toEqual(["b"]);
  });
});

describe("byOrder", () => {
  it("sorts by order with id tiebreaker", () => {
    const items = [
      { id: "b", order: 2 },
      { id: "c", order: 1 },
      { id: "a", order: 2 },
    ];
    expect([...items].sort(byOrder).map((i) => i.id)).toEqual(["c", "a", "b"]);
  });
});
