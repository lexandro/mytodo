# myTODO — development plan and progress tracking

Source documents:
- **Functional spec**: `doc/daprompt.md` (wins on functionality; original Hungarian prompt, kept verbatim)
- **Design spec**: `assets/prototype/design_handoff_mytodo/` (wins on visuals + interactions;
  `prototype/myTODO App.dc.html` is the executable spec)
- **Shortcut addendum**: `doc/shortcut.md` (Summon Workspace + Global Shortcut Manager; original Hungarian prompt)

## Phase workflow (mandatory for every phase)

1. Implementation (pure core + colocated vitest first, then UI)
2. `bun run typecheck && bun run test` green
3. Code review (self-review of the diff)
4. Refactor / simplification based on review findings
5. Green again → conventional commit → **push** → update this file
6. Only then does the next phase start

## Status overview

| Phase | Scope | Status |
|---|---|---|
| F1 | Foundation: tokens, DB, domain model, app shell | ✅ |
| F2 | Lists, groups, todo CRUD, Quick Add | ✅ |
| F3 | Tree view, drag & drop, subtasks | ✅ |
| F4 | Detail panel, activity, colors, emoji, links | ✅ |
| F5 | Pinning, Pinned view, Archive, Trash, Undo | ✅ |
| F6 | Search (filter, global, palette) | ✅ |
| F7 | Split pane system + layout persistence | ✅ |
| F8 | Global shortcuts, Quick Add window, Summon | ✅ |
| F9 | Scale, theme, keyboard polish, window state | ✅ |
| F10 | Backup, import/export, hardening, portable release | ✅ |

Legend: 🔲 not started · 🔄 in progress · ✅ done (review + push completed)

## Recorded decisions (2026-07-24)

1. **DB layer**: rusqlite on the Rust side with typed `#[tauri::command]`s; SQL
   never leaks into TS. Domain state lives fully in memory (Svelte 5 runes)
   with SQLite write-through persistence. Undo = in-memory snapshot stack
   (cap 30) + DB writes.
2. **Confirmations**: no dialogs anywhere (undo + toast), with ONE exception:
   Empty Trash asks for confirmation.
3. **Design-gap resolution**: the File menu grows (Import JSON / Export JSON /
   Backup Now / Restore… / Settings); the Global Shortcuts editor lives in a
   separate Settings modal (Nocturne tokens, per the shortcut.md §11 wireframe).
4. **Group deletion**: children re-parent to the grandparent, todos are kept,
   undoable (per design, no dialog) — the daprompt's "move-content workflow"
   branch.
5. **Ctrl+K command palette**: present in the design, not requested by the
   functional prompt → built in.
6. **Fonts**: Inter bundled (@fontsource, local) — the tokens' Google Fonts
   `@import` cannot ship due to strict CSP + offline-first.
7. **Hide vs minimize (Summon toggle)**: hide, BUT only while the Summon
   shortcut is registered — otherwise minimize (the window must never become
   unreachable). The single-instance plugin also raises it on relaunch.
8. **AltGr protection**: on Hungarian layouts Ctrl+Alt = AltGr; the validator
   warns when a chosen global shortcut would collide with an AltGr character
   (e.g. Ctrl+Alt+F → `[`). The default stays `Ctrl+Alt+T` (T has no AltGr
   pairing).
9. **Directory**: `doc/` (not `docs/`); FUTURE.md and ARCHITECTURE.md live there.
10. **Portable data**: `data/` and `backup/` next to the exe; in dev mode they
    land next to `target/debug/` (gitignored).

## Phases in detail

### F1 — Foundation: design tokens, DB, domain model, app shell ✅ (2026-07-24)
- [x] Dependencies: rusqlite (bundled); @fontsource/inter, phosphor-svelte
      (opener/global-shortcut plugins arrive in F4/F8 when actually needed)
