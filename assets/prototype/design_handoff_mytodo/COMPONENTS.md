# COMPONENTS.md — component catalogue

Sizes at 100% scale; all colors/typography from DESIGN.md tokens.

## AppShell
Vertical flex: TitleBar → GlobalPinnedStrip? → main row (ListRail | Center | DetailPanel?) → StatusBar. Owns global keyboard handling, undo stack, theme/scale application. Right-click default menu is suppressed app-wide (custom menus instead).

## TitleBar (38px)
Brand mark (16px rounded-square ✓ in accent) + "myTODO" 13px/500 → **MenuBar** → spacer → **LayoutSwitcher** → quick-add ⚡ icon-button → global-search icon-button → **ScaleControls** button ("100%") → theme sun/moon icon-button → decorative caption buttons (─ ▢ ✕, 40×38 hover targets). In production the bar is the draggable window region.

## MenuBar
File / Edit / View / Go / Help, 12px, 4px 9px padding, radius 5px. Open menu = text-@8% bg; hover moves the open menu (classic Windows roaming). Dropdown: min-width 234px, surface, radius 8px, shadow-md, 4px padding; items 12.5px with right-aligned 10px shortcut hints; 1px divider rows. Contents: File (New todo, New list, Global quick add, Exit) · Edit (Undo, Rename, Duplicate, Move up one level, Delete) · View (4 layouts with ●/○ state, Pinned todos, Trash, text-size, theme) · Go (palette, global search, filter, all lists with Ctrl+n hints) · Help (Keyboard shortcuts F1, About).

## LayoutSwitcher
Segmented 4-button group (32×26 each, 1px divider borders, radius 6px): single / split-vertical / split-horizontal / 2×2 glyphs. Active = accent tint bg + accent icon.

## GlobalPinnedStrip (≥27px, only if global pins exist, main view only)
Accent-tinted band (accent 5% over bg). Left toggle: caret + pin icon + "GLOBAL" 9.5px uppercase + count. Chips: pill (surface bg, divider border, radius 999), color dot 7px, emoji, title 11.5px, list name 9.5px muted; hover = accent border; click navigates to the todo's home (expands ancestors, opens detail). Collapsed = label+count only. Horizontal scroll, scrollbar hidden.

## ListRail (210px)
"LISTS" header + `+` new-list button; special **Pinned todos** row (accent pin icon, count, undeletable, no context menu); list rows; "VIEWS" header; Trash row (count). List row states: active (accent 12% bg), hover (text 6%), drop-target for todos (accent 18% bg), reorder drop line (2px accent inset top/bottom). Rows are draggable to reorder. Inline rename: row swaps to an input (emoji can be edited as a leading character, e.g. "🎤 Conference App").

## TabBar (single-pane) / ListSelector (multi-pane)
Tabs: emoji + name 12.5px + open-count 10px; active = accent text + inset 2px accent underline; radius 6px 6px 0 0; right-click opens list context menu; horizontal scroll hidden. Selector: outlined button (emoji+name+▼) opening a popover (min-width 210px, shadow-md) listing lists with counts, active tinted.

## TodoPane
Column: TabBar/ListSelector → QuickAdd → FilterBar? → scrollable row list (Pinned section → groups/todos → Archived section) → EmptyState. Active pane (multi-pane) gets a 40% accent border. Pane background is a drop target: dropping a todo from another pane/list moves it to this list's root.

