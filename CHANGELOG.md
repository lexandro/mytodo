# Changelog

All notable changes to myTODO are documented here. This project adheres to
[Semantic Versioning](https://semver.org). Help → What's new shows this file
inside the app.

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