- [x] Nocturne tokens ported (`src/lib/styles/tokens.css` + `components.css`,
      light theme from the prototype's LIGHT map, Inter bundled locally)
- [x] Window config: decorations:false, custom title bar (drag region +
      working caption buttons), window permissions justified in capabilities
- [x] Rust: `paths.rs` (data/ next to the exe), `db/{schema,model,load,write,mod}.rs`
      — WAL, FK, user_version migrations, DbOp batches in one transaction
      (defer_foreign_keys), 6 Rust unit tests (roundtrip, upsert, FK, rollback)
- [x] `core/types.ts`, `core/ids.ts`, `core/ordering.ts` (fractional ordering),
      `core/dbops.ts`, `core/diff.ts` (snapshot diff → DbOps) — with tests
- [x] `ipc.ts`: db/settings/window wrappers
- [x] Store: apply pipeline (snapshot → mutate → diff → persist), undo stack
      (cap 30, bootstrap not undoable), serialized persist queue with retry
- [x] AppShell + TitleBar + StatusBar (saved/error indicator)
- [x] Inbox auto-create (fixed) — verified end-to-end: app ran, schema v1 +
      Inbox row appeared in SQLite
- [x] `example.ts` placeholder removed
- [x] Close-out: typecheck + 16 TS + 6 Rust tests green → review
      (bootstrap-undo bug fixed, YAGNI cleanup) → push

### F2 — Lists, groups, todo CRUD, Quick Add ✅ (2026-07-24)
- [x] Core: `lists-ops` / `groups-ops` / `todos-ops` / `rows` / `labels` /
      `emoji` / `scope` — 3-level depth cap + cycle guard in moveGroup,
      list deletion moves todos to Trash (prototype behavior), fractional
      ordering; 38 new tests (54 total)
- [x] ListRail: LISTS/VIEWS, +, active/drop states, counts, Ctrl-digit hints,
      inline rename with leading-emoji editing, list drag-reorder, todo drop
      onto lists
- [x] TabBar (single-pane), list switching; Pinned/Trash view placeholders (F5)
- [x] Tree view: GroupRow (caret, collapse persisted in DB, drop-into
      highlight + auto-expand), TodoRow (status circle cycling, stripe,
      G tag, subtask count, before/after drop lines), SectionRow, EmptyStates
- [x] QuickAdd: Enter → into the selected todo's group or list root,
      Shift+Enter opens details, focus stays, Ctrl+N focuses
- [x] Context menus: todo (statuses, Move to… morph, delete), group (New
      todo/subgroup + 3-level-limit hint), list (Inbox delete restriction)
- [x] Keyboard basics: Esc chain, Ctrl+N/Ctrl+Shift+N/Ctrl+1..9/Ctrl+Enter/
      Ctrl+Z/Delete/arrows; Toast + Undo
- [x] Visual smoke test: window captured and checked (rail, tabs, quick add,
      Inbox-zero empty state, status bar — per design)
- [x] Close-out: typecheck 0 errors, 54 tests green → review (menus.ts
      placeholder code fixed, a11y warnings resolved) → push

### F3 — Tree deepening, drag & drop, subtasks ✅ (2026-07-24)
- [x] DnD (built in F2): todo reorder with before/after lines, drop-into
      groups with highlight + auto-expand, drop onto rail lists (to root),
      rail list reorder; every drop is one undoable action + toast + activity
      (on cross-scope moves)
- [x] Subtask core: add/edit/toggle/remove/reorder (flat, reorder guarded to
      the owning todo) + activity entries — 6 new tests (60 total)
- [x] Pane-to-pane DnD arrives with F7 (multi-pane); group drag-reorder is
      v1.1 per the design's FUTURE.md — skipped
- [x] Close-out: typecheck 0, 60 tests green → push

### F4 — Detail panel, activity, colors, emoji, links ✅ (2026-07-24)
- [x] DetailPanel (320px): Details/Activity tabs, breadcrumb, ✕/Esc close
- [x] DetailForm: title (blur commit, blank edits revert), status pills,
      emoji input (Win+. hint), List/Global pin pair, Location dropdown
      (list root + indented group tree) + move-up button; F2 focuses+selects
      the title, Alt+← keyboard
- [x] `core/links.ts`: URL + Windows path detection, safe-path check (ADS/
      illegal characters rejected) + tests; opener plugin (capability
      justified), chips: URL → browser, path → Explorer/associated app
- [x] Color labels: 8 preset constants + max 12 custom (`core/labels.ts`),
      ColorPicker swatches with ring, LabelManager modal (counter,
      add/edit/remove; deleted label → todos fall back to none)
- [x] `core/time.ts` (Today/Yesterday/Mar 4 format) + ActivityList
      (newest-first, 2px rule); pin/archive/subtask/move activity entries
- [x] Duplicate per spec (§27) — inserted right after the original;
      order bug fixed in review
- [x] SubtaskList UI: progress bar, checkboxes, add input, remove
- [x] **CDP verification on the running app**: tab switch → dblclick detail →
      subtask check → `checked=1` + activity row in SQLite → Ctrl+Z undo →
      DB rolled back. Screenshot matches the design.
- [x] Close-out: typecheck 0, 75 tests green → review → push
- Note: LabelManager's Esc close is not in the Esc chain yet (backdrop click
  closes) — F9 keyboard-polish item

