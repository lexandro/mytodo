# myTODO — development record

**What shipped when is in [`CHANGELOG.md`](../CHANGELOG.md)** (and in the app
under Help → What's new). This file keeps what a changelog cannot: the source
documents, the working method, and the decisions behind the design — the
"why" that would otherwise only exist in commit messages.

Source documents:

- **Functional spec**: `doc/daprompt.md` (wins on functionality; original
  Hungarian prompt, kept verbatim)
- **Design spec**: `assets/prototype/design_handoff_mytodo/` (wins on visuals
  and interactions; `prototype/myTODO App.dc.html` is the executable spec,
  updated 2026-07-24 with the AI Workspace Integration package — a strict
  superset, tokens unchanged, adds `AI_INTEGRATION.md`)
- **Shortcut addendum**: `doc/shortcut.md` (Summon Workspace + Global Shortcut
  Manager)
- **AI functional spec**: `doc/aiprompt.md` (AI Workspace Integration V1)

The `§` references in the code comments and in `doc/ARCHITECTURE.md` point at
these files.

## Working method

1. Implementation: pure core + colocated vitest first, then the UI
2. `bun run typecheck && bun run test` (+ `cargo test` when Rust changed) green
3. Self-review of the diff, then refactor on the findings
4. Green again → conventional commit → push → CHANGELOG entry if the change is
   user-visible
5. Verify against the running app (CDP) when the change has behavior a test
   cannot see — window/OS integration, drag & drop, real provider runs

Releases happen only on the owner's explicit request; features accumulate on
main until then.

## Recorded decisions

Numbering is historical; 1–10 are from the v1.0 build (2026-07-24), 11–17 from
the AI Workspace Integration V1 analysis (2026-07-24).

1. **DB layer**: rusqlite on the Rust side with typed `#[tauri::command]`s;
   SQL never leaks into TS. Domain state lives fully in memory (Svelte 5
   runes) with SQLite write-through persistence. Undo = in-memory snapshot
   stack (cap 30) + DB writes.
2. **Confirmations**: no dialogs anywhere (undo + toast), with ONE exception:
   Empty Trash asks.
3. **Design-gap resolution**: the File menu grows (Import/Export JSON, Backup
   Now, Restore…, Settings); the Global Shortcuts editor lives in a separate
   Settings modal.
4. **Group deletion**: children re-parent to the grandparent, todos are kept,
   undoable — the daprompt's "move-content workflow" branch.
5. **Ctrl+K command palette**: present in the design, not requested by the
   functional prompt → built in.
6. **Fonts**: Inter bundled (@fontsource, local) — the tokens' Google Fonts
   `@import` cannot ship due to the strict CSP + offline-first.
7. **Hide vs minimize (Summon toggle)**: hide, BUT only while the Summon
   shortcut is registered — otherwise minimize, so the window can never become
   unreachable. The single-instance plugin also raises it on relaunch.
8. **AltGr protection**: on Hungarian layouts Ctrl+Alt = AltGr; the validator
   warns when a chosen shortcut would collide with an AltGr character (e.g.
   Ctrl+Alt+F → `[`). The default stays `Ctrl+Alt+T` (T has no AltGr pairing).
9. **Directory**: `doc/` (not `docs/`).
10. **Portable data**: `data/` and `backup/` next to the exe; in dev mode they
    land next to `target/debug/` (gitignored).
11. **AI concurrency**: ONE run per workspace directory at a time, regardless
    of mode — stricter than aiprompt §34 (owner decision). No queue, no
    scheduler; a second attempt gets a human message.
12. **Design package**: the AI-era package replaced the old one in
    `assets/prototype/design_handoff_mytodo/` (strict superset). Its README's
    "no environment exists yet" line is stale v1 copy — we evolve the existing
    Tauri+Svelte app.
13. **Run log storage**: capped, structured progress lines on the run row in
    SQLite — no unlimited terminal dumps, no separate log files — plus a
    capped run history per list, so startup stays lean.
14. **Docs**: update the existing `doc/FUTURE.md` / `doc/ARCHITECTURE.md`,
    never create parallel docs. FUTURE.md's old "Deliberately NEVER: AI" line
    is superseded by the AI feature itself; what stays forbidden is AI as
    owner/chatbot, not AI as a contributor.
15. **Provider executables**: `claude` is a real `.exe`, but `codex` is
    typically an npm `.cmd` shim. Shims run through `cmd.exe /C <path>` and
    only after a metacharacter check on the path (cmd.exe quoting is not
    reliably escapable); real `.exe` paths are spawned directly. Either way
    the arguments are a fixed, structured argv — never an assembled command
    string.
16. **Read-only enforcement** maps to provider flags: Claude Code
    `--permission-mode plan`, Codex `--sandbox read-only` (and
    `-c sandbox_mode=…` when resuming, where the flag does not exist).
    `dangerously-skip-permissions` and equivalents are never used — a Rust
    test asserts it for every provider/mode combination.
17. **Workspace links + AI client config live in the settings table** (keys
    `workspaces`, `aiClients`), not as `lists` columns: linking is config, not
    undoable domain data, so it stays out of the undo/diff pipeline. Only
    `ai_runs` needed a real table. Values from disk are untrusted — core
    normalizers repair or drop invalid entries field by field.

## Open manual verification

Everything automatable is covered by the test suites and by CDP runs against
the real app. What still needs a human at the machine:

- `doc/WINDOWS-TESTS.md` — items G / H / J-live / M: monitor disconnect, a
  live hotkey conflict with another app, AltGr behavior on a Hungarian layout
- `doc/AI-TESTS.md` — the live-session items, notably the Codex-side
  conversation checks (G2 / G8): the resume argv and session continuity are
  verified, but the answers themselves were blocked by an OpenAI outage
