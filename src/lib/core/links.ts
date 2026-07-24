// Auto-link detection in plain-text descriptions (daprompt §22): web URLs,
// Windows file/directory paths. Detection only — opening happens through
// ipc.ts with the safety checks in the action layer.

export interface DetectedLink {
  type: "url" | "path";
  text: string;
}

// http(s)://… up to whitespace; trailing punctuation that is almost never
// part of the URL is trimmed.
const URL_RE = /https?:\/\/[^\s<>"]+/g;
// drive-letter paths (C:\dir\file) and UNC paths (\\server\share\…);
// stops at characters illegal in Windows paths.
const PATH_RE = /(?:[A-Za-z]:\\|\\\\)[^\s<>:"|?*]+/g;

function trimTrailingPunctuation(raw: string): string {
  return raw.replace(/[.,;:!?)\]}'"]+$/, "");
}

export function detectLinks(text: string): DetectedLink[] {
  const links: DetectedLink[] = [];
  const seen = new Set<string>();
  const push = (type: "url" | "path", raw: string): void => {
    const cleaned = trimTrailingPunctuation(raw);
    if (cleaned.length === 0 || seen.has(cleaned)) return;
    seen.add(cleaned);
    links.push({ type, text: cleaned });
  };
  for (const match of text.matchAll(URL_RE)) push("url", match[0]);
  for (const match of text.matchAll(PATH_RE)) push("path", match[0]);
  return links;
}

/** Basic sanity check before handing a path to the OS opener. */
export function isSafeWindowsPath(path: string): boolean {
  const hasDrivePrefix = /^[A-Za-z]:\\/.test(path);
  if (!hasDrivePrefix && !path.startsWith("\\\\")) return false;
  // after the prefix: no control chars (U+0000–U+001F), no characters
  // illegal in Windows paths, no further colons (blocks NTFS ADS tricks)
  const rest = hasDrivePrefix ? path.slice(3) : path.slice(2);
  for (const ch of rest) {
    const code = ch.charCodeAt(0);
    if (code < 0x20) return false;
    if ('<>:"|?*'.includes(ch)) return false;
  }
  return rest.length > 0;
}