### F5 — Pinning, Pinned view, Archive, Trash, Undo ✅ (2026-07-24)
- [x] Local/global pin + Ctrl+P + "G" tag + Pinned section (built in F4)
- [x] GlobalPinnedStrip: accent band, collapse, chips (color dot + emoji +
      title + list name) → navigate home
- [x] PinnedView: GLOBAL first (accent), then per list; navigate home
      (pane switch, ancestor expand without undo, archived open, select +
      detail)
- [x] Archive section (rendered by rows.ts since F2; searchability lands in F6)
- [x] TrashView: Restore / Delete permanently / Empty Trash with
      confirmation (the app's ONLY confirm dialog — decision #2); restore
      falls back to root when the group is gone (core-tested in F2)
- [x] Undo: snapshot stack since F1 for every action; empty trash /
      permanent delete are also undoable
- [x] **CDP verification**: pin globally → strip appeared → PinnedView
      sections → navigate home back to the detail → Delete → Trash →
      confirm → Empty → Ctrl+Z brought it back. Green.
- [x] Close-out: typecheck 0, 75 tests green → push

### F6 — Search ✅ (2026-07-24)
- [x] `core/search.ts`: NFD → diacritics → lowercase → whitespace pipeline;
      Hungarian tests ("ÁRVÍZTŰRŐ TÜKÖRFÚRÓGÉP" ↔ "arvizturo tukorfurogep")
- [x] Fuzzy: substring (title/desc/subtask) + subsequence ≥4 chars on titles
      only (short queries stay noise-free) — 10 new tests (85 total)
- [x] FilterBar (Ctrl+F): live match count, groups force-expanded without
      saving state, Pinned/Archived filtered too, "No matches" empty state
- [x] GlobalSearch (Ctrl+Shift+F): 540px dialog, ≤20 deterministic results,
      breadcrumbs, ↑↓+Enter → navigate home; archived included, trash
      excluded
- [x] CommandPalette (Ctrl+K): lists with Ctrl+n hints + layout/view/theme
      commands (layout switching becomes visible with F7)
- [x] Esc chain extended: ctx → palette → gsearch → rename → picker →
      filter → detail; theme attribute (`data-theme`) wired
- [x] **CDP verification**: accent-insensitive global search + Enter
      navigation, Ctrl+F fuzzy filter with match count, palette → Trash
      view switch. Green.
- [x] Close-out: typecheck 0, 85 tests green → push

### F7 — Split pane system ✅ (2026-07-24)
- [x] Layouts: 1 / 2v / 2h / 4 CSS grid (fixed 1fr tracks), segmented
      LayoutSwitcher in the title bar
- [x] Pane state lives per slot (list, quick draft, filter, picker) —
      1→4→1 switches preserve slot contents
- [x] Active pane accent border (multi-pane only), keyboard goes there
- [x] Multi-pane: ListSelector dropdown popover replaces the TabBar
- [x] Pane-to-pane todo DnD (pane background = list root — since F2)
- [x] Settings sync: layout + pane→list + activePane + view into the
      settings table, restored at startup with validation (deleted list →
      null fallback)
- [x] **CDP verification**: 2v switch → 2 panes with selectors, pane-2 list
      switch, active-pane border follows clicks, 2×2 → 4 panes, roundtrip
      preserves slots; **layout + mapping restored after an app restart**.
      Green.
- [x] Close-out: typecheck 0, 85 tests green → push

### F8 — Global shortcuts, Quick Add window, Summon Workspace ✅ (2026-07-24)
- [x] Rust `src-tauri/src/winint/{virtual_desktop,window_activation,summon}.rs`
      — IVirtualDesktopManager COM wrapper (CoInitializeEx per call),
      foreground HWND captured BEFORE self-activation, monitor work-area
      clamp, SetForegroundWindow + FlashWindowEx fallback, maximized
      preservation, SUMMON_LOCK mutex (serialized transitions), desktop
      switching forbidden even as a fallback; main-close → app exit (the
      hidden quickadd must not keep it alive)
- [x] `core/shortcuts.ts` (pure): defaults (Ctrl+Alt+T / Ctrl+Shift+Space /
      2 optional), validation (modifier required, system blacklist), AltGr
      warning, conflict detection, recorder parser, Tauri accelerator
      conversion — 10 new tests (95 total)
- [x] `state/shortcut-manager.svelte.ts`: startup registration with failure
      collection (app always starts, single toast), transactional rebind
      (old released only AFTER the new registers; on failure the old stays),
      enable/disable, Summon/Hide toggle vs Always mode, reset defaults,
      persisted in settings
- [x] Quick Add window: separate always-on-top webview (`/quickadd` route,
      singleton), appears on the current desktop+monitor, target selector
      defaulting to Inbox; Enter → EVENT to the main window (single
      in-memory authority writes the DB) + hide + "Added to X" toast;
      Esc → hide
- [x] Pinned Todos / Global Search optional global actions (summon +
      view/search focus); ⚡ + ⚙ toolbar buttons, Settings from the palette
      too
- [x] Settings dialog per the §11 wireframe (recorder "Press shortcut…",
      Enabled toggle, Reset Defaults, inline error + AltGr warning)
- [x] Capabilities: quickadd window + global-shortcut + hide/show, justified
- [x] **CDP verification**: ⚡ → quickadd window with lists (Inbox default) →
      Enter → main wrote the DB (SQLite row + rail count); all three summon
      command branches ran; recorder rebind Ctrl+Alt+P + AltGr warning +
      OS registration proven (`is_registered`=true for all three); reset OK
- [x] Manual test checklist: `doc/WINDOWS-TESTS.md` (A–M) — virtual desktop
      behavior needs live verification
- [x] Close-out: typecheck 0, 95 tests, cargo check clean → push

### F9 — Scale, theme, keyboard polish, window state ✅ (2026-07-24)
- [x] UI scale (80–150% zoom with vh compensation — an overflow found in
      review was fixed) + todo font size (10–20px) separately; ScaleControls
      popover (chips, A−/A+, hint), Ctrl+wheel with a non-passive listener
- [x] System / Light / Dark theme: live matchMedia tracking, toolbar toggle
      + View menu (with a "Follow system ✓" mark), persisted under the
      appearance key
- [x] MenuBar (File/Edit/View/Go/Help): design contents, roaming hover,
      shortcut hints, selection-aware disabled states in Edit; Alt
      accelerators skipped (noted as nice-to-have)
- [x] F1 ShortcutsDialog (SHORTCUTS.md in two columns); Esc chain finalized:
      menu → shortcuts → ctx → scalePop → settings → palette → gsearch →
      rename → picker → filter → detail
- [x] Window state: position/size/maximized persisted (debounced
      onMoved/onResized), restored at startup with a monitor-intersection
      check (min 100px visible — defaults kept after a monitor disconnect)
- [x] **CDP verification**: menu contents + layout state dots, light theme
      switch (bg #eceef5), 125% zoom + scrollbar fix, A+/Ctrl+wheel font
      size, F1 opens/Esc closes; **light+125%+12px restored after restart**,
      then reset to defaults. Green.
- [x] Close-out: typecheck 0, 95 tests green → push

### F10 — Backup, import/export, hardening, portable release ✅ (2026-07-24)
- [x] Backup (Rust `db/backup.rs`): VACUUM INTO (WAL-consistent), daily
      automatic on a background thread + File → Backup now,
      `backup/todo-YYYY-MM-DD.db`, newest 10 kept
- [x] Restore: `File → Restore backup…` picker; automatic `pre-restore.db`
      safety copy before the swap, connection close → swap → reopen → full
      state reload (undo stack cleared); file-name validation (no path
      traversal)
- [x] Export/Import JSON (`core/transfer.ts`): full user data, format field;
      import FULLY validates FIRST (types, referential integrity, depth ≤3,
      duplicate ids, 12-label cap, Inbox guarantee) — a bad file never
      touches the DB; the import is one undoable apply; 7 new tests (102
      total)
- [x] Error handling: every data action surfaces a visible toast error;
      persist errors offer retry in the status bar; no silent catch anywhere
- [x] README (full: purpose, setup, build, portable layout, DB, backups,
      shortcuts, Windows Global Shortcuts highlighted) +
      `doc/ARCHITECTURE.md` + `doc/FUTURE.md` (minimal Markdown + design
      deferrals)
- [x] `build.bat`: typecheck + tests + release build + portable folder
      (`release\myTODO\myTODO.exe` + data/ + backup/); CRLF verified at
      byte level
- [x] Version: 1.0.0 in all three places (package.json, tauri.conf.json,
      Cargo.toml)
- [x] **CDP verification**: full File menu; backup_now → file in backup/;
      restore e2e (marker todo disappeared, toast, safety file on disk)
- [x] Close-out: typecheck 0, 102 TS + 6 Rust tests green → release build →
      push

## Definition of Done — status (daprompt §50 + shortcut.md §32)

| Requirement | Status |
|---|---|
| Portable Windows build (starts without an installer) | ✅ `release\myTODO\` — ran, created its own `data/` |
| Data in the portable data folder | ✅ SQLite next to the exe, verified |
| Inbox works (fixed, undeletable) | ✅ |
| Multiple tabs/lists, groups up to 3 levels | ✅ (depth cap tested at UI + import level) |
| Quick Add with Enter; Global Quick Add | ✅ CDP e2e |
| Todo CRUD + 4 statuses | ✅ |
| Subtasks, emoji, presets + 12 custom color labels | ✅ |
| Local + global pins, Pinned Todos view | ✅ |
| DnD across lists/groups/panes; 1/2/4 panes; layout restored after restart | ✅ |
| Accent-insensitive fuzzy search (current + global) | ✅ with Hungarian tests |
| Details + Activity, Archive, Trash/Restore, Undo, Duplicate | ✅ |
| URL/file/folder links | ✅ (safe-path guard) |
| UI scale + todo font size + light/dark/system | ✅ persist + restore verified |
| Keyboard shortcuts + F1 map | ✅ |
| SQLite stable (WAL, FK, migrations, transactions) | ✅ 6 Rust tests |
| Backups (daily + manual, keep 10) + Restore | ✅ e2e |
| JSON export/import with validation | ✅ roundtrip tests |
| README + ARCHITECTURE + FUTURE.md | ✅ |
| Summon: "press the key and it comes here" | ✅ command level verified; virtual desktop behavior → `doc/WINDOWS-TESTS.md` |

**Remaining manual work (owner):** the G / H / J-live / M items of
`doc/WINDOWS-TESTS.md` (monitor disconnect, live hotkey conflict, AltGr on a
Hungarian layout) — these need a live user session.

## Log

- **2026-07-24** — Analysis done: the three sources are coherent;
  discrepancies resolved (see Recorded decisions).
- **2026-07-24** — F1–F10 completed in one run: each phase closed with green
  typecheck+tests, CDP-based end-to-end verification against the running
  app, self-review + fixes, commit + push. Final state: 102 TS + 6 Rust
  tests, v1.0.0 portable release built and verified live.
- **2026-07-24 (afternoon)** — Windows integration tests executed in a live
  session (A–F, I, K, L ✅ — see WINDOWS-TESTS.md); app icon integrated
  (true-alpha cleanup) + Inbox watermark; portable renamed to myTODO.
- **2026-07-24 (evening)** — **Moved to GitHub**: github.com/lexandro/mytodo
  (public — explicit decision; the updater needs public releases), the
  gitlab remote kept as a backup. Live update added (tauri-plugin-updater,
  mdedit pattern): signed artifacts, keypair under E:\Mega\keys\
  mytodo-updater, repo secrets set. release.yml (tag → signed MSI/NSIS +
  latest.json + portable zip) + ci.yml. v1.0.0 released. All documentation
  translated to English (GitHub = international audience; daprompt.md and
  shortcut.md stay Hungarian as verbatim historical inputs).
