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
| F3 | Fa-nézet, drag & drop, subtasks | 🔄 |
| F4 | Detail panel, activity, színek, emoji, linkek | 🔲 |
| F5 | Pinning, Pinned view, Archive, Trash, Undo | 🔲 |
| F6 | Keresés (filter, global, palette) | 🔲 |
| F7 | Split pane rendszer + layout persist | 🔲 |
| F8 | Global shortcuts, Quick Add ablak, Summon | 🔲 |
| F9 | Scale, theme, keyboard polish, window state | 🔲 |
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

### F3 — Fa-nézet mélyítés, drag & drop, subtasks
- [ ] DnD: todo reorder (before/after 2px vonal), group-ba ejtés (row highlight,
      auto-expand), rail-listára ejtés (root-ba), érvénytelen mélység tiltása
- [ ] Rail lista-reorder draggal
- [ ] Minden drop = 1 undo-olható akció + toast + activity entry (előkészítve F5-höz)
- [ ] Subtasks core (create/edit/delete/check/reorder, flat) + tesztek
- [ ] Zárás: review → refactor → push

### F4 — Detail panel, activity, színek, emoji, linkek
- [ ] DetailPanel (320px): Details/Activity fülek, breadcrumb, Esc-zárás
- [ ] Title (undo-olható rename bluron), Status pillek, Emoji input (Win+. hint),
      Location dropdown + „move up one level" (Alt+←), Description textarea
- [ ] Auto-link felismerés core modul (http/https, Windows file/dir path) + tesztek;
      chip-ek: URL → böngésző, path → Explorer/asszociált app (opener, biztonságos
      path-kezelés)
- [ ] Color labels: 8 preset + max 12 custom, picker + LabelManager modal + tesztek
- [ ] Activity log: értelmes eseménytípusok, human-readable, `Today 09:21` formázás
- [ ] Duplicate (title/desc/subtasks/emoji/color; új id, Open, pin nélkül, friss log)
- [ ] SubtaskList UI a detailben (progress bar, activity-írás)
- [ ] Zárás: review → refactor → push

### F5 — Pinning, Pinned view, Archive, Trash, Undo
- [ ] Local/global pin (Ctrl+P local), „G" tag, Pinned szekció a listák tetején
- [ ] GlobalPinnedStrip (collapse persist, chip → navigate home)
- [ ] PinnedView (GLOBAL elöl, majd listánként; navigate home: pane-váltás,
      ős-expand, archived-nyitás, select + detail)
- [ ] Archive: Archived (n) szekció listánként (default collapsed, persist),
      státusz megmarad, countból kizárva, kereshető
- [ ] Trash: soft delete + eredeti hely tárolás, TrashView (Restore / Delete
      permanently / Empty Trash — ez utóbbi confirmationnal), törölt group-hely
      esetén root-ba restore
- [ ] Undo core: snapshot stack (cap 30) minden mutáló akcióra, Ctrl+Z + toast Undo
      + „Undone — <action>"; tesztek a teljes undoable készletre
- [ ] Zárás: review → refactor → push

### F6 — Keresés
- [ ] `core/search-normalize.ts`: Unicode NFD → diakritika-eltávolítás → lowercase →
      whitespace-normalizálás; magyar tesztek („árvíztűrő" ↔ „ARVIZTURO")
- [ ] Fuzzy: substring (title/desc/subtask) + subsequence (≥4 char, csak title);
      determinisztikus, irreleváns találatok kerülése — tesztekkel
- [ ] FilterBar (Ctrl+F): live, match-count, groupok force-expand (állapot-mentés
      nélkül), Pinned/Archived is szűrődik
- [ ] GlobalSearch (Ctrl+Shift+F): dialog, ≤20 találat, breadcrumb, ↑↓+Enter,
      navigate home
- [ ] CommandPalette (Ctrl+K): listák + parancsok (layout, view, theme)
- [ ] Zárás: review → refactor → push

### F7 — Split pane rendszer
- [ ] Layout: 1 / 2v / 2h / 4 (CSS grid, fix 1fr), LayoutSwitcher a toolbarban
- [ ] Pane-állapot slotonként: lista, quick-add draft, filter, expanded, selection,
      scroll; váltáskor (1→4→1) a slot-tartalom visszaáll
- [ ] Aktív pane (accent border, multi-pane), minden keyboard-akció oda megy
- [ ] Multi-pane: ListSelector dropdown a TabBar helyett
- [ ] Pane-ek közti todo-DnD (másik pane háttere = list root)
- [ ] Layout + pane→lista mapping persist, restart után visszaáll
- [ ] Zárás: review → refactor → push

### F8 — Global shortcuts, Quick Add ablak, Summon Workspace
- [ ] Rust modulok: `src-tauri/src/windows/{virtual_desktop,window_activation,global_shortcuts}.rs`
      — IVirtualDesktopManager (GetWindowDesktopId, MoveWindowToDesktop),
      foreground HWND capture AKTIVÁLÁS ELŐTT, monitor-detektálás + work-area clamp,
      SetForegroundWindow + FlashWindowEx fallback, maximized-state megőrzés
- [ ] Summon/Hide toggle (serialized — nincs párhuzamos transition), same-desktop ág,
      desktop-váltás TILOS fallbackként is
- [ ] `core/shortcut-manager.ts`: validate (modifier-kötelező, system-blacklist,
      AltGr-figyelmeztetés), conflict-detektálás, tranzakciós rebind (rollback),
      action-mapping, toggle-logika — mind unit-tesztelve, Win32 mögött vékony
      mockolható adapter
- [ ] Global Quick Add ablak: külön always-on-top webview (singleton), aktuális
      desktopon/monitoron jelenik meg, target-selector (default Inbox), Enter →
      create + close + toast, Esc → close; a main window NEM mozdul
- [ ] Pinned Todos / Global Search opcionális global actionök (summon + view + fókusz)
- [ ] Settings dialog: Global Shortcuts szekció (keyboard recorder, Enabled toggle,
      Reset Defaults, conflict-hibák)
- [ ] Startup: settings-betöltés → regisztráció → hibagyűjtés → app ettől még indul,
      egyszeri nem-agresszív notification
- [ ] Capabilities bővítés indoklással; logging (debug-szintű summon-trace)
- [ ] Manuális Windows teszt-checklist dokumentálás + végigtesztelés (A–K)
- [ ] Zárás: review → refactor → push

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
