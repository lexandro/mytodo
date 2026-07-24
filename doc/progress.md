# myTODO — fejlesztési terv és haladás-követés

Forrás-dokumentumok:
- **Funkcionális spec**: `doc/daprompt.md` (funkcióban ez győz)
- **Design spec**: `assets/prototype/design_handoff_mytodo/` (megjelenésben + interakcióban ez győz;
  a `prototype/myTODO App.dc.html` executable spec)
- **Shortcut addendum**: `doc/shortcut.md` (Summon Workspace + Global Shortcut Manager)

## Fázis-workflow (minden fázisra kötelező)

1. Implementáció (előbb pure core + kolokált vitest, aztán UI)
2. `bun run typecheck && bun run test` zöld
3. Code review (self-review a diffre)
4. Refactor / simplification a review findings alapján
5. Újra zöld → conventional commit → **push** → jelen fájl frissítése
6. Csak ezután indul a következő fázis

## Státusz-áttekintés

| Fázis | Tartalom | Állapot |
|---|---|---|
| F1 | Alapozás: tokenek, DB, domain model, app-váz | ✅ |
| F2 | Lists, groups, todo CRUD, Quick Add | ✅ |
| F3 | Fa-nézet, drag & drop, subtasks | ✅ |
| F4 | Detail panel, activity, színek, emoji, linkek | ✅ |
| F5 | Pinning, Pinned view, Archive, Trash, Undo | ✅ |
| F6 | Keresés (filter, global, palette) | ✅ |
| F7 | Split pane rendszer + layout persist | ✅ |
| F8 | Global shortcuts, Quick Add ablak, Summon | ✅ |
| F9 | Scale, theme, keyboard polish, window state | 🔄 |
| F10 | Backup, import/export, hardening, portable release | 🔲 |

Jelmagyarázat: 🔲 nincs elkezdve · 🔄 folyamatban · ✅ kész (review+push megvolt)

## Rögzített döntések (2026-07-24)

1. **DB réteg**: rusqlite a Rust oldalon, typed `#[tauri::command]`-ok; a SQL nem
   szivárog TS-be. Domain state teljesen memóriában (Svelte 5 runes), SQLite
   write-through persistence. Undo = in-memory snapshot stack (cap 30) + DB-írás.
2. **Confirmation**: sehol nincs dialog (undo + toast), EGY kivétel: Empty Trash
   confirmationt kér.
3. **Design-gap feloldás**: File menü bővül (Import JSON / Export JSON / Backup Now /
   Restore… / Settings); a Global Shortcuts beállító külön Settings modalban él
   (Nocturne tokenekkel, shortcut.md §11 wireframe szerint).
4. **Group törlés**: gyerekek re-parent a nagyszülőhöz, todo-k megmaradnak, undo-val
   (design szerint, dialog nélkül) — ez a daprompt „move-content workflow" ága.
5. **Ctrl+K command palette**: designban van, daprompt nem kéri → beépítjük.
6. **Font**: Inter bundlelve (@fontsource, lokális) — a tokenek Google Fonts
   `@import`-ja CSP + offline miatt nem mehet be.
7. **Hide vs minimize (Summon toggle)**: hide, DE csak ha a Summon shortcut
   regisztrálva van — különben minimize (ne tűnhessen el elérhetetlenül az ablak).
   Single-instance plugin másodindításkor amúgy is előhozza.
8. **AltGr-védelem**: HU layouton Ctrl+Alt = AltGr; a validátor figyelmeztet, ha a
   választott global shortcut AltGr-karaktert ütne (pl. Ctrl+Alt+F → `[`).
   Default `Ctrl+Alt+T` marad (T-nek nincs AltGr-párja).
9. **Könyvtár**: `doc/` (nem `docs/`); FUTURE.md és ARCHITECTURE.md ide kerül.
10. **Portable adat**: `data/` és `backup/` az exe mellett; dev módban a
    `target/debug/` mellé kerül (gitignore-olt).

