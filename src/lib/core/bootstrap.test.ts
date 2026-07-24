import { describe, expect, it } from "vitest";
import { ensureInbox } from "./bootstrap";
import { emptyDomainData } from "./types";

describe("ensureInbox", () => {
  it("creates the fixed Inbox on first run", () => {
    const data = emptyDomainData();
    ensureInbox(data);
    expect(data.lists).toHaveLength(1);
    expect(data.lists[0].name).toBe("Inbox");
    expect(data.lists[0].fixed).toBe(true);
  });

  it("is a no-op when a fixed list already exists", () => {
    const data = emptyDomainData();
    ensureInbox(data);
    const inboxId = data.lists[0].id;
    ensureInbox(data);
    expect(data.lists).toHaveLength(1);
    expect(data.lists[0].id).toBe(inboxId);
  });
});
