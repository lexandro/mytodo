# FUTURE — backlog, NOT for the current version

## Minimal Markdown support

A future version may optionally render minimal Markdown (bold/italic/inline
code, maybe lists) in todo **title** and **description** fields. For now both
are strictly plain text. The data model already accommodates this: titles and
descriptions are stored as raw text, so the feature needs no migration.
(URL / Windows-path auto-linking in descriptions already exists — that is
not Markdown.)

## Other items deferred from the design package

- **Group drag-reorder** — v1 drags lists and todos; dragging group rows
  themselves (reorder within a parent + re-nest with the 3-level cap enforced
  at the drop target) is the first follow-up.
- **Resizable split dividers** — v1 uses fixed 1fr tracks; draggable pane
  dividers with persisted ratios can come later.
- **Alt menu accelerators** — Alt+F/E/V/G/H shortcuts for the menu bar.

## Deferred AI features (aiprompt §46–53 — design nothing for these in V1)

- **Todo Workspace MCP / agent tools** — a controlled tool interface
  (list_todos, get_todo, create_todo, update_todo, add_subtask, add_activity)
  via MCP or another explicit protocol. V1 uses structured proposals instead.
- **Trusted AI actions** — user-defined trust policies allowing selected
  AI-origin mutations without review. V1: every mutation is review-gated.
- **Background / scheduled AI** — automatic workspace analysis, reconcile,
  suggestions, change monitoring. V1: every run is an explicit user action.
- **Workspace change monitoring** — filesystem changes, Git commits/branch
  switches triggering AI workflows.
- **Rich interactive agent sessions** — longer, resumable workspace
  conversations. V1: one action → one run → one result (provider
  session/thread ids are retained on runs for later use).
- **Codex App Server provider** — richer transport (bidirectional events,
  approvals, diff events, thread lifecycle) behind the same AgentProvider
  boundary.
- **Additional AI providers** — more AgentProvider implementations; no
  dynamic plugin system.
- **Multiple workspace roots** — V1: one list → max one primary linked
  directory.

## Deliberately NEVER (product decision, daprompt §37 as amended by aiprompt)

kanban / gantt / calendar, due dates & reminders, collaboration / cloud /
accounts, dashboards, plugins, priority systems, chatbot/conversational AI
surfaces, Git client features (branch management, commit UI, dashboards),
sprint/ticket/assignee/story-point systems, AI priority scores, autonomous
project management.

(The original list said "AI, integrations" wholesale; the AI Workspace
Integration V1 — an explicit owner decision, 2026-07-24 — superseded that.
What stays forbidden is AI as owner/chatbot, not AI as a contributor.)
