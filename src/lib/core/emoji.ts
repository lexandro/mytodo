// Inline-rename convention: a leading emoji + space in the rename input edits
// the emoji together with the name ("🎤 Conference App").

export interface EmojiName {
  emoji: string | null;
  name: string;
}

const LEADING_EMOJI = /^(\p{Extended_Pictographic}️?)\s+(.*)$/u;

export function parseEmojiName(value: string): EmojiName {
  const match = value.match(LEADING_EMOJI);
  if (match === null) return { emoji: null, name: value };
  return { emoji: match[1], name: match[2] };
}

/** Inverse: the initial value shown in the rename input. */
export function formatEmojiName(emoji: string, name: string): string {
  return emoji === "" ? name : `${emoji} ${name}`;
}
