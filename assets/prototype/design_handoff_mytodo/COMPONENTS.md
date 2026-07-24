# COMPONENTS.md — component catalogue

Sizes at 100% scale; all colors/typography from DESIGN.md tokens.

## AppShell
Vertical flex: TitleBar → GlobalPinnedStrip? → main row (ListRail | Center | DetailPanel?) → StatusBar. Owns global keyboard handling, undo stack, theme/scale application. Right-click default menu is suppressed app-wide (custom menus instead).

## TitleBar (38px)
Brand mark (16px rounded-square ✓ in accent) + "myTODO" 13px/500 → **MenuBar** → spacer → **LayoutSwitcher** → **AIActionMenu** button (✦ + "AI", 11.5px text button — quiet chrome, accent tint when open) → quick-add ⚡ icon-button → global-search icon-button → **ScaleControls** button ("100%") → theme sun/moon icon-button → decorative caption buttons (─ ▢ ✕, 40×38 hover targets). In production the bar is the draggable window region.

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
`.input` 30px, placeholder "+ Add to <list> — Enter saves, Shift+Enter opens details". Enter creates (into the selected todo's group if the selection is in this list, else list root), keeps focus, clears. Shift+Enter also opens DetailPanel. Ctrl+N focuses it. On linked lists the row also hosts the **WorkspaceLink** chip, left of the filter button.

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
Header tabs Details/Activity/AI + breadcrumb (list / group path, ellipsized, max-width 70px) + ✕ (Esc). **Details tab**: title textarea (13.5px/500, undo-able rename on blur) · Status pill row (4 pills, active = accent outline+tint) · Emoji input 64px (hint: Win+.) + Pin toggle pair (List | Global) · **Location**: dropdown of list root + full indented group tree, plus ↑ "move up one level" button (Alt+←) · **ColorPicker**: None + 8 built-ins + customs as 17px swatches, "Manage…" opens LabelManager · Description textarea (plain text) with auto-detected link chips underneath (URLs open in browser ↗; `C:\…` paths open in Explorer 📁) · SubtaskList · created/updated 10px meta · action row: Duplicate / Archive|Restore / Delete (red-tinted outline). **Activity tab**: newest-first entries, 2px divider left rule, 10px timestamp over 12px text; AI events are high-level only ("AI Investigate started/completed (Claude Code)", "AI applied — …"). **AI tab**: 5 todo-level actions as outlined rows (name 12px + one-line description 10px + right hint "read only"/"may modify files") + Runs history (AIRunHistory rows); unlinked list → centered "Link a workspace to use AI" CTA.

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
Fixed-position surface menu (min-width 208px, shadow-md, 12.5px items, shortcut hints, red destructive items). Todo: Open details / statuses (●○) / Pin to list / Pin globally / Move up one level / Move to… (morphs into list+group target list) / Duplicate / AI actions… (morphs into the 5 todo AI actions with read-only/may-modify hints; single "Link a workspace to use AI" item when unlinked) / Archive|Restore / Delete. List menu additionally: Link Workspace… (unlinked) or Workspace settings… + AI actions… (linked; disabled with "link a workspace first" hint otherwise). Group and List menus per GroupRow/ListRail. Esc or outside-click closes.

## Toast + Undo
Bottom-center pill (surface, shadow-md, 12.5px), ~4s: message + ghost "Undo" + "Ctrl+Z" hint for undo-able actions. One at a time, newest replaces.

## StatusBar (23px)
Left: green dot + "Saved · local file — no account, no cloud". Right: shortcut hints (Ctrl+K lists · Ctrl+Shift+Space quick add · Ctrl+F filter · Ctrl+Z undo · Ctrl+wheel text size). 10px, neutral-500, nowrap.

## ShortcutsDialog (F1 / Help menu)
560px modal, two-column grid of action/shortcut pairs (see SHORTCUTS.md).

---

# AI components (V1.1 — see AI_INTEGRATION.md for behavior)

## WorkspaceLink (chip)
30px-high outlined chip in the quick-add row, 10.5px: folder icon + directory basename + optional 8.5px "git" mini-tag. Missing directory → ⚠ + amber #e0a36c text. Tooltip = full path · type · AI provider. Click opens WorkspaceSettings. Max-width 170px, ellipsized. Unlinked lists show no chip (linking lives in the list context menu / AI menu).

## WorkspaceSettings (dialog, 440px)
Title "Workspace — <list>". Linked: Directory (readonly mono input + Change…), meta line (Git repository | Generic folder · AI — <client>), missing-state row (⚠ Directory not found + Locate…), AI Brief textarea (plain text, "optional context added to every run"), Preferred AI client select (Default (<global>) / Claude Code / Codex), actions: Unlink (ghost, red) + Done. Unlinked: one explanatory sentence + Cancel / Link Workspace… (opens directory picker in production).

## AIActionMenu (toolbar dropdown, 276px)
Two captioned sections — "TODO — <selected title>" (5 actions) and "WORKSPACE — <list>" (4 actions) — each item two-line: 12.5px name + 10px description. Unlinked list: CTA text + Link Workspace… primary. Footer: Run history, AI Clients…. Todo actions muted when no todo selected. Opens via ✦ AI button or Ctrl+Shift+A (panel directly).

## AIRunPanel (right drawer, 336px)
Phases: **ready** (Task box → Action radio-cards → Question textarea for Ask → Provider select + status hint + AI Clients… link → Mode display (● Analyze/Plan/Execute with "read only"/"may modify workspace", Execute in amber) → AI Brief preview → Run primary; Execute label "Run — may modify workspace") · **running** (spinner + action·provider + tabular elapsed, mono progress log (last 4 lines; Show details = all), Cancel, note "closing this panel does not stop the run") · **result** (AIResult) · **failed/cancelled** (⚠ title + human message + Retry + Open AI Clients… when client-caused) · **history** (AIRunHistory + New run) · **unlinked** (CTA) · **missing** (⚠ Workspace not found + mono path + Locate…/Unlink). Panel is bound to the pane/list/todo context it was opened from.

## AIRunHistory
Outlined rows: line 1 = action 12px + status tag (9px pill: Completed green / Failed red / Cancelled neutral / Running accent); line 2 = time · provider · mode, 10px muted. Click reopens the run (result, failure, or live running view). Appears in the detail AI tab (todo scope) and panel history (workspace scope).

## AIResult
Stacked, label-per-block (`.field` labels): status line (provider · elapsed) → Question (Ask) → **Verdict** box (Verify only: Complete #7cc98f / Partially complete #e0a36c / Incomplete #e07b7b / Uncertain neutral + one-line why) → Summary 12px → Answer → Checks (✓/⚠ rows) → Todos ↔ workspace mapping (title + right-aligned verdict word, tone-colored) → Findings (2px left-rule rows) → Recommendation box (accent outline, label + why + Apply Recommendation secondary) → ProposalList → Show details (mono log) → New run ghost.

## ProposalList
Caption = result-specific ("Proposed Todo Changes" / "Proposed Subtasks" / "Potential Todos" / "Suggested Changes") + permanent note "The AI only proposes — nothing changes until you apply." + right-aligned **Select all / Clear selection** ghost toggle. Rows: 13px checkbox + 8.5px uppercase kind tag (72px col: ADD SUBTASK / CHANGE STATUS / CREATE TODO / ARCHIVE TODO) + 11.5px label; rows are keyboard-focusable (Tab; Space/Enter toggles, accent focus ring); applied rows dim to 50% with a green "applied" tail. Footer: Apply Selected (n) — or Add Selected for Suggest — primary, 45% opacity when nothing selected. Applying = ONE undoable batch; toast says so.

## AIClientSettings (dialog, 480px) + ProviderCard
Intro: "never stores accounts or API keys — authentication happens in each client's own CLI." Two ProviderCards: name + status (● Detected green / ◌ Detecting… accent / ○ Not detected neutral / ● Installed — not ready amber) + version + Enabled checkbox; mono executable-path input + Browse…; Auto Detect + Test ghost buttons; amber message line for human-readable problems ("Codex was found, but is not authenticated. Complete authentication using the Codex CLI, then Test again."). Footer: Default AI client select + note "A workspace can override this in its settings." + Done.
