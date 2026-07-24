# AI_INTEGRATION.md — AI Workspace Integration V1 (design specification)

Design-side spec for the AI Workspace Integration. Functional requirements live in the implementation prompt; this document pins down the UX, states, copy and visual rules as realized in the prototype. Component anatomy: COMPONENTS.md §AI components. Interaction rules: INTERACTIONS.md §AI runs. All screens: SCREENS.md #22–42.

## Product rule (design north star)
The app is NOT an AI IDE, chatbot, or autonomous manager. The user writes "this needs doing", then — from the same surface — asks an agent to *look at it, break it down, plan it, do it, or check it* in the directory the list belongs to. The AI is a contributor; the todo list stays the user-controlled source of truth. Visually the AI is a tool like search or Quick Add: one ✦ glyph, no gradients, no chat bubbles, no robots, no "magic" styling.

## Concepts
- **Linked Workspace** — a list optionally links exactly ONE directory: `{path, type: Git|Generic, brief (plain text), preferredProvider|null, missing}`. Git detection is automatic; Git is NOT required for AI. Entry points: list/tab context menu ("Link Workspace…" / "Workspace settings…"), the workspace chip, AI-entry CTAs.
- **AI Brief** — optional per-workspace plain text added to every run's context (build commands, conventions, no-go areas). The app never writes or syncs CLAUDE.md / AGENTS.md / provider-native files — the CLI runs with the workspace as working directory and uses its own native context mechanism.
- **Providers** — Claude Code and Codex, driven as locally installed CLIs behind a provider abstraction. No accounts, no API keys, no login UI; authentication happens in each client's own CLI. Global default client + optional per-workspace preferred client. **No silent fallback**: if the chosen provider is unavailable, tell the user and let them pick/configure.
- **Modes** — every action maps to a semantic mode, always shown in the run panel:
  - ● Analyze — read only (Investigate, Verify, Analyze Workspace, Suggest, Reconcile, Ask)
  - ● Plan — read only (Break into Subtasks, Plan Implementation)
  - ● Execute — may modify workspace (Implement only). Amber #e0a36c mark + "Run — may modify workspace" button label. No scary security dialogs, no per-run confirmation stack — one explicit Run is the consent.
  - Execute authorizes modifying the LINKED WORKSPACE only; the todo data always goes through proposals.

## Actions
Todo-level (detail AI tab, ✦ AI menu, todo context menu → AI actions…):
1. **Investigate** — read the workspace, report what's going on. → Summary + Findings + proposals.
2. **Break into Subtasks** — subtask checklist proposal. → "Proposed Subtasks".
3. **Plan Implementation** — concrete plan as findings + optional proposals.
4. **Implement** — Execute mode; changes workspace files; result may include changed-files summary (M/A file list) + status-change proposal.
5. **Verify** — evidence-based check. → **4-value Verdict**: Complete (green) / Partially complete (amber) / Incomplete (red) / Uncertain (neutral) + Checks (✓/⚠ rows) + Recommendation box with explicit "Apply Recommendation" — status NEVER changes automatically.

Workspace-level (✦ AI menu, list context menu):
6. **Analyze Workspace** — read-only summary + findings. Domain-neutral: the workspace can be code, marketing, documentation or any directory — the result UI is the same generic Summary/Findings shape (e.g. "brief exists, draft exists, final copy missing").
7. **Suggest Todos** — "Potential Todos" proposal list, "Add Selected".
8. **Reconcile Todos ↔ Workspace** — mapping rows (todo → Likely completed / Still missing / Partially completed / New suggestion, tone-colored) + "Suggested Changes" proposals.
9. **Ask Workspace…** — one free-text question → one run → one answer. Read only. No chat history, no follow-up thread in V1.

