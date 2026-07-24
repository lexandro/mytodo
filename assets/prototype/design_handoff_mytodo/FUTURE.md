# FUTURE.md — backlog, NOT for current implementation

- **Minimal Markdown support for title and description** — a future version may render light formatting (bold/italic/inline code, maybe lists) in todo titles and descriptions. Current version is strictly plain text; nothing in the current design may depend on Markdown rendering. Auto-linking of URLs and Windows paths in descriptions is already in scope and is not Markdown.
- **Group drag-reorder** — v1 reorders lists and todos by drag; dragging group rows themselves (reorder within parent, re-nest with the 3-level cap enforced at the drop target) is the first follow-up.
- **Resizable split dividers** — v1 uses fixed 1fr tracks; draggable pane dividers with persisted ratios can come later.
- Explicitly out of scope forever (product decision, see README constraints): kanban/gantt/calendar, due dates & reminders, collaboration/cloud/accounts, AI features, integrations, dashboards, plugins.