## Fázisok részletesen

### F1 — Alapozás: design tokenek, DB, domain model, app-váz ✅ (2026-07-24)
- [x] Függőségek: rusqlite (bundled); @fontsource/inter, phosphor-svelte
      (opener/global-shortcut plugin az F4/F8-ban jön, amikor tényleg kell)
- [x] Nocturne tokenek portolása (`src/lib/styles/tokens.css` + `components.css`,
      light theme a prototípus LIGHT mapjéből, Inter lokálisan bundlelve)
- [x] Ablak-konfig: decorations:false, custom titlebar (drag region + működő
      caption gombok), window-jogok a capabilities-ben indoklással
- [x] Rust: `paths.rs` (exe melletti data/), `db/{schema,model,load,write,mod}.rs`
      — WAL, FK, user_version-migráció, DbOp-batch egy tranzakcióban
      (defer_foreign_keys), 6 Rust unit teszt (roundtrip, upsert, FK, rollback)
- [x] `core/types.ts`, `core/ids.ts`, `core/ordering.ts` (fractional ordering),
      `core/dbops.ts`, `core/diff.ts` (snapshot-diff → DbOps) — tesztekkel
- [x] `ipc.ts`: db/settings/window wrapperek
- [x] Store: apply-pipeline (snapshot → mutate → diff → persist), undo-stack
      (cap 30, bootstrap nem undo-olható), serialized persist-queue retry-jal
- [x] AppShell + TitleBar + StatusBar (saved/error indikátor)
- [x] Inbox auto-create (fixed) — end-to-end igazolva: app futtatva, SQLite-ban
      megjelent a séma v1 + Inbox sor
- [x] `example.ts` placeholder törölve
- [x] Zárás: typecheck + 16 TS teszt + 6 Rust teszt zöld → review (bootstrap-undo
      bug javítva, YAGNI-cleanup) → push

### F2 — Lists, groups, todo CRUD, Quick Add ✅ (2026-07-24)
- [x] Core: `lists-ops` / `groups-ops` / `todos-ops` / `rows` / `labels` /
      `emoji` / `scope` — 3-szintű depth-cap + ciklus-guard a moveGroup-ban,
      lista-törlés = todo-k Trash-be (prototípus-viselkedés), fractional
      ordering; 38 új teszt (össz. 54)
- [x] ListRail: LISTS/VIEWS, +, aktív/drop állapotok, countok, Ctrl-digit
      hintek, inline rename leading-emoji szerkesztéssel, lista drag-reorder,
      todo-drop listára
- [x] TabBar (single-pane), lista-váltás; Pinned/Trash view placeholder (F5)
- [x] Fa-nézet: GroupRow (caret, collapse persist a DB-ben, drop-into
      highlight + auto-expand), TodoRow (státusz-kör cycle, stripe, G-tag,
      subtask-count, before/after drop-vonalak), SectionRow, EmptyState-ek
- [x] QuickAdd: Enter → kijelölt todo groupjába vagy list rootba, Shift+Enter
      details-nyitással, fókusz marad, Ctrl+N fókusz
- [x] Context menük: todo (státuszok, Move to… morph, delete), group (New
      todo/subgroup + 3-level limit hint), list (Inbox delete-restriction)
- [x] Keyboard alapok: Esc-lánc, Ctrl+N/Ctrl+Shift+N/Ctrl+1..9/Ctrl+Enter/
      Ctrl+Z/Delete/nyilak; Toast + Undo
- [x] Vizuális smoke-teszt: ablak-capture ellenőrizve (rail, tabs, quick add,
      Inbox zero empty state, status bar — design szerint)
- [x] Zárás: typecheck 0 hiba, 54 teszt zöld → review (menus.ts placeholder
      kód kijavítva, a11y warningok rendezve) → push