## Run lifecycle (AIRunPanel phases)
ready → running → result | failed | cancelled; plus history / unlinked / missing entry states.
- **Running**: spinner + action · provider + tabular elapsed; compact streamed progress lines (human phrases like "Reading workspace (git repository)…", never raw JSON) showing the last 4; "Show details" reveals the full log; Cancel button. Closing the panel does NOT stop the run — it finishes in the background, a toast announces it, and it reopens from history (split-pane safe: the run is bound to the list/todo context it was started from).
- **Result**: task-execution-record look, not chat: status line, then only the blocks the action produced (Question, Verdict, Summary, Answer, Checks, Mapping, Findings, Recommendation, Proposals, log behind Show details, New run).
- **Failed / Cancelled**: ⚠ + human-readable message ("Codex was not found. Select the executable in the AI Clients settings, or pick another provider." / "…installed but not ready. Complete authentication using the Codex CLI.") + Retry + "Open AI Clients…" when client-caused. Cancelled runs persist in history.
- **Concurrency**: one run per workspace at a time — "Another AI operation is already running for this workspace." toast. No job scheduler.

## Proposals — the mandatory boundary
AI → structured proposed actions → validation → user review → **Apply Selected** → normal domain commands → activity log → undo.
- Kinds shown in V1 UI: Add subtask, Change status, Create todo, Archive todo (model also supports Update todo/subtask, Move to group — same row pattern with kind tag).
- Review supports individual selection, **Select all / Clear selection**, and skip/close; rows are keyboard-operable (Tab + Space/Enter).
- Every proposal row: checkbox + uppercase kind tag + label; pre-checked = AI-recommended; applied rows dim with a green "applied" tail.
- Permanent caption: "The AI only proposes — nothing changes until you apply."
- Apply Selected = ONE undoable batch (toast: "Applied n changes — one batch, Ctrl+Z undoes it"). Same validation as manual edits (valid status, group depth ≤ 3, archive semantics); invalid proposals fail visibly, never silently.
- Activity log gets high-level entries only: "AI Investigate started/completed (Claude Code)", "AI applied — added subtask "…"" — never the full AI response; entries can reference the AIRun id.

## AI Clients (settings dialog)
Per provider (ProviderCard): Enabled, status (● Detected / ◌ Detecting… / ○ Not detected / ● Installed — not ready), executable path (mono) + Browse…, Version, Auto Detect, Test. Detection uses PATH/Windows command resolution; no drive scanning. Browse-selected executables are validated (identity + version) before counting as "detected" — an arbitrary file never silently becomes "Claude Code detected". Test distinguishes: missing / invalid / works / not authenticated, with human messages. Global "Default AI client" select + note that workspaces can override. Config is portable (paths may break on another machine → statuses degrade gracefully, Auto Detect re-runnable); credentials are never stored.

## Degraded states — the app never degrades with it
- No client installed / AI disabled / list unlinked → the ENTIRE todo app works unchanged; AI surfaces show quiet CTAs ("Link a workspace to use AI" + Link Workspace…).
- Linked directory deleted/moved → chip turns ⚠ amber, AI panel shows "Workspace not found" + mono path + Locate… / Unlink; todos unaffected.
- AI must add zero friction to Quick Add, tab switching, search, split panes, drag & drop, keyboard nav, startup. No provider detection on routine UI actions.

## Keyboard
Ctrl+Shift+A opens the AI panel for the selected todo / current list (app-local — V1 registers no new OS-global shortcuts). Esc closes panel/dialogs per the global priority order (INTERACTIONS.md); proposal checkboxes and buttons are normal focusable controls.

## Visual character (binding)
Nocturne tokens only. The ✦ four-point sparkle (11–12px, accent) is the single AI marker. Panel/dialog chrome identical to existing surfaces (surface bg, divider borders, shadow-md/lg, 12–12.5px UI text, 10–10.5px meta). Status colors reuse the app's set: green #7cc98f, amber #e0a36c (Execute + warnings + "not ready"), red #e07b7b (failed/destructive), accent for selection/running. Never flood the accent; never use emoji in AI chrome.

## Explicitly NOT in V1 (design nothing for these)
MCP/agent tool interface, trusted auto-apply policies, background/scheduled AI, filesystem/Git-triggered automation, multi-turn agent sessions, Codex App Server UI, additional providers, multiple workspace roots per list. Listed in FUTURE.md.