## QuickAdd
`.input` 30px, placeholder "+ Add to <list> — Enter saves, Shift+Enter opens details". Enter creates (into the selected todo's group if the selection is in this list, else list root), keeps focus, clears. Shift+Enter also opens DetailPanel. Ctrl+N focuses it.

## FilterBar (Ctrl+F)
26px accent-bordered input, placeholder documents fuzzy + accent-insensitive matching; live match-count at right. While filtering: groups auto-expand, only matching branches render, Pinned/Archived filter too.

## TodoRow
See DESIGN.md §Todo row + §Status. States: hover text-5% tint; selected accent-13% tint (persists over hover); drag-over reorder line = 2px accent inset (top = before, bottom = after); dragging uses native ghost. "G" tag (`tag-accent`, 8.5px) marks global pins. Double-click or Enter opens details; single click selects.

## GroupRow
Caret ▸/▾ toggles collapse; drag-over highlights whole row accent-14% ("into"); drop appends todo to group and expands it. Context menu: Rename, New todo here, New subgroup (disabled with hint "3-level limit" at depth 3), Delete group (children re-parent to grandparent; todos kept). Inline rename input like rail.

## SectionRow (Pinned / Archived headers)
Uppercase micro-label; Archived shows caret + `(n)` and toggles open state (persisted per list); default collapsed.

## SubtaskList (in DetailPanel)
2px progress bar (accent-600 on neutral-900 track) + rows 24px: 13px rounded-square checkbox (checked = accent-600 fill + ✓), 12px text (done = line-through 55%), ✕ remove on hover-red. Add-input 26px "…Enter". Toggling/adding/removing writes activity entries.

## DetailPanel (320px)
Header tabs Details/Activity + breadcrumb (list / group path, ellipsized) + ✕ (Esc). **Details tab**: title textarea (13.5px/500, undo-able rename on blur) · Status pill row (4 pills, active = accent outline+tint) · Emoji input 64px (hint: Win+.) + Pin toggle pair (List | Global) · **Location**: dropdown of list root + full indented group tree, plus ↑ "move up one level" button (Alt+←) · **ColorPicker**: None + 8 built-ins + customs as 17px swatches, "Manage…" opens LabelManager · Description textarea (plain text) with auto-detected link chips underneath (URLs open in browser ↗; `C:\…` paths open in Explorer 📁) · SubtaskList · created/updated 10px meta · action row: Duplicate / Archive|Restore / Delete (red-tinted outline). **Activity tab**: newest-first entries, 2px divider left rule, 10px timestamp over 12px text.

## Search — CurrentListSearch = FilterBar above; GlobalSearch (Ctrl+Shift+F)
Centered dialog 540px, shadow-lg: search input row (magnifier), results ≤20 (status circle, emoji, title, right-aligned breadcrumb `List / Group / Subgroup` 10.5px), ↑↓ + Enter navigation, active row accent-12%; footer notes "fuzzy + accent-insensitive" / "Enter jumps to the todo". Selecting navigates: switches active pane to the list, expands ancestors, opens Archived section if needed, selects + opens detail. Matching: case/accent-insensitive substring on title/desc/subtasks, plus subsequence fuzzy (≥4 chars) on titles — "ARVIZTURO" matches "árvíztűrő".

## CommandPalette (Ctrl+K)
Same dialog pattern, 460px: lists (with Ctrl+n hints) + commands (layouts, views, theme). Same keyboard model.

## PinnedView
Full-center page: "Pinned todos" h4 + hint. Sections: **GLOBAL** first (accent label), then per-list local pins (list emoji+name label), empty lists omitted. Rows: status circle, emoji, title, breadcrumb, ›; click navigates home.

## TrashView
Header + "Empty trash" secondary button; rows: emoji, muted title, breadcrumb, Restore (ghost) + Delete permanently (ghost, red). Empty state sentence. Trash is reachable only from rail/menu — deliberately out of daily flow.

## ArchivedSection — see SectionRow; archived rows render like todos (status styling already mutes them).

## SplitPane
CSS grid on the center area (templates per layout); panes independent; layout + pane→list mapping persisted. No user-draggable dividers in v1 (fixed 1fr tracks).

## ColorPicker / LabelManager
Picker inline in detail (above). Manager = modal dialog: built-in palette preview row (read-only), custom label rows (native color input 26×24 + optional-name input + ✕), "Add label" until 12, counter "n / 12", Done (primary outline).

## ScaleControls
Toolbar "%" button → popover 210px: UI-scale chip row (80/90/100/110/125/150%, active accent-outlined), todo-text-size stepper (A− / 13px / A+), hint "Ctrl + mouse wheel also resizes todo text". UI scale zooms the whole shell (all chrome scales); text size changes todo titles only.

## GlobalQuickAdd (Ctrl+Shift+Space — separate always-on-top OS window in production)
400px card, shadow-lg: "QUICK ADD" micro-header + hint · input 34px autofocused · "Target" list dropdown (default Inbox) · "Enter adds · Esc dismisses". Enter creates in target, closes, toasts "Added to <list>". Deliberately NOT a mini app — one input, one dropdown.

## ContextMenu
Fixed-position surface menu (min-width 208px, shadow-md, 12.5px items, shortcut hints, red destructive items). Todo: Open details / statuses (●○) / Pin to list / Pin globally / Move up one level / Move to… (morphs into list+group target list) / Duplicate / Archive|Restore / Delete. Group and List menus per GroupRow/ListRail. Esc or outside-click closes.

## Toast + Undo
Bottom-center pill (surface, shadow-md, 12.5px), ~4s: message + ghost "Undo" + "Ctrl+Z" hint for undo-able actions. One at a time, newest replaces.

## StatusBar (23px)
Left: green dot + "Saved · local file — no account, no cloud". Right: shortcut hints (Ctrl+K lists · Ctrl+Shift+Space quick add · Ctrl+F filter · Ctrl+Z undo · Ctrl+wheel text size). 10px, neutral-500, nowrap.

## ShortcutsDialog (F1 / Help menu)
560px modal, two-column grid of action/shortcut pairs (see SHORTCUTS.md).
