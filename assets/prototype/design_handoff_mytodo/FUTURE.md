# FUTURE.md — backlog, NOT for current implementation

- **Minimal Markdown support for title and description** — a future version may render light formatting (bold/italic/inline code, maybe lists) in todo titles and descriptions. Current version is strictly plain text; nothing in the current design may depend on Markdown rendering. Auto-linking of URLs and Windows paths in descriptions is already in scope and is not Markdown.
- **Group drag-reorder** — v1 reorders lists and todos by drag; dragging group rows themselves (reorder within parent, re-nest with the 3-level cap enforced at the drop target) is the first follow-up.
- **Resizable split dividers** — v1 uses fixed 1fr tracks; draggable pane dividers with persisted ratios can come later.

## Deferred AI features (design nothing for these in V1)
- **Todo Workspace MCP / agent tools** — a controlled tool interface (list_todos, get_todo, create_todo, update_todo, add_subtask, add_activity) via MCP or another explicit protocol. V1 uses structured proposals instead.
- **Trusted AI actions** — user-defined trust policies allowing selected AI-origin mutations without review. V1: every mutation is review-gated.
- **Background / scheduled AI** — automatic workspace analysis, reconcile, suggestions, change monitoring. V1: every run is an explicit user action.
- **Workspace change monitoring** — filesystem changes, Git commits/branch switches triggering AI workflows.
- **Rich interactive agent sessions** — longer, resumable workspace conversations. V1: one action → one run → one result (provider session/thread ids are retained on runs for later use).
- **Codex App Server provider** — richer transport (bidirectional events, approvals, diff events, thread lifecycle) behind the same AgentProvider boundary.
- **Additional AI providers** — more AgentProvider implementations; no dynamic plugin system.
- **Multiple workspace roots** — V1: one list → max one primary linked directory.

Explicitly out of scope permanently (product decision, see README constraints): kanban/gantt/calendar, due dates & reminders, collaboration/cloud/accounts, chatbot surfaces, Git client features (branch management, commit UI, dashboards), sprint/ticket/assignee/story-point systems, AI priority scores, autonomous project management, plugins.
