# mytodo

Native Windows desktop app: **Tauri v2** (Rust shell) + **Svelte 5** (SvelteKit SPA) + Bun.

## Shared rules (apply to all of my projects)

### Communication and language
- **Communicate with the user in Hungarian**; **program in English** (code, identifiers, code comments in English)
- This repo is public on GitHub → **all project documentation is in English** (international audience; explicit owner decision 2026-07-24)

### Principles
- **Never assume — ask!** When in doubt, ask instead of guessing (about types, API response shapes, file contents too)
- Principles in priority order (higher wins on conflict): 1. KISS/YAGNI, 2. SOLID, 3. Clean Architecture
- The primary reader of the code is an AI: write code an LLM can continue correctly with minimal context — always explicit, never implicit; no "clever code"; consistent patterns beat individual elegance
- No shortcuts, hacks or duct tape — professional solutions only

### Tooling
- **Package manager: Bun** — NEVER npm/yarn/pnpm; `bun.lock` is committed
- CLIs installed and authenticated: `glab`, `gh`, `wrangler` — use them, not curl/REST calls
- Git: **this project lives in the PUBLIC github.com/lexandro/mytodo repo** (`origin`; explicit decision 2026-07-24 — auto-update feeds from public releases). The `gitlab` remote is a backup mirror; syncing it is optional (`git push gitlab main`). Conventional commits in English (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)

### Code quality
- Above ~150 lines/file stop and consider splitting — a smell, not a hard cap (exceptions: pure types, generated code, test data). One file = one responsibility. Max ~20–25 lines/function.
- TypeScript: `strict: true`; `any` is FORBIDDEN (`unknown` + type guard instead); explicit return type on every function; NO barrel exports (index.ts re-exports)
- No silent failures — always explicit error handling; async/await in try-catch
- Comments explain WHY, not WHAT

### Definition of "done"
- Before committing: typecheck + affected tests green. Tests are the contract — since coding is delegated, without tests there is no feedback on correctness.

### Secrets
- Secrets NEVER go into the repo. Locally `.env` / `.dev.vars` (gitignored); `.env.example` with key names only; prod values from CI secrets.

### Windows environment
- `.bat` files ALWAYS use CRLF line endings and ASCII text (no accents)
- In Bash: avoid `cd /d` and `-C` flags with Windows paths; use forward slashes


## Architecture — pure core, thin shell

- **All real logic goes into pure `.ts` modules** under `src/lib/core/`: no Tauri, Svelte or DOM imports. Every core module has a colocated `*.test.ts` (vitest).
- **Only `src/lib/ipc.ts` may import the Tauri API** — the single boundary module toward the native side. Introduce new native capabilities there as wrapper functions.
- Svelte components stay thin: state + rendering; logic comes from the core.
- Rust-side (src-tauri) code only when the frontend can't do it: new `#[tauri::command]` + registration in `lib.rs`, plus a permission in `capabilities/default.json`. Keep the capability set minimal — extend deliberately.

## Commands

- `bun install` — dependencies
- `bun run app` — the app in dev mode WITH the DEV icon (`tauri dev --config src-tauri/tauri.dev.conf.json`); the FIRST launch compiles Rust for minutes!
- `bun run app:build` — local release-profile exe with the DEV icon (no bundle)
- `bun run tauri dev` — same but with the release icon (prefer `bun run app`)
- `bun run dev` — frontend only (port 1420, strict — fails if the port is taken)
- `bun run typecheck` — svelte-check (must be green before committing)
- `bun run test` — vitest
- `cd src-tauri && cargo test` — Rust persistence tests
- `build.bat` — typecheck + tests + release build + portable folder (`release\myTODO\myTODO.exe`)
- `bun run tauri build` — full release + MSI/NSIS installers

## Releases and live update

- **Releases happen ONLY on the owner's explicit request.** Features and fixes accumulate on main (commit + push is fine); never bump the version or push a tag on your own. At most, mention that releasable work has piled up — the decision is the owner's.
- **Release flow** (when requested): bump the version in THREE places → `git tag vX.Y.Z` → `git push origin vX.Y.Z` → `.github/workflows/release.yml` (tauri-action) builds the signed MSI+NSIS installers with updater artifacts, publishes the GitHub Release and attaches the portable zip. No manual publish step.
- **Updater**: `tauri-plugin-updater`; endpoint `releases/latest/download/latest.json`, pubkey in `tauri.conf.json`. The frontend checks quietly every 6 hours via `state/updater.svelte.ts` and only OFFERS the update (status bar chip / Help menu) — download+install is always user-initiated.
- **Signing keypair**: `E:\Mega\keys\mytodo-updater\` (mytodo.key + password.txt); repo secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Losing the key = existing installs can never update again. Changing the pubkey is breaking.
- CI (`ci.yml`) runs typecheck + tests + build on every push — never leave main red.

## Cornerstones

- **Single instance**: a second launch focuses the existing window (plugin in `lib.rs`) — so a running installed/portable copy makes `bun run app` exit immediately.
- **Build identity**: version + git hash are baked in by `vite.config.js`; only `release.yml` sets `MYTODO_BUILD_CHANNEL=release`, everything else is a `-dev` build with the DEV icon (`src-tauri/tauri.dev.conf.json` + `icons/dev/`). Help → About shows all of it.
- **Strict CSP** (`tauri.conf.json`): no new external source/inline script without loosening the CSP — if you must loosen it, justify it.
- **Version bump in THREE places** (always together): `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`.
- `target/` sits in the project root (set by `.cargo/config.toml`) — gitignored; `release/` (local portable output) likewise.
- Line endings: `.gitattributes` enforces LF; `.bat` files are CRLF.
