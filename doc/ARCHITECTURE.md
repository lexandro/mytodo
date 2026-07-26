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

## Todo hierarchy

- Two independent nestings, both capped at 3 levels: **groups**
  (`Group.parentId`) are the user's folders, **sub-items** (`Todo.parentId`)
  hang one todo under another.
- A sub-item chain always shares one list + group: nesting moves a todo
  inside its group, never out of it. The ordering scope is therefore
  (listId, groupId, parentId) — `core/todos-ops.ts scopeSiblings`.
- A subtree is one thing: trash, archive, permanent delete and a cross-list
  move all carry the descendants along. Status is the exception — it applies
  to one todo unless the caller asks for `setStatusDeep`.
- Structure queries live in `core/todo-tree.ts` (cycle-safe by construction),
  reshaping mutations in `core/todos-tree-ops.ts`. `core/rows.ts` renders a
  todo under its parent wherever that parent renders, so a branch is never
  split across the Pinned/group/Archived sections.

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

## AI Workspace Integration

```
Todo Domain (core ops, store.apply, undo)
        ↕  structured proposals only — never direct writes
AI Orchestration (state/ai-runs: lifecycle, guards, persistence)
        ↕
AgentProvider boundary (core/ai-stream + ai-result normalize;
                        src-tauri/src/ai: detection, argv, process)
      ↙        ↘
Claude Code   Codex        (locally installed CLIs, own auth)
```

- **Provider boundary**: the Rust side owns which executables may run
  (claude/codex name lists), validates path/workspace/mode/run-id, builds
  the fixed argv per provider+mode (Analyze/Plan → read-only flags,
  Execute → provider-scoped write; bypass flags are impossible by
  construction) and streams stdout as `ai-run:<id>` events. The prompt
  travels via stdin. `.cmd` npm shims run through `cmd.exe /C` only after
  a metacharacter check; cancel is a graceful → forced process-TREE kill.
- **Stream/result normalization** lives in pure core modules: provider
  JSON event shapes never leak past `core/ai-stream.ts`; the final text's
  fenced-JSON envelope degrades to a summary-only result when malformed.
- **The proposal pipeline is the mandatory boundary**:

```
AI result → proposed actions (strongly typed)
          → parse (unknown kinds dropped)
          → domain validation (same rules as manual edits)
          → user review (Apply Selected)
          → normal domain ops in ONE store.apply
          → SQLite + activity log + single-step undo
```

- **Conversations**: the ✦ AI button opens the panel directly (no dropdown).
  There the user either picks a preset task or types into the console. Every
  run belongs to a `conversationId`; a follow-up turn resumes the provider
  session of the newest turn that reported one (`claude --resume <id>`,
  `codex exec resume <id>`), so only the refreshed list snapshot plus the
  message travel — the rest is already in the session. With no session id to
  resume, the turn falls back to sending the full context.
  A thread's permission mode is fixed when it starts: `codex exec resume` has
  no `--sandbox` flag, so the sandbox goes as `-c sandbox_mode=…` and a
  resumed turn can never widen what the user agreed to.
- **Model choice**: per client, global (`aiClients.<provider>.model`, null =
  the CLI's own default). Neither CLI has a "list models" command, but both
  cache something usable and `ai/models.rs` reads it (idle-time, never at
  startup): Codex's `~/.codex/models_cache.json` is the COMPLETE account list
  and replaces the catalog; Claude Code's `~/.claude.json` only caches EXTRA
  options (e.g. the 1M variant), which are appended to it. Anything missing
  or in an unexpected format degrades to the curated catalog in
  `core/ai-models.ts`. Model strings are charset-checked on both sides before
  entering argv (a value starting with `-` would read as a flag; brackets are
  allowed because `claude-fable-5[1m]` is a real name).
  Codex slugs must be the real ones (`gpt-5.6-sol`): `openai/sol` works in
  Codex's interactive TUI but `codex exec` rejects it for ChatGPT accounts.
- **Persistence**: run history in the `ai_runs` table (capped log lines,
  newest 50 terminal runs per list, pruned on write; `conversation_id`,
  `user_message` and `model` since schema v3 — older rows load as
  single-turn threads); workspace links + client config as portable settings
  keys (`workspaces`, `aiClients`) — no credentials, ever. Interrupted
  (still-"running") rows surface as failed on load.
- **Zero-cost when unused**: no provider detection on startup or routine
  actions — only on the AI Clients dialog, explicit Auto Detect/Test, or
  a run attempt. Without a linked workspace or installed CLI the entire
  todo app is unchanged.

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

## Build identity (About dialog)

- `vite.config.js` bakes `{version, channel, commit, builtAt}` into the
  bundle as the `__MYTODO_BUILD__` define: version from `package.json`,
  commit from `git rev-parse --short=7 HEAD` (`unknown` outside a checkout).
- `src/lib/build-info.ts` is the single reader of that constant (same
  boundary idea as `ipc.ts`); `core/build-info.ts` holds the pure formatting
  with its tests.
- Channel: `release` only when `MYTODO_BUILD_CHANNEL=release` is set, which
  happens exclusively in `release.yml` for tag builds. Every other build
  (local `build.bat`, CI, dev server) shows a `-dev` suffix — e.g.
  `1.0.1-dev` — so a hand-built exe is never mistaken for the release.
- `release.yml` also fails fast when the tag and the three version places
  (`package.json`, `tauri.conf.json`, `Cargo.toml`) disagree.
- `ui/AboutDialog.svelte` (Help → About myTODO, also in Ctrl+K) shows the
  app icon imported straight from `src-tauri/icons/`, the version/commit/build
  time and a copy button for bug reports.
- **Help → What's new** renders `CHANGELOG.md`, inlined at build time with
  `?raw` so it always matches the shipped binary. There is no markdown
  library: `core/changelog.ts` parses the Keep-a-Changelog subset the file
  uses (releases, sections, bullets, `**bold**`/`*italic*`/`` `code` ``) into
  typed data and the dialog renders real elements — no `{@html}`, nothing to
  escape. The entry describing the running build is badged, using the same
  build info as the About dialog.

## Startup

Only what the first frame needs runs eagerly: `db_load_all` → `settings_all`
→ workspace-link parsing → window geometry (restoring geometry later would
visibly jump). Everything else goes through `state/startup.ts`
(`requestIdleCallback`, 1.5 s backstop): global-hotkey registration, the
shortcut-offer probe, workspace existence checks, AI run history, model-list
prefetch, and the updater's own 5 s delay.

Measured on the release build (2026-07-25, one run each): before the split,
seven IPC calls fired ~20 ms BEFORE first contentful paint and each took
~68 ms as they queued behind one another; after it the probes start after
paint and the geometry path — the visible one — dropped from 67 ms to 12 ms.
**New startup work belongs in `startDeferredBoot` unless the first frame
truly needs it.**

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
