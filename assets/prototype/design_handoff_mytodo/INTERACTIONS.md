# INTERACTIONS.md — exact interaction semantics

## Click
- Todo row click → select (accent tint) + make its pane active. Status circle click → cycle Open → In Progress → Done → Open (never into Cancelled). Group row click → collapse/expand. Rail list click → show list in active pane (leaves Pinned/Trash view). Tab click → switch pane's list. Global-pin chip / pinned-view row / search result click → **navigate home**: switch active pane to owning list, expand ancestor groups (and Archived section if archived), select todo, open detail.
- Buttons that toggle (pins, theme, layout, filter) reflect state immediately; all mutations autosave.

## Double click
- Todo row → open DetailPanel (Details tab). (Single-click select keeps browsing cheap; double-click is "go deeper".)

## Keyboard
- Full map in SHORTCUTS.md. Rules: shortcuts with Ctrl work even while typing (except Ctrl+Z inside inputs = native text undo); plain keys (Delete, F2, arrows, Alt+←) are ignored while an input/textarea/select has focus. Esc closes strictly in priority order: menu bar / AI menu → shortcuts dialog → context menu → palette → global search → global quick add → label manager → workspace settings → AI Clients dialog → scale popover → AI panel (closing it does NOT stop a running run) → inline rename → list-picker popover → filter bar → detail panel.
- ↑/↓ move selection through the active pane's visible todo rows (pinned + tree + expanded archived, in render order). Enter in quick-add creates; Shift+Enter creates + opens detail. In palette/search: ↑↓ move highlight, Enter activates.
- Quick-add target: new todo goes to the selected todo's group when the selection lives in that pane's list; else list root.

## Drag & drop (drop targets must always be unambiguous)
- **Todo ↕ reorder**: dragging over a todo row shows a 2px accent line — top half = insert before, bottom half = insert after. Same rule across groups (target row's group is adopted).
- **Todo → group row**: whole row highlights (accent 14%) = drop INTO group (appended, group auto-expands). Line vs highlight distinguishes before/after vs into.
- **Todo → rail list**: rail row highlights (accent 18%) = move to that list's root.
- **Todo → another pane's background**: moves to that pane's list root (chrome/empty area is the target).
- **Rail list ↕ reorder**: dragging a rail row over another shows the 2px accent line (before/after).
- Every drop = one undo-able action with a toast ("Moved", "Moved to X", "Moved into X", "Reordered", "Lists reordered"). Moves write an activity entry "Moved to <List / Group path>". Drag end/leave clears all indicators.
- Group reordering by drag is deferred to v1.1; groups reorder implicitly via list structure edits (see FUTURE.md).

## Hover
- Rows: text-5% tint (selected rows keep their stronger accent tint). Chrome buttons: text-8% tint and/or accent border/text. Menu/palette items: text-7%. Destructive items turn #e07b7b on hover only where already red-labelled. Tooltips (`title`) on every icon-only control, including shortcut where applicable.

## Focus
- `:focus-visible` = 2px accent outline, offset 2 (from the token stylesheet) on ALL interactive elements — never the browser default. Inputs: accent border + accent caret on focus. Autofocus: palette/search/quick-add-window inputs, inline-rename inputs (content selected), F2 focuses+selects the detail title.

## Selection
- Exactly one selected todo app-wide (drives detail panel + keyboard ops). Selecting in another pane moves selection there and re-anchors ↑/↓. Deleting the selected todo clears selection. Selection survives filtering when still visible.

## Context menus (right-click)
- Suppress the native menu app-wide. Todo/group/list menus per COMPONENTS.md; "Move to…" morphs the open menu into a target list (lists then `↳ group paths` of the current list, current location hinted "current"). Menu opens next to the cursor, clamped to the window. Right-clicking a todo also selects it.

## Split
- Layout switcher (toolbar / View menu / palette): 1, 2-vertical, 2-horizontal, 2×2. Pane→list assignments persist per slot, so switching 1 → 4 → 1 restores previous contents. Active pane = last clicked/typed-in; gets the accent border (multi-pane only) and receives all keyboard actions.

## Collapse
- Groups: caret or row click; chevron ▸/▾; state persisted. Filtering force-expands without overwriting saved state. Archived section: collapsed by default, per-list persisted. Global-pin strip: collapsible to its label; persisted.

## Archive
- Archive/Restore from context menu or detail. Archived todos keep status (Done+Archived, Cancelled+Archived valid), render only in the Archived section, are excluded from counts, remain searchable (global search always; list filter when section rendered), restorable, openable.

## Undo
- Snapshot-based, depth 30, covering: add, delete (trash), restore, permanent delete, empty trash, move, reorder (todos/lists), status change, rename (todo on blur; list/group on commit), archive/restore, pin/unpin, duplicate, group/list create/delete.
- Ctrl+Z or toast "Undo" button pops the stack, restores data, toasts "Undone — <action>". No confirmation dialogs anywhere; undo replaces them.

## Renaming
- F2 / menu / context menu. Lists & groups: inline input in place (Enter commit, Esc cancel, blur commits; leading emoji + space edits the emoji). Todos: detail title (rename logged to activity once per edit session, undo-able).

## AI runs
- Ctrl+Shift+A opens the AI panel for the selected todo (or the active pane's list). The panel is bound to the pane/list/todo context it was opened from; switching tabs/panes or working elsewhere never loses the run.
- A running run continues in the background if the panel is closed; on completion a toast announces it and the run is reachable from history / the todo's AI tab. Cancel is explicit (button); cancelled runs stay in history.
- Concurrency: one AI run at a time per workspace — starting another shows "Another AI operation is already running for this workspace." No queue, no scheduler.
- No silent provider fallback: if the chosen client is missing/not ready, the Run fails with a human-readable message + Retry + Open AI Clients; the ready-state hint warns beforehand.
- Proposals: checkbox review; Apply Selected performs all selected proposals as ONE undoable batch through normal domain commands (same validation as manual edits — status values, group depth ≤ 3, archive semantics); each applied item writes an activity entry. Verify's Apply Recommendation likewise never auto-fires.
- Narrow windows (< ~1250px effective): AI panel and detail panel are mutually exclusive — opening one closes the other.

## Autosave & persistence
- Every mutation persists immediately (local file/db). Status bar shows the quiet saved indicator; on write error it may switch to a warning state (same slot, red-tinted). Restore on launch: full data + layout, pane lists, view, theme, scale, text size, collapsed/archived/strip states, custom labels.
