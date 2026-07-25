// CHANGELOG.md → structured releases for the What's new dialog. myTODO has
// no markdown renderer (and a changelog does not justify pulling one in), so
// this parses the strict subset the file actually uses and the UI renders it
// as real elements — no `{@html}`, nothing to escape.
//
// Recognised structure:
//   ## Unreleased            → an unreleased block
//   ## v1.0.1 — 2026-07-24   → a released version (— or - before the date)
//   ### Added                → a section inside the release
//   - item text              → a bullet, continuation lines are joined
// Inline: **bold**, `code`, [text](url) → text. Everything before the first
// `##` (the file's intro) is ignored.

export interface InlineSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
}

export interface ChangelogSection {
  title: string;
  items: InlineSegment[][];
}

export interface ChangelogRelease {
  /** null = the Unreleased block. */
  version: string | null;
  date: string | null;
  /** Free text under the heading, before the first section. */
  intro: string | null;
  sections: ChangelogSection[];
}

const RELEASE_HEADING = /^##\s+(.+?)\s*$/;
const SECTION_HEADING = /^###\s+(.+?)\s*$/;
const BULLET = /^[-*]\s+(.*)$/;
const VERSION_DATE = /^v?(\d+\.\d+\.\d+)\s*(?:[—–-]\s*(\S+))?$/;
// bold before italic — otherwise `**x**` would match as two italics
const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]*\))/g;

/** One bullet's text → bold/italic/code/plain runs, in order. */
export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const push = (raw: string, style: Partial<InlineSegment> = {}): void => {
    if (raw !== "") segments.push({ text: raw, bold: false, italic: false, code: false, ...style });
  };
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const token = match[0];
    push(text.slice(last, match.index));
    if (token.startsWith("**")) push(token.slice(2, -2), { bold: true });
    else if (token.startsWith("*")) push(token.slice(1, -1), { italic: true });
    else if (token.startsWith("`")) push(token.slice(1, -1), { code: true });
    else push(token.slice(1, token.indexOf("]"))); // link text only
    last = (match.index ?? 0) + token.length;
  }
  push(text.slice(last));
  return segments;
}

function startRelease(heading: string): ChangelogRelease {
  const versioned = VERSION_DATE.exec(heading);
  return {
    version: versioned === null ? null : versioned[1],
    date: versioned?.[2] ?? null,
    intro: null,
    sections: [],
  };
}

/** Newest first — the file's own order is kept. */
export function parseChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let release: ChangelogRelease | null = null;
  let section: ChangelogSection | null = null;
  let bullet: string[] | null = null;

  const flushBullet = (): void => {
    if (bullet === null || section === null) return;
    section.items.push(parseInline(bullet.join(" ")));
    bullet = null;
  };

  for (const line of markdown.split(/\r?\n/)) {
    const releaseHeading = RELEASE_HEADING.exec(line);
    if (releaseHeading !== null) {
      flushBullet();
      release = startRelease(releaseHeading[1]);
      releases.push(release);
      section = null;
      continue;
    }
    if (release === null) continue; // the file's intro
    const sectionHeading = SECTION_HEADING.exec(line);
    if (sectionHeading !== null) {
      flushBullet();
      section = { title: sectionHeading[1], items: [] };
      release.sections.push(section);
      continue;
    }
    const bulletStart = BULLET.exec(line.trim());
    if (bulletStart !== null && section !== null) {
      flushBullet();
      bullet = [bulletStart[1]];
      continue;
    }
    const text = line.trim();
    if (text === "") {
      flushBullet();
      continue;
    }
    if (bullet !== null) {
      bullet.push(text); // wrapped bullet line
    } else if (section === null) {
      release.intro = release.intro === null ? text : `${release.intro} ${text}`;
    }
  }
  flushBullet();
  return releases;
}

/**
 * Which entry describes the running build: the matching version, or the
 * Unreleased block for a dev build whose version is not published yet.
 */
export function currentRelease(
  releases: readonly ChangelogRelease[],
  version: string,
  isDev: boolean,
): ChangelogRelease | undefined {
  const released = releases.find((entry) => entry.version === version);
  if (!isDev) return released;
  return releases.find((entry) => entry.version === null) ?? released;
}
