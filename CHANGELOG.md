# Changelog

All notable changes to myTODO are documented here. This project adheres to
[Semantic Versioning](https://semver.org). Help → What's new shows this file
inside the app.

## Unreleased

### Added

- **Home, End, Page Up and Page Down walk the list** — jump to the first or
  last todo, or a screenful at a time. Page steps are measured from the pane
  you are in, so one press really is one page, and the selected row is always
  scrolled into view. Hold **Shift** with any of them (and with ↑ / ↓) to
  extend the selection all the way there — Shift+End takes everything from
  where you are to the bottom.

### Fixed

- **Moving several todos with Alt+↑ / Alt+↓ scrambled them at the ends of the
  list** — once the block reached the top or bottom, one more press swapped the
  selected rows with each other and from then on they only flip-flopped in
  place. The block now moves as one piece or not at all: at the edge nothing
  happens, the selection keeps its order, and moving back the other way works
  as it should.

## v1.2.1 — 2026-07-30

Batch work: pick as many todos as you like — the way you already select files —
and finish, move, colour, archive or delete the lot in one go, with one undo to
take it all back.

### Added

- **Select several todos and act on all of them at once** — the selection
  gestures you already know from Explorer: **Ctrl+click** adds one row,
  **Shift+click** takes everything from the last one you touched, **Shift+↑ /
  Shift+↓** grows the selection and shrinks it back again from wherever you
  started, **Ctrl+A** takes the whole list and **Esc** lets go. The status bar
  says how many rows are in play.
- **What you can do with a selection**: set a status on all of them, pin or
  unpin, give them a color, move them into another list or group, move the
  block up and down with Alt+↑ / Alt+↓, duplicate, copy the titles to the
  clipboard, archive, and delete. Right-click anywhere inside the selection for
  the menu; the toolbar's Done, Pin and Delete buttons follow the selection too.
  Whatever a batch changes, **one Ctrl+Z takes all of it back**.
- **Dragging works on the whole selection** — grab any selected row and every
  one of them travels: between two rows, onto a row to make them sub-items, or
  onto another list. Sub-items always follow their parent, so a branch never
  gets torn apart.
- **The running version sits in the status bar** — bottom right, after the
  Ctrl+Z hint. A working-tree build shows as `1.2.0-dev` in a different colour,
  so it is never mistaken for the released one; hovering names the exact commit
  and clicking opens About.

### Fixed

- **↑ / ↓ walked past the rows a filter had hidden** — with Ctrl+F open, the
  arrow keys stepped through the whole list instead of the matches, so the
  highlight could vanish onto a row that was not on screen. They now walk
  exactly what you can see.

- **The emoji field in a todo's details said the wrong shortcut** — its hint
  was too wide for the box, so it was cut down to "Win +", which is the zoom
  shortcut, not the emoji picker. It now reads **Win + .** in full. The field
  also stood taller than the Pin buttons beside it; the row lines up now.

## v1.2.0 — 2026-07-26

The structure release: todos can hang under other todos, a toolbar puts the
common moves one click away, and the list keeps itself in a sensible order —
what you are working on stays in sight, finished work sinks, and new todos
never land under it.

### Added

- **Named color labels** — colors carry categories, so they now have names.
  **Settings → Todo colors** lists the whole palette one color per row: rename
  or recolor any of the 8 built-ins, add up to 12 of your own, and put the
  built-ins back with one click.
- **Every list can rename a color for itself** — the palette is shared, the
  names are yours: the same blue can be "Waiting for review" at work and
  "Groceries" at home. The todo detail panel's **Manage…** opens the names of
  the list you are in; empty means "use the shared name".
- **Icon & color for a list** — right-click a list → **Icon & color…** opens a
  roomy picker with 36 curated icons (work, home, study, travel, money…) and
  the named list colors, with a live preview of how the list will look.
- **Lists have their own color** — from a separate palette (**Settings → List
  colors**), so list colors and todo colors never fight over the same meaning.
  Pick one from the list's right-click menu; it shows as a stripe in the rail,
  a tint behind the icon, the tab underline and a line along the top of the
  pane — in a split view you can see at a glance which pane is which.
- **Settings has a sidebar** — the dialog is much roomier and split into
  sections instead of one long column: **Appearance**, **Shortcuts** and
  **Files**. Ctrl+K also jumps straight to a section ("Settings: appearance").
- **Appearance section** — theme (follow system / dark / light), window scale
  and todo text size now have a proper home, not just the title-bar popover.
- **Todos sort themselves as you work** — mark one **In Progress** and it jumps
  to the top (under the pins), mark it **Done** or **Cancelled** and it sinks to
  the bottom (above the archive). What you are working on stays in sight, what
  is finished stops getting in the way. A todo only ever moves inside its own
  group, and pinned todos stay put. Turn it off in the new **Settings →
  Behavior** section.
- **Reorder a todo from the keyboard** — **Alt+↑** and **Alt+↓** move the
  selected todo one row up or down, so ordering no longer needs the mouse. It
  stays inside its own group and under its own parent, and a pinned todo moves
  among the pinned ones. Both are in the **Edit** menu and the right-click
  menu, which is also where the whole sub-item block (Make sub-item, Lift out)
  now lives with its shortcuts spelled out.
- **New todos no longer land under the finished ones** — **Settings → Behavior
  → New todos go** picks between **to the top** (right under what you are
  working on) and **to the bottom** (the end of the list, but still above
  everything done and cancelled). Applies wherever a todo is born: quick add,
  the global quick-add window, a group's right-click menu, or an applied AI
  proposal.

- **A todo can become a sub-item of another** — for when something turns out
  to be part of a bigger job rather than a job of its own. Drag a todo **onto**
  another one and it slides underneath it; aim for the thin strip at the top or
  bottom edge of a row instead and a line shows it will land *between* two rows,
  as before. **Tab** nests the selected todo under the one above it,
  **Shift+Tab** lifts it back out, and the right-click menu has both. Three
  levels deep at most — the same limit groups have.
  Sub-items travel with their parent: pin, archive, delete or move a todo to
  another list and the whole branch goes with it. Statuses stay independent,
  except for the new **Done with sub-items** in the right-click menu, which
  closes a todo and everything under it in one undoable step.
  A todo with sub-items gets a caret, exactly like a group: fold the branch
  away and the row shows how many items are hiding under it. Searching opens
  everything up, so nothing stays hidden from a filter.
- **Toolbar** — a slim row under the title bar for the things you reach for
  constantly on the selected todo: undo, make sub-item / lift out, done, pin
  and delete. Every button has a tooltip with its shortcut, and greys out when
  it does not apply — so the toolbar also tells you what is possible right now.
  The title bar is untouched; hide the row from **View → Toolbar** if you would
  rather have the space.

### Fixed

- Text inside input fields could not be selected with the mouse.

### Changed

- **Double-click renames a todo in place** — the row turns into an input, Enter
  saves, Esc cancels, clicking away saves. No more detour through the detail
  panel for a typo.
- **Enter opens the details** of the selected todo (this is what double-click
  used to do). Right-click → Open details and F2 still work as before.

## v1.1.0 — 2026-07-25

The AI release: a todo list can now be linked to a project directory, and the
AI CLI you already use works against it — from preset tasks to a real
conversation. Plus the parts that make a desktop app feel finished: an About
dialog, this changelog in the app, and folder paths you can actually open.

### Added

- **AI Workspace Integration** — link a todo list to a project directory and
  let a locally installed AI CLI (Claude Code or Codex) work against it. The
  **✦ AI** button opens a side panel where you either pick a preset task
  (Investigate, Break into Subtasks, Plan Implementation, Implement, Verify,
  Analyze Workspace, Suggest Todos, Reconcile) or just type into the console
  and keep talking. Every AI-proposed todo change is reviewed by you and
  applied as one undoable batch — the AI never writes your data directly.
- **Conversations** — follow-up messages continue the AI client's own session,
  so the assistant remembers the thread while your todo list is re-sent fresh
  each turn. `+` starts a new chat; the history lists earlier conversations
  and reopening one continues it.
- **Model picker** — choose the model per client in the AI Clients dialog or
  from the panel; myTODO reads the model lists the clients cache themselves
  and falls back to a built-in list plus a free-text field.
- **Permission modes** — a conversation is read-only unless you switch it to
  Execute before the first turn, and the mode is then fixed for that thread.
- **About dialog** (Help → About myTODO) — app icon, version, the git commit
  the binary was built from, build time, and a copy button for bug reports.
- **What's new** (Help → What's new) — this changelog, inside the app, with
  the version you are running marked.
