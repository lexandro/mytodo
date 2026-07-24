# DESIGN.md — myTODO design specification

## Design philosophy
1. **Speed over features.** Capture a todo in seconds without leaving flow: quick-add is always visible, Enter creates, no modal, no Save button.
2. **Keyboard-first.** Every daily action has a shortcut; mouse is optional. Visible focus states everywhere.
3. **Calm, compact, information-dense.** Utilitarian developer tool: small type, tight rows, subtle color. No big cards, no dashboard look, no gamification, minimal animation (one 120–160ms fade/slide on popups only).
4. **Nothing is ever lost.** Soft delete → Trash; archive keeps history per list; activity log answers "when did I do this?"; undo everywhere.
5. **Color whispers.** Color labels are a 3px left stripe on the row — never a filled row background. The accent is used as lines, rings and thin tints, never floods.

## Information architecture
```
Workspace
├─ Lists (ordered, emoji, renameable; "Inbox" fixed/undeletable; special "Pinned todos" view pinned at top of rail)
│  ├─ Pinned section (local + global pins of this list; auto-appears at top)
│  ├─ Groups (folder hierarchy, MAX 3 levels; collapse/expand; emoji)
│  │  └─ Todos (array order = display order)
│  ├─ Root todos
│  └─ Archived section (collapsed by default; "Archived (n)")
├─ Views: Pinned todos (Global section first, then per-list), Trash
└─ Overlays: command palette, global search, global quick add, label manager, shortcuts dialog, context menus, toasts
```

## Layout rules (all at 100% UI scale)
- **Window shell**, top to bottom: title bar 38px (brand + menu bar + toolbar + caption buttons) → global-pinned strip ≥27px (only when global pins exist, collapsible) → main row (rail | center | detail) → status bar 23px.
- **Left rail**: 210px fixed; `--color-surface` bg; 1px right divider. Sections: LISTS header (10px uppercase, letter-spacing .09em) with `+` button; special Pinned row; list rows; spacer; VIEWS header; Trash row.
- **Rail row**: padding 5px 8px, radius 6px, 18px emoji column, name 12.5px, right-aligned open-count 10px + Ctrl-digit hint 9px.
- **Center**: pane grid, 8px padding and 8px gap. Grid template per layout: `1` = 1×1, `2v` = two columns, `2h` = two rows, `4` = 2×2. Each pane: 1px border (divider; accent-tinted 40% when the pane is active and multi-pane), radius 8px, clips content.
- **Pane, single-pane mode**: tab bar across top (all lists as tabs, active = accent text + 2px accent underline, count badge). **Multi-pane**: compact dropdown list-selector instead of tabs (button with emoji+name+▼ opening a popover of lists).
- **Quick add row**: 8px padding; input min-height 30px, font 12.5px; filter toggle icon-button 30×30 at right.
- **Todo row**: min-height `30px` (compact) / `36px` (cozy tweak); padding-right 10px; left padding `10 + 16×depth` px; 3px color-label stripe on the left edge; 15px status circle; 18px emoji column; title at the user-set todo font size (default 13px, 10–20 range); right side: "G" tag if globally pinned, subtask progress `2/4` 10px.
- **Group row**: min-height 26px; caret 8px; emoji 16px; name 12px weight 500 in `--color-neutral-300`; count 10px muted. Indent 16px/level.
- **Section rows** (Pinned / Archived): 9.5px uppercase, letter-spacing .09em, `--color-neutral-500`; Archived has caret + count `(n)` and toggles.
- **Detail panel**: 320px fixed right column, `--color-surface`, 1px left divider. Header: Details | Activity tabs (accent underline) + breadcrumb + ✕. Body scrolls, 12px padding, 13px gaps.
- **Empty states**: centered, tray icon in `--color-neutral-700`, 13px title, 11.5px muted body, max-width 260px.
- **Window resizing**: rail and detail are fixed-width; panes flex. Tab bar and pinned strip scroll horizontally with hidden scrollbars. Text truncates with ellipsis — chrome never wraps.

## Spacing
Nocturne compact scale (0.7× density): 2.8 / 5.6 / 8.4 / 11.2 / 16.8 / 22.4 px (`--space-1..8`). Radii: 4 / 8 / 14 px (`--radius-sm/md/lg`); rows and small controls use 5–7px.

