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

## AI Workspace Integration screens (V1.1)

Sample data: Conference App = linked Git workspace (`C:\Projects\conference`, with AI Brief), AI Todo = linked generic folder, Railway Simulator = linked but **missing** directory, others unlinked. Claude Code = detected v2.1.4; Codex = not detected. Seeded runs on "Fix authentication timeout": Investigate (completed), Plan (failed) + one workspace-level Analyze.

| # | Screen / state | How to reach |
| --- | --- | --- |
| 22 | Main view — linked workspace | Conference App: workspace chip in quick-add row (git tag) |
| 23 | Main view — unlinked | Home Server / Misc: no chip; AI entry points show Link CTA |
| 24 | Workspace Settings | click the chip, or list context menu → Workspace settings… |
| 25 | Link Workspace (unlinked dialog) | right-click Home Server → Link Workspace… |
| 26 | AI menu — todo + workspace actions | toolbar ✦ AI (todo section follows selection) |
| 27 | Todo Details — AI tab | select "Fix authentication timeout" → detail → AI |
| 28 | AI Run — ready | AI tab → Investigate (Task/Action/Provider/Mode/Brief/Run) |
| 29 | AI Run — running | press Run — streamed progress, elapsed, Cancel, Show details |
| 30 | AI Run — result + proposals | wait ~4s — Summary/Findings + Proposed Todo Changes + Apply Selected |
| 31 | AI Run — failed | ready state → Provider: Codex → Run (message + Retry + Open AI Clients…) |
| 32 | AI Run — cancelled | Cancel during a run |
| 33 | Reconcile result | ✦ AI → Reconcile Todos ↔ Workspace → Run (mapping + Suggested Changes) |
| 34 | Suggest Todos result | ✦ AI → Suggest Todos → Run (Potential Todos + Add Selected) |
| 35 | Verify result | AI tab → Verify → Run (4-value Verdict + Checks + Recommendation) |
| 36 | Ask Workspace | ✦ AI → Ask Workspace… → type question → Run (one answer, no chat) |
| 37 | Run history | panel clock icon or ✦ AI → Run history; rows reopen runs |
| 38 | AI Clients — detected + missing | ✦ AI → AI Clients… (Claude detected, Codex not) |
| 39 | Manual client selection + not-ready | Codex card → Browse… ("Installed — not ready" + auth message) |
| 40 | Client detect/test states | Codex Auto Detect (detecting → not found), Test on each |
| 41 | Missing workspace | Railway Simulator → ⚠ chip or any AI action (Locate… / Unlink) |
| 42 | Concurrency guard | start a run, reopen ready state in same list, Run again |

Status examples in sample data: Open (most), In Progress ("Fix authentication timeout", "Try the smaller embedding model"), Done ("Program screen: empty state design"), Cancelled ("Drop legacy v1 endpoints"), local pin (t1, t15), global pin (QR scanner / invoice / RAID disk), archived (CI pipeline — Done, GraphQL — Cancelled), trashed ("Prototype: voice capture").
