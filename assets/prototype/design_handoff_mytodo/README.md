# Handoff: myTODO — fast local Windows task workspace

## Overview
myTODO is a keyboard-first, local-first Windows desktop todo app for developers: a scratchpad / working-memory tool, NOT a project-management system. Its two defining concepts are **tabbed todo workspaces** (independent lists switched in one keystroke) and **optional split-pane layouts** (1 / 2 / 4 panes, each showing a different list). Every design decision serves: *speed over features, zero-friction capture, minimal dialogs*.

## About the Design Files
The file in `prototype/` is a **design reference created in HTML** (a Design Component: an HTML template plus a JS logic class in one file). It is a working interactive prototype showing intended look and behavior — **not production code to ship**. Your task is to **recreate this design in the target codebase's environment**. No environment exists yet; choose the most appropriate stack for a fast, local, portable Windows desktop app (e.g. Tauri + web frontend, or WinUI 3 / WPF — developer's choice; the design assumes nothing beyond a standard desktop window). The prototype's logic class is readable, plain JavaScript and documents the exact intended behavior of every interaction — treat it as an executable spec.

`prototype/_ds/.../styles.css` contains the **Nocturne design tokens** (CSS variables) that all colors, fonts, spacing, radii and shadows are taken from. Port these tokens verbatim.

## Fidelity
**High-fidelity.** Colors, typography, spacing, sizes and interaction states are final and should be recreated pixel-faithfully (see DESIGN.md for exact values). Copy text in the prototype is sample data except for UI chrome labels, placeholders, empty states and toasts, which are final copy.

## Documentation map
- `DESIGN.md` — philosophy, information architecture, layout metrics, tokens (dark + light), data model
- `COMPONENTS.md` — every component: anatomy, sizes, states
- `INTERACTIONS.md` — click / keyboard / drag & drop / undo semantics
- `SHORTCUTS.md` — full keyboard map
- `SCREENS.md` — all screens & states and how to reach them in the prototype
- `FUTURE.md` — deferred features (do not implement now)

## Hard product constraints (from the product spec)
- Local-first, portable: **no account, no login, no cloud, no sync, no collaboration.** Fully autosaved; never show a Save button.
- Do NOT build: kanban, gantt, calendar, due dates, reminders, assignees, story points, sprints, comments, AI features, VCS integrations, complex filter builders, priority scales, dashboards, plugins.
- Inbox is a permanent, undeletable list. Group nesting is capped at 3 levels (todos may additionally sit at list root). Subtasks are a flat checklist — not todo objects (no own description/activity/tree).
- Delete is always soft (Trash → restore / delete permanently). Undo (Ctrl+Z) covers delete, move, reorder, status change, rename, archive, pin. Prefer undo toasts over confirmation dialogs.
- Persist across restarts: pane layout, pane→list assignments, active list, UI scale, todo font size, theme, collapsed groups, archived-section open state, custom color labels.

## State Management (reference implementation in the prototype logic class)
- `lists[] {id,name,emoji,fixed}` · `groups[] {id,listId,parentId,name,emoji}` · `todos[]` (see DESIGN.md §Data model). Array order IS display order for lists and for todos within a group.
- UI state: `layout ('1'|'2v'|'2h'|'4')`, `panes[4] {listId, quick-add draft, filter}`, `activePane`, `view ('main'|'pinned'|'trash')`, `selectedId`, `detailOpen`, `detailTab`, `theme`, `scale`, `todoFs`, `collapsed{}`, `archOpen{}`.
- Undo = snapshot stack of `{lists,groups,todos}` (cap 30), pushed before every mutating action; Ctrl+Z pops and shows a toast.

## Assets
No image assets. Icons: use **Phosphor** (https://phosphoricons.com) in production; the prototype uses minimal inline SVG stand-ins with the same silhouettes (push-pin, magnifier, trash, lightning, sun/moon, pane-split glyphs, inbox tray). Emoji are user content, rendered with the system emoji font; emoji input uses the native Windows picker (Win+.).

## Files
- `prototype/myTODO App.dc.html` — the interactive prototype (template + logic class; runs inside the design tool's runtime, so open the source rather than double-clicking the file)
- `prototype/_ds/nocturne-d2b9f504-5889-47d6-89b5-78423c871e09/styles.css` — design tokens + base component classes (buttons, inputs, tags, dialog)
