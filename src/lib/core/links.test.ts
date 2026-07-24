import { describe, expect, it } from "vitest";
import { detectLinks, isSafeWindowsPath } from "./links";

describe("detectLinks", () => {
  it("finds http and https URLs", () => {
    const links = detectLinks("see https://example.com/x and http://foo.hu/y?a=1");
    expect(links).toEqual([
      { type: "url", text: "https://example.com/x" },
      { type: "url", text: "http://foo.hu/y?a=1" },
    ]);
  });

  it("trims trailing punctuation from URLs", () => {
    expect(detectLinks("(https://example.com/page).")).toEqual([
      { type: "url", text: "https://example.com/page" },
    ]);
  });

  it("finds Windows drive and UNC paths", () => {
    const links = detectLinks("open C:\\Projects\\conference\\backend\\auth and \\\\nas\\backups\\photos");
    expect(links).toEqual([
      { type: "path", text: "C:\\Projects\\conference\\backend\\auth" },
      { type: "path", text: "\\\\nas\\backups\\photos" },
    ]);
  });

  it("handles mixed multiline descriptions and dedupes", () => {
    const desc = "Session token expires.\n\nhttps://gitlab.com/conf/-/issues/214\nC:\\Projects\\conf\\auth\nhttps://gitlab.com/conf/-/issues/214";
    const links = detectLinks(desc);
    expect(links).toHaveLength(2);
  });

  it("returns nothing for plain text", () => {
    expect(detectLinks("just some notes, C: drive mentioned casually")).toEqual([]);
  });
});

describe("isSafeWindowsPath", () => {
  it("accepts normal absolute and UNC paths", () => {
    expect(isSafeWindowsPath("C:\\Users\\lex\\file.txt")).toBe(true);
    expect(isSafeWindowsPath("\\\\server\\share\\dir")).toBe(true);
  });

  it("rejects relative paths, illegal chars and ADS colons", () => {
    expect(isSafeWindowsPath("..\\..\\evil")).toBe(false);
    expect(isSafeWindowsPath("C:\\file<script>")).toBe(false);
    expect(isSafeWindowsPath("C:\\file.txt:hidden")).toBe(false);
    expect(isSafeWindowsPath("C:\\")).toBe(false);
  });
});