## Typography
Inter (400/500/600) everywhere, `--font-heading` weight 500 — never bolder. UI base 13px; chrome labels 12–12.5px; metadata 10–10.5px; section headers 9.5–10px uppercase; todo titles: user-adjustable `--tfs` (10–20px, default 13). Tabular numerals for all counts. Titles/descriptions are plain text (see FUTURE.md).

## Colors — dark theme (default, from styles.css tokens)
- Ground `--color-bg` #161826 · surface `--color-surface` #232532 · text `--color-text` #e9e9ed · divider = text @16%
- Accent #9184d9 (ramp 100–900; done-fill uses `--color-accent-600` #796cbf, text-on-fill `--color-accent-100`)
- Neutral ramp #f3f5fe…#292b31 for muted text (500/600) and deep chrome (700–900)
- Selection tint: accent @13% (rows), @12% (menus/rail); hover: text @5–8%; drop-target: accent @14–18%
- Saved dot in status bar: #7cc98f. Destructive text: #e07b7b (text/border only, never fills).

## Colors — light theme (token overrides)
bg #eceef5 · surface #f9fafd · text #262837 · divider rgba(38,40,55,.14) · accent #6a5cc4 (a:hover #544a8e, tag bg #dcd7fb, tag text #3c3474) · muted #6d7186 / #8d91a4 · shadows: `0 0 0 1px #d5d8e4`, `0 0 0 1px #cdd1df, 0 6px 18px rgba(35,38,60,.14)`, `0 0 0 1px #b9bdd0, 0 16px 40px rgba(35,38,60,.2)`. Everything else derives from the same tokens.

## Color labels
Built-in palette (fixed): Neutral #9397ab, Red #e07b7b, Orange #e0a36c, Yellow #d4c26a, Green #7cc98f, Blue #6ca3e0, Purple #9184d9, Gray #75798c. Plus up to **12 custom labels** `{hex, optional name}` (sample data: Fontos #e0567a, Főnöknek #d98a3d, Saját #5abfa6). Rendering: 3px row stripe, 7px dot on global-pin chips, 17px swatch circles in the picker (selected = 2px surface gap + 3.5px color ring).

## Status visual language (15px circle + title treatment)
- **Open**: 1.5px `--color-neutral-600` outline, empty.
- **In Progress**: accent outline, left half filled with accent (`linear-gradient(90deg, accent 50%, transparent 50%)`).
- **Done**: filled `--color-accent-600`, ✓ in accent-100; title line-through @ 55% opacity.
- **Cancelled**: `--color-neutral-700` outline, ✕ in neutral-500; title line-through @ 45% opacity.
- Click cycles Open → In Progress → Done → Open; Cancelled is set only via context menu / detail (deliberate state).

## Elevation
`--shadow-sm/md/lg` from tokens only. Popovers/menus = md; dialogs/palette = lg. Never stack heavier shadows.

## Data model
```
List  {id, name, emoji, fixed?}                      // fixed: Inbox
Group {id, listId, parentId|null, name, emoji}       // depth ≤ 3
Todo  {id, listId, groupId|null, title, status: open|progress|done|cancelled,
       desc (plain text; auto-link URLs + windows paths), emoji, color|null (hex),
       pinLocal, pinGlobal, subtasks:[{text,done}], archived, trashed,
       created, updated, activity:[{t, text}]}
```
Activity log = meaningful user actions only (Created, `Open → In Progress`, Added/Completed subtask "x", Moved to <path>, Pinned/Unpinned (globally), Archived/Restored, Renamed, Created — duplicate of "x"). Timestamps render as `Today 09:21` / `Yesterday 18:11` / `Mar 4 10:03`. Duplicate copies title/desc/subtasks/emoji/color; new id, created-now, status Open, pins cleared, fresh activity log.

## Behaviors summary
Autosave everything immediately (status bar shows a quiet "Saved · local" dot). Global quick add is an OS-level tiny floating window (Ctrl+Shift+Space) targeting any list, defaulting to Inbox. Ctrl+wheel adjusts todo text size; toolbar % button opens UI-scale (80–150%) + text-size popover. Light/dark toggle in toolbar and View menu.
