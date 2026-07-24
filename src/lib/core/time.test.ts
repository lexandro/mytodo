import { describe, expect, it } from "vitest";
import { formatTimestamp } from "./time";

// fixed reference: 2026-07-24 14:30 local time
const NOW = new Date(2026, 6, 24, 14, 30).getTime();

describe("formatTimestamp", () => {
  it("renders today's timestamps as Today HH:MM", () => {
    const ts = new Date(2026, 6, 24, 9, 21).getTime();
    expect(formatTimestamp(ts, NOW)).toBe("Today 09:21");
  });

  it("renders yesterday's timestamps as Yesterday HH:MM", () => {
    const ts = new Date(2026, 6, 23, 18, 11).getTime();
    expect(formatTimestamp(ts, NOW)).toBe("Yesterday 18:11");
  });

  it("renders older timestamps as Mon D HH:MM", () => {
    const ts = new Date(2026, 2, 4, 10, 3).getTime();
    expect(formatTimestamp(ts, NOW)).toBe("Mar 4 10:03");
  });
});
