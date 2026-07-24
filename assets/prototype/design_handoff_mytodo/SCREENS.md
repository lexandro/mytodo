# SCREENS.md — screens & states, and how to reach each in the prototype

The prototype (`prototype/myTODO App.dc.html`) is one live workspace; every required screen/state below is reachable with the listed steps. Sample data ships with all statuses, both pin kinds, archived + trashed items, subtasks, links and color labels.

| # | Screen / state | How to reach | Notes |
| --- | --- | --- | --- |
| 1 | Main window — single pane | default | Conference App list, tab bar mode |
| 2 | Vertical two-pane | toolbar 2nd layout btn / Ctrl+K "split vertical" | per-pane compact list selector |
| 3 | Horizontal two-pane | toolbar 3rd layout btn | |
| 4 | Four-pane (2×2) | toolbar 4th layout btn | active pane = accent border |
| 5 | Todo detail — Details tab | click "Fix authentication timeout" (selected by default) | status pills, location, colors, subtasks, links |
| 6 | Todo detail — Activity tab | detail header → Activity | timestamped event log |
| 7 | Global Search | Ctrl+Shift+F, type "arvizturo"-style or "token" | breadcrumbs, Enter jumps |
| 8 | Current List Search | Ctrl+F in a pane | match count, fuzzy note |
| 9 | Pinned Todos view | rail "Pinned todos" (top special list, also under VIEWS) | GLOBAL section first, then per-list |
| 10 | Trash view | rail → Trash | Restore / Delete permanently / Empty trash |
| 11 | Archived expanded | bottom of Conference App → "Archived (2)" | Done+Archived and Cancelled+Archived samples |
| 12 | Global Quick Add window | Ctrl+Shift+Space or toolbar ⚡ | target dropdown, Inbox default |
| 13 | Empty Inbox | Inbox → complete/move its 3 todos, or filter nonsense | dedicated "Inbox zero" copy |
| 14 | Empty custom list | create list via Ctrl+Shift+N | "Nothing here yet" + capture hint |
| 15 | Drag & drop states | drag any todo over rows / group / rail / other pane | line = before/after, fill = into |
| 16 | Context menu | right-click todo / group / tab / rail list | incl. "Move to…" morph |
| 17 | Color label selector | detail → Color label swatches | None + 8 built-in + customs |
| 18 | Custom label manager | detail → Manage… | 12-max editor, optional names |
| 19 | UI scale / font size | toolbar "100%" button; Ctrl+wheel | 80–150%, A−/A+ |
| 20 | Light theme | toolbar sun/moon or View menu | full token swap |
| 21 | Dark theme | default | |

Also present: menu bar (File…Help) with dropdowns, shortcuts dialog (F1), undo toasts (delete/move/etc.), inline rename for lists/groups, global-pinned strip (collapse toggle), list drag-reorder.

Status examples in sample data: Open (most), In Progress ("Fix authentication timeout", "Try the smaller embedding model"), Done ("Program screen: empty state design"), Cancelled ("Drop legacy v1 endpoints"), local pin (t1, t15), global pin (QR scanner / invoice / RAID disk), archived (CI pipeline — Done, GraphQL — Cancelled), trashed ("Prototype: voice capture").
