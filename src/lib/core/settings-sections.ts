// Settings is a sidebar + one section at a time. The registry is pure data so
// the dialog, the command palette and every "open Settings here" entry point
// agree on the same ids, labels and order.

export type SettingsSectionId =
  | "appearance"
  | "todo-colors"
  | "list-colors"
  | "behavior"
  | "shortcuts"
  | "files";

export interface SettingsSection {
  id: SettingsSectionId;
  /** Sidebar entry. */
  label: string;
  /** Sidebar glyph — the app ships no icon font, these are plain characters. */
  glyph: string;
  /** One-line summary shown under the section heading. */
  hint: string;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    id: "appearance",
    label: "Appearance",
    glyph: "◐",
    hint: "Theme, window scale and the size of the todo text.",
  },
  {
    id: "todo-colors",
    label: "Todo colors",
    glyph: "◍",
    hint: "The shared color palette — colors carry categories, so give them names.",
  },
  {
    id: "list-colors",
    label: "List colors",
    glyph: "◒",
    hint: "A separate palette for the lists themselves — rail, tabs and panes.",
  },
  {
    id: "behavior",
    label: "Behavior",
    glyph: "⇅",
    hint: "How todos react to what you do with them.",
  },
  {
    id: "shortcuts",
    label: "Shortcuts",
    glyph: "⌨",
    hint: "System-wide hotkeys — they work while myTODO is in the background.",
  },
  {
    id: "files",
    label: "Files",
    glyph: "▤",
    hint: "Where your data and backups live on disk.",
  },
];

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = SETTINGS_SECTIONS[0].id;

export function isSettingsSectionId(value: unknown): value is SettingsSectionId {
  return SETTINGS_SECTIONS.some((section) => section.id === value);
}

/** Falls back to the first section — an unknown id must never blank the dialog. */
export function settingsSection(id: SettingsSectionId): SettingsSection {
  return SETTINGS_SECTIONS.find((section) => section.id === id) ?? SETTINGS_SECTIONS[0];
}