### F3 — Fa-nézet mélyítés, drag & drop, subtasks ✅ (2026-07-24)
- [x] DnD (az F2-ben épült): todo reorder before/after vonallal, group-ba
      ejtés highlight + auto-expand, rail-listára ejtés root-ba, rail
      lista-reorder; minden drop 1 undo-olható akció + toast + activity
      (cross-scope movenál)
- [x] Subtasks core: add/edit/toggle/remove/reorder (flat, todo-n belüli
      reorder-guard) + activity-írás — 6 új teszt (össz. 60)
- [x] Pane-közti DnD az F7-ben jön (multi-pane); group drag-reorder a design
      FUTURE.md szerint v1.1 — kimarad
- [x] Zárás: typecheck 0, 60 teszt zöld → push

### F4 — Detail panel, activity, színek, emoji, linkek ✅ (2026-07-24)
- [x] DetailPanel (320px): Details/Activity fülek, breadcrumb, ✕/Esc zárás
- [x] DetailForm: title (blur-commit, üres edit visszaáll), Status pillek,
      Emoji input (Win+. hint), Pin List/Global toggle-pár, Location dropdown
      (list root + indentált group-fa) + move-up gomb; F2 → title fókusz+select,
      Alt+← keyboard
- [x] `core/links.ts`: URL + Windows path detektálás, safe-path check (ADS/
      illegális karakter tiltás) + tesztek; opener plugin (capability indokolva),
      chip: URL → böngésző, path → Explorer/társított app
- [x] Color labels: 8 preset konstans + max 12 custom (`core/labels.ts`),
      ColorPicker swatch-ok ring-gel, LabelManager modal (counter, add/edit/
      remove; törölt label → todo-k fallback null-ra)
- [x] `core/time.ts` (Today/Yesterday/Mar 4 formátum) + ActivityList
      (newest-first, 2px rule); pin/archive/subtask/move activity-írások
- [x] Duplicate a spec szerint (§27) — eredeti után szúrva, order-bug javítva
- [x] SubtaskList UI: progress bar, checkbox-ok, add-input, remove
- [x] **CDP-verifikáció a futó appon**: tab-váltás → dblclick detail →
      subtask-pipa → SQLite-ban `checked=1` + activity sor → Ctrl+Z undo →
      DB visszaállt. Screenshot design-hű.
- [x] Zárás: typecheck 0, 75 teszt zöld → review → push
- Megjegyzés: LabelManager Esc-zárása még nincs az Esc-láncban (backdrop-click
  zár) — F9 keyboard-polish tétel

### F5 — Pinning, Pinned view, Archive, Trash, Undo ✅ (2026-07-24)
- [x] Local/global pin + Ctrl+P + „G" tag + Pinned szekció (F4-ben épült)
- [x] GlobalPinnedStrip: accent sáv, collapse, chip (színpötty + emoji + cím +
      listanév) → navigate home
- [x] PinnedView: GLOBAL elöl (accent), majd listánként; navigate home
      (pane-váltás, ős-expand undo nélkül, archived-nyitás, select + detail)
- [x] Archive szekció (rows.ts F2 óta rendereli; kereshetőség F6-ban jön)
- [x] TrashView: Restore / Delete permanently / Empty Trash confirmationnal
      (az app EGYETLEN confirm dialogja — 2. döntés); restore törölt group
      esetén root-ba (core F2-ben tesztelve)
- [x] Undo: snapshot-stack az F1 óta minden akcióra; empty trash / permanent
      delete is visszavonható
- [x] **CDP-verifikáció**: pin globally → strip megjelent → PinnedView szekciók
      → navigate home vissza a detailhez → Delete → Trash → confirm → Empty →
      Ctrl+Z visszahozta. Zöld.
- [x] Zárás: typecheck 0, 75 teszt zöld → push

