# myTODO — architecture

## Layers

```
┌──────────────────────────────────────────────────────────┐
│ Svelte UI (src/lib/ui/*)      thin: state + rendering    │
├──────────────────────────────────────────────────────────┤
│ State layer (src/lib/state/*) actions, UI state, undo    │
├──────────────────────────────────────────────────────────┤
│ Pure core (src/lib/core/*)    domain logic; no Tauri,    │
│                               Svelte or DOM imports      │
├──────────────────────────────────────────────────────────┤
│ ipc.ts — THE single Tauri boundary                       │
├──────────────────────────────────────────────────────────┤
│ Rust (src-tauri): SQLite repo, backup, Win32 integration │
└──────────────────────────────────────────────────────────┘
```

- **core**: all real logic is pure TS with colocated vitest tests
  (ops modules, row builder, search, links, shortcuts, transfer…).
- **ipc.ts**: the only module that imports `@tauri-apps/*` — the entire
  native surface is auditable in one place.
- **Rust**: small and focused — SQLite (rusqlite), backups (VACUUM INTO),
  IVirtualDesktopManager/Win32 (summon); no business logic.

## Persistence

- The in-memory state is the authority (Svelte 5 runes); SQLite is
  write-through.
- Every mutation goes through the `store.apply()` pipeline:
  `snapshot → mutate → diff → DbOp batch → one transaction`.
- The diff (`core/diff.ts`) emits exactly the changed rows — a DnD reorder
  typically writes a single row (fractional ordering, `ord REAL`).
- FK checks are deferred inside the transaction (`defer_foreign_keys`) and
  must be consistent at commit; failures roll back fully and surface as a
  visible error state in the status bar (with retry) — data is never lost
  silently.
- Schema versioning: `PRAGMA user_version` + an append-only migration array.

## Undo

- Snapshot stack (cap 30) inside `store.apply()`; undo writes back through
  the same diff pipeline — persistence logic exists in exactly one place.
  View toggles (collapse) run with `undoable: false`.

## Multi-window

- The Global Quick Add is a separate webview; it does NOT write the
  database: it hands the new todo to the main window via an event (single
  in-memory writer), then hides itself.

## Search

- `core/search.ts`: NFD → diacritic strip → lowercase → whitespace
  normalization; substring on title/description/subtasks + subsequence fuzzy
  (≥4 chars, titles only). Deterministic, dependency-free.

## Summon Workspace (Windows)

- `src-tauri/src/winint/`: documented APIs only — IVirtualDesktopManager
  (GetWindowDesktopId/MoveWindowToDesktop), MonitorFromWindow + work-area
  clamping, SetForegroundWindow with FlashWindowEx fallback. The foreground
  HWND is captured BEFORE any self-activation; the user's desktop is never
  switched.
- Summon is serialized behind a mutex — rapid double hotkeys cannot
  interleave window transitions.

## Live update

- `tauri-plugin-updater` from GitHub Releases
  (`releases/latest/download/latest.json`) with minisign-signed artifacts;
  the pubkey lives in `tauri.conf.json`.
- `state/updater.svelte.ts` (mdedit pattern) checks quietly 5 s after
  startup and every 6 hours, and only OFFERS the update (status bar chip +
  Help menu); download-install-relaunch is user-initiated. The installed
  (MSI/NSIS) variant self-updates; the portable zip only gets notified.
- Releases: tag push (`vX.Y.Z`) → `.github/workflows/release.yml`
  (tauri-action).

## Portable storage

- Everything lives inside the `myTODO/` folder: `data/todo.db` + settings
  (SQLite `settings` table, JSON values) + `backup/`. No registry.
- Shortcut config, layout, theme and window state all live in the settings
  table.

## File-size principle

Above ~150 lines/file, split; one file = one responsibility. On the Rust
side the db/{schema,load,write,backup} and
winint/{virtual_desktop,window_activation,summon} split follows the same
rule.
