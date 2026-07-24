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

## Deliberately NEVER (product decision, daprompt §37)

kanban / gantt / calendar, due dates & reminders, collaboration / cloud /
accounts, AI, integrations, dashboards, plugins, priority systems.