### F6 — Keresés ✅ (2026-07-24)
- [x] `core/search.ts`: NFD → diakritika → lowercase → whitespace pipeline;
      magyar tesztek („ÁRVÍZTŰRŐ TÜKÖRFÚRÓGÉP" ↔ „arvizturo tukorfurogep")
- [x] Fuzzy: substring (title/desc/subtask) + subsequence ≥4 char csak title-re
      (rövid query nem ad zajos találatot) — 10 új teszt (össz. 85)
- [x] FilterBar (Ctrl+F): live match-count, groupok force-expand mentés nélkül,
      Pinned/Archived is szűrődik, „No matches" empty state
- [x] GlobalSearch (Ctrl+Shift+F): 540px dialog, ≤20 determinisztikus találat,
      breadcrumb, ↑↓+Enter → navigate home; archived benne, trash kizárva
- [x] CommandPalette (Ctrl+K): listák Ctrl+n hinttel + layout/view/theme
      parancsok (a layout-váltás az F7-tel válik láthatóvá)
- [x] Esc-lánc bővítve: ctx → palette → gsearch → rename → picker → filter →
      detail; téma-attribútum (`data-theme`) bekötve
- [x] **CDP-verifikáció**: ékezet-független global search + Enter-navigáció,
      Ctrl+F fuzzy filter match-counttal, palette → Trash view váltás. Zöld.
- [x] Zárás: typecheck 0, 85 teszt zöld → push

### F7 — Split pane rendszer ✅ (2026-07-24)
- [x] Layout: 1 / 2v / 2h / 4 CSS grid (fix 1fr trackek), LayoutSwitcher
      segmented gomb a titlebarban
- [x] Pane-állapot slotonként él (lista, quick-draft, filter, picker) —
      1→4→1 váltásnál a slot-tartalom megmarad
- [x] Aktív pane accent-border (csak multi-pane), keyboard oda megy
- [x] Multi-pane: ListSelector dropdown popoverrel a TabBar helyett
- [x] Pane-közti todo-DnD (pane háttér = list root — F2 óta kész)
- [x] Settings-sync: layout + pane→lista + activePane + view a settings
      táblába, restore induláskor validációval (törölt lista → null fallback)
- [x] **CDP-verifikáció**: 2v váltás → 2 pane selectorral, pane 2 lista-váltás,
      aktív-pane border követi a kattintást, 2×2 → 4 pane, roundtrip megőrzi
      a slotokat; **restart után visszaállt** a layout és a mapping. Zöld.
- [x] Zárás: typecheck 0, 85 teszt zöld → push

### F8 — Global shortcuts, Quick Add ablak, Summon Workspace ✅ (2026-07-24)
- [x] Rust `src-tauri/src/winint/{virtual_desktop,window_activation,summon}.rs`
      — IVirtualDesktopManager COM wrapper (per-hívás CoInitializeEx),
      foreground HWND capture AKTIVÁLÁS ELŐTT, monitor work-area clamp,
      SetForegroundWindow + FlashWindowEx fallback, maximized megőrzés,
      SUMMON_LOCK mutex (serialized transitions), desktop-váltás fallbackként
      is TILOS; main-close → app exit (a rejtett quickadd ne tartsa életben)
- [x] `core/shortcuts.ts` (pure): defaults (Ctrl+Alt+T / Ctrl+Shift+Space /
      2 opcionális), validáció (modifier-kötelező, system-blacklist),
      AltGr-figyelmeztetés, conflict-detektálás, recorder-parser, Tauri
      accelerator konverzió — 10 új teszt (össz. 95)
- [x] `state/shortcut-manager.svelte.ts`: startup-regisztráció hibagyűjtéssel
      (app ettől indul, egyszeri toast), tranzakciós rebind (új sikeres
      regisztráció UTÁN oldódik a régi; hibánál a régi marad), enable/disable,
      Summon/Hide toggle vs Always mód, reset defaults, persist a settings-be
