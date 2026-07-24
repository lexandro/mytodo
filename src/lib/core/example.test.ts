import { describe, expect, it } from "vitest";
import { formatDuration } from "./example";

describe("formatDuration", () => {
  it("formats minutes and seconds", () => {
    expect(formatDuration(187)).toBe("3:07");
    expect(formatDuration(0)).toBe("0:00");
  });

  it("formats hours with padded minutes", () => {
    expect(formatDuration(5025)).toBe("1:23:45");
  });

  it("clamps negatives to zero", () => {
    expect(formatDuration(-5)).toBe("0:00");
  });
});