- **Workspace badge** — lists with a linked workspace show a **WS** chip next
  to their name, amber when the linked directory has gone missing.
- **Shortcut offer** — the portable copy offers to create Desktop and Start
  Menu shortcuts on first run, and to repair them if you move the folder.
- **Settings → Files** — the data and backup folder paths with an *Open
  folder* button next to each.
- **Development builds are recognizable** — they carry a DEV icon and show
  their version as `1.0.1-dev`, so a local build is never mistaken for the
  installed one.

### Changed

- **Startup does less before the first frame** — global hotkey registration,
  shortcut and workspace probing, AI history and model lists now load once
  the window is up instead of competing with it.

### Fixed

- **Links, folders and JSON import/export actually work.** Opening a URL or a
  file/folder link from a description, the new *Open folder* buttons, and
  `File → Export JSON… / Import JSON…` were all refused by the app's own
  permission manifest — every one of them failed with a "not allowed"
  message. Import/export now grants access to exactly the file you picked in
  the dialog, and nothing else.
- **Drag & drop works with a real mouse** — reordering todos did nothing in
  the packaged app because the native WebView2 drag handler swallowed the
  events.
- **Rebuilding no longer wipes portable data** — `build.bat` only replaces the
  exe, leaving `data/` and `backup/` untouched.
- **A provider hiccup no longer fails a run** — Codex's "Reconnecting…"
  notices are shown as progress; only a real failure ends the turn.

## v1.0.1 — 2026-07-24

### Added

- **Application icon** with true transparency.

### Fixed

- **Recording a global shortcut** no longer triggers the shortcut you are
  pressing: live hotkeys are suspended while the recorder is armed.

## v1.0.0 — 2026-07-24

The first release: a fast, keyboard-first, local todo workspace for Windows.

### Added

- **Lists, groups and todos** — multiple lists with a permanent Inbox, groups
  up to three levels, quick add (Enter saves, Shift+Enter opens details),
  drag & drop ordering, archive and trash with restore.
- **Detail panel** — description, subtasks, color labels, activity log, and
  clickable links to files and URLs.
- **Split panes** — 1 / 2 / 2×2 layouts with a different list per pane, and
  the layout is remembered.
- **Search** — accent-insensitive fuzzy filtering, global search
  (Ctrl+Shift+F) and a command palette (Ctrl+K).
- **Pinned and Trash views**, plus a global pinned strip.
- **Windows integration** — Summon Workspace (Ctrl+Alt+T) brings the app to
  your current virtual desktop, a global Quick Add window, single instance,
  custom title bar and remembered window position.
- **Appearance** — light/dark/system theme, UI scale and todo text size.
- **Data** — local SQLite next to the executable, daily automatic backups
  with restore, and JSON import/export.
- **Live updates** — signed updates from GitHub Releases, offered but never
  installed behind your back.