- [x] Quick Add ablak: külön mindig-legfelül webview (`/quickadd` route,
      singleton), aktuális desktopon+monitoron jelenik meg, target-selector
      default Inbox; Enter → EVENT a main ablaknak (egyetlen in-memory
      authority ír DB-t) + hide + „Added to X" toast; Esc → hide
- [x] Pinned Todos / Global Search opcionális global actionök (summon + view/
      search fókusz); ⚡ + ⚙ toolbar-gombok, Settings a palette-ből is
- [x] Settings dialog a §11 wireframe szerint (recorder „Press shortcut…",
      Enabled toggle, Reset Defaults, hiba + AltGr-warning inline)
- [x] Capabilities: quickadd ablak + global-shortcut + hide/show, indoklással
- [x] **CDP-verifikáció**: ⚡ → quickadd ablak listákkal (Inbox default) →
      Enter → main írta a DB-t (SQLite sor + rail count); summon parancs
      mindhárom ága fut; recorder-rebind Ctrl+Alt+P + AltGr-warning + OS-
      regisztráció igazolva (`is_registered`=true mindháromra); reset OK
- [x] Manuális teszt-checklist: `doc/WINDOWS-TESTS.md` (A–M) — a virtual
      desktop viselkedést kézzel kell igazolni
- [x] Zárás: typecheck 0, 95 teszt, cargo check tiszta → push

### F9 — Scale, theme, keyboard polish, window state
- [ ] UI scale (80–150%, teljes chrome skálázás) + Todo font size (10–20px) külön;
      ScaleControls popover (chipek, A−/A+), Ctrl+wheel a todo-szövegre
- [ ] Light / Dark / System theme (token-swap, Windows theme követés), toolbar +
      View menü toggle, persist
- [ ] Teljes MenuBar (File/Edit/View/Go/Help + Alt-accelerátorok, roaming), F1
      ShortcutsDialog, Esc prioritás-lánc véglegesítés
- [ ] Teljes shortcut-térkép (SHORTCUTS.md) centralizált handlerben; text-input
      guardok (Delete/F2/nyilak inputban nem todo-akciók)
- [ ] Window state persist: pozíció/méret/maximized, multi-monitor + eltűnt monitor
      → látható területre clamp
- [ ] Zárás: review → refactor → push

### F10 — Backup, import/export, hardening, portable release
- [ ] Backup: indításkor naponta egyszer + Backup Now (File menü), `backup/todo-YYYY-MM-DD.db`,
      utolsó 10 megtartása, háttérszálon (nem blokkol)
- [ ] Export JSON (minden user-adat) / Import JSON (validáció, hibás import nem
      rontja a DB-t — tranzakció + rollback) / Restore backupból (atomi swap);
      serialization roundtrip tesztek
- [ ] Hibakezelés-audit: DB unavailable, migration failure, backup/restore failure,
      link-megnyitási hiba, shortcut-regisztrációs hiba — mind látható, nem agresszív,
      retry ahol értelmes; silent catch tilos
- [ ] Teljesítmény-ellenőrzés több ezer todo-val (lista-váltás, keresés, DnD)
- [ ] README.md (setup, run, test, build, portable layout, DB, backup, shortcuts,
      Windows Global Shortcuts szekció) + `doc/ARCHITECTURE.md` + `doc/FUTURE.md`
      (Minimal Markdown + design-FUTURE tételek)
- [ ] `build.bat`: teszt + release build + portable mappa összeállítás
      (`TodoWorkspace/TodoWorkspace.exe`, `data/`, `backup/`); CRLF!
- [ ] Verzió-emelés HÁROM helyen; DoD checklist végigvezetése (daprompt §50 +
      shortcut.md §32)
- [ ] Zárás: review → refactor → push

## Napló

- **2026-07-24** — Elemzés kész: a három forrás koherens; eltérések feloldva (lásd
  Rögzített döntések). Fázisterv elfogadásra vár, munka még nem indult.
