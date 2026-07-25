# myTODO

A fast, keyboard-first, local Windows todo workspace for developers —
Tauri v2 (Rust) + Svelte 5 + SQLite. **Not a project-management system**: the
goal is to jot down a task in two seconds while working, then get back to it.

- **Tabbed workspace** — multiple lists (permanent Inbox), groups up to 3 levels
- **Split panes** — 1 / 2 / 2×2 layouts, a different list per pane
- **Zero-friction capture** — Quick Add (Enter saves), global Quick Add window
- **Summon Workspace** — `Ctrl+Alt+T` brings the app to your current virtual
  desktop from anywhere (instead of taking you to it!)
- **Local-first, portable** — no account, no cloud; all data lives in the
  `data/` folder next to the exe
- **Live updates** — signed automatic updates from GitHub Releases

## Install

From the [Releases](https://github.com/lexandro/mytodo/releases/latest) page:

- **Installer** (recommended): `myTODO_x.y.z_x64-setup.exe` (NSIS) or `.msi` —
  the installed app **updates itself**: it quietly checks for a new version
  every 6 hours and offers it in the status bar; downloading/installing is
  always your call. Manual check: `Help → Check for updates…`
- **Portable**: `myTODO-vx.y.z-portable.zip` — unzip and run; your data stays
  inside the folder. The portable build does not self-update (it notifies
  about new versions, but you swap the exe yourself).

## Development

```
bun install
bun run app           # the first launch compiles Rust — takes minutes
```

`bun run app` is `tauri dev` with `src-tauri/tauri.dev.conf.json`, which
swaps in the **DEV icon** (same artwork, red DEV band) so a development build
is never mistaken for the installed one. `bun run app:build` does the same for
a local release-profile exe. Plain `bun run tauri dev` still works — it just
carries the clean icon.

Prerequisites: [Rust](https://rustup.rs) + VS Build Tools (C++ workload), Bun.

## Checks

```
bun run typecheck     # svelte-check — must be green before committing
bun run test          # vitest (core modules)
cd src-tauri && cargo test   # Rust persistence tests
```

## Build / portable release

- `build.bat` — tests + release build + **portable folder**:

  ```
  release\myTODO\
      myTODO.exe
      data\        (created on first launch — todo.db, settings)
      backup\      (daily + manual backups)
  ```

  Copy the folder anywhere — the data moves with it. No installer, no
  registry dependency.
- `bun run tauri build` — full release + MSI/NSIS installers (optional path)

## Data storage and backups

- **SQLite**: `data/todo.db` (WAL, foreign keys, versioned migrations)
- **Backups**: automatically once a day at startup + `File → Backup now`;
  `backup/todo-YYYY-MM-DD.db`, the newest 10 are kept
- **Restore**: `File → Restore backup…` — the current data is saved to
  `backup/pre-restore.db` before the swap
- **Export / Import JSON**: `File → Export JSON… / Import JSON…` — a
  human-readable, portable format; imports are validated first and applied
  as a single undoable step — a bad file never touches the database
- **Where are my files?** `File → Settings…` shows the data and backup
  folders with an *Open folder* button next to each

## Keyboard (full map: F1 in the app)

| Action | Keys |
| --- | --- |
| New todo / focus quick add | `Ctrl+N` |
| New list | `Ctrl+Shift+N` |
| Switch list | `Ctrl+1…9` / `Ctrl+K` |
| Filter current list | `Ctrl+F` |
| Global search | `Ctrl+Shift+F` |
| Toggle done ↔ open | `Ctrl+Enter` |
| Pin to list | `Ctrl+P` |
| Rename | `F2` |
| Delete (to Trash) | `Delete` |
| Undo | `Ctrl+Z` |
| Todo text size | `Ctrl+mouse wheel` |

## Windows Global Shortcuts

> **Summon Workspace moves the existing application window to your current
> Windows virtual desktop instead of switching you to the desktop where the
> application was previously located.**

| Action | Default | |
| --- | --- | --- |
| Summon Workspace | `Ctrl+Alt+T` | summon/hide toggle (configurable in Settings) |
| Global Quick Add | `Ctrl+Shift+Space` | tiny floating window on the current desktop |
| Pinned Todos | — | optional, assignable in Settings |
| Global Search | — | optional, assignable in Settings |

- Customization: `File → Settings…` — click the field and press the new
  combination. Rebinds are transactional: the old shortcut keeps working
  until the new one registers successfully.
- On conflicts (another app owns the combination) you get a clear error and
  the app still starts.
- `Ctrl+Alt` equals AltGr on Hungarian/European layouts — the settings
  dialog warns when a combination could block typing in other apps.
- Shortcut settings live in the portable `data/` folder (not the registry).

## AI Workspace Integration

A todo list can be linked to **one project directory** (a Git repository or
any folder), and locally installed AI CLIs can then investigate, plan,
implement and verify todos against that directory. The AI is a contributor,
never the owner: **every AI-origin todo change is a proposal you review and
apply** — nothing touches your todo data automatically.

### Setup

- **Clients**: install [Claude Code](https://claude.com/claude-code) and/or
  [Codex CLI](https://github.com/openai/codex) and authenticate them in
  their own CLI (`claude` / `codex login`). myTODO **never asks for or
  stores API keys or accounts** — it drives the CLIs you already use.
- `File → AI Clients…`: **Auto Detect** finds the executables on your PATH
  (no drive scanning); **Browse…** lets you pick one manually — an arbitrary
  file is validated (identity + version) before it counts as detected.
  **Test** checks executable → version → authentication readiness where the
  CLI supports a non-interactive check. Pick a global **Default AI client**;
  each workspace can override it.
- **Model**: pick one per client in the AI Clients dialog or straight from
  the panel's composer; empty = whatever the CLI is configured to use.
  Neither CLI has a "list models" command, so myTODO reads what they cache
  themselves — Codex's account model list, and any extra options Claude Code
  has beyond `opus` / `sonnet` / `haiku` / `fable`. The lists are read in the
  background (never during startup), and if they cannot be read you still get
  a built-in list plus a free-text field for any model name.
- **Link a workspace**: right-click a list → *Link Workspace…* (or the panel's
  CTA). Linked lists get a **WS** badge next to their name (amber `WS!` when
  the directory has gone missing). The optional **AI Brief** is plain text
  added to every run's context (build commands, conventions, no-go areas).
  Provider-native project files (`CLAUDE.md`, `AGENTS.md`, …) are never read,
  written or merged by myTODO — the CLI runs inside your workspace and uses
  them natively.

### The AI panel: preset tasks or a conversation

**✦ AI** (or `Ctrl+Shift+A`) opens the side panel for the current list and
selection — no dropdown. There you either pick a **preset task** or just type
into the console at the bottom and talk to the workspace.

- **Conversation**: every answer can be followed up. myTODO resumes the CLI's
  own session (`claude --resume`, `codex exec resume`), so the AI remembers
  the thread while your todo list is re-sent fresh each turn. `+` starts a new
  chat; the clock icon lists earlier conversations, and reopening one
  continues it.
- **Permission mode** is picked per conversation (Read-only / Execute) and
  then locked for that thread — a resumed session can never quietly gain
  write access. Preset tasks keep their own fixed mode:

| Mode | Meaning | Actions |
| --- | --- | --- |
| ● Analyze | read only | Investigate, Verify, Analyze Workspace, Suggest Todos, Reconcile, Ask Workspace |
| ● Plan | read only | Break into Subtasks, Plan Implementation |
| ● Execute | **may modify the linked workspace** | Implement, and chat you switched to Execute |

Todo-level tasks are also on the todo's **AI tab** / context menu. Turns
stream compact progress, can be stopped any time, keep running if you close
the panel, and any answer may carry todo **proposals** you review. One run per
workspace at a time.

### Security model

- The Rust backend only launches the **validated provider executables**
  with fixed, mode-derived arguments — there is no generic "run a command"
  IPC, and full permission-bypass flags are never used. Execute maps to the
  provider's own scoped permission model (Claude Code `acceptEdits`, Codex
  `workspace-write`). Model names and session ids are charset-validated
  before they enter the argv, so nothing you type can turn into a flag.
- The AI **never gets database access**. Results arrive as structured
  proposals (create todo, change status, add subtask, …) that are validated
  by the same rules as manual edits and applied only after your review —
  **Apply Selected is one batch, one Ctrl+Z undoes it**.
- The app is fully functional without any AI client installed; a missing
  workspace or CLI degrades to a clear message, never an error state.

## Releasing (maintainer)

1. Move `CHANGELOG.md`'s `## Unreleased` block under a
   `## vX.Y.Z — YYYY-MM-DD` heading (it is what Help → What's new shows)
2. Bump the version in all THREE places together: `package.json`,
   `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`
3. `git tag vX.Y.Z && git push origin vX.Y.Z`
4. GitHub Actions (`release.yml`) verifies that the tag matches all three
   version places, then builds the signed MSI + NSIS installers with updater
   artifacts (`latest.json`), publishes the release live and attaches the
   portable zip — installed apps update from it automatically.

Only these tag builds are marked as official: **Help → About myTODO** then
shows a bare `1.0.1`, while every other build (local `build.bat`, CI, dev
server) shows `1.0.1-dev`. The dialog also carries the git commit the binary
was built from — ask for it in bug reports.

The updater signing keypair lives in the owner's key vault
(`E:\Mega\keys\mytodo-updater\`) and on the repo as the
`TAURI_SIGNING_PRIVATE_KEY(_PASSWORD)` secrets.
**Losing the key means existing installs can no longer update.**

## Documentation

- `doc/ARCHITECTURE.md` — architecture overview
- `doc/WINDOWS-TESTS.md` — manual Windows integration test checklist
- `doc/AI-TESTS.md` — manual AI integration test checklist
- `doc/FUTURE.md` — deferred ideas (deliberately out of scope for now)
- `doc/progress.md` — development log
- `doc/daprompt.md`, `doc/shortcut.md`, `doc/aiprompt.md` — original
  (Hungarian) specification prompts, kept verbatim as historical source
  material

## License

MIT — see [LICENSE](LICENSE).
