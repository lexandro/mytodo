import { describe, expect, it } from "vitest";
import { dropZoneAt } from "./drop-zone";

describe("dropZoneAt", () => {
  it("puts the wide middle band on 'into'", () => {
    // 30px row: edges are 0–7.5 and 22.5–30
    expect(dropZoneAt(15, 30, true)).toBe("into");
    expect(dropZoneAt(8, 30, true)).toBe("into");
    expect(dropZoneAt(22, 30, true)).toBe("into");
  });

  it("keeps thin bands at the top and bottom for dropping between rows", () => {
    expect(dropZoneAt(0, 30, true)).toBe("before");
    expect(dropZoneAt(7, 30, true)).toBe("before");
    expect(dropZoneAt(23, 30, true)).toBe("after");
    expect(dropZoneAt(30, 30, true)).toBe("after");
  });

  it("falls back to a plain half-and-half split when nesting is not allowed", () => {
    expect(dropZoneAt(0, 30, false)).toBe("before");
    expect(dropZoneAt(14, 30, false)).toBe("before");
    expect(dropZoneAt(15, 30, false)).toBe("after");
    expect(dropZoneAt(30, 30, false)).toBe("after");
  });

  it("scales with the row height", () => {
    expect(dropZoneAt(5, 60, true)).toBe("before"); // edge is 15px here
    expect(dropZoneAt(20, 60, true)).toBe("into");
    expect(dropZoneAt(50, 60, true)).toBe("after");
  });

  it("survives a zero-height row instead of dividing by it", () => {
    expect(dropZoneAt(0, 0, true)).toBe("before");
    expect(dropZoneAt(10, 0, false)).toBe("before");
  });
});
