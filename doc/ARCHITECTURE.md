# myTODO — architektúra

## Rétegek

```
┌──────────────────────────────────────────────────────────┐
│ Svelte UI (src/lib/ui/*)      vékony: állapot + render   │
├──────────────────────────────────────────────────────────┤
│ State réteg (src/lib/state/*) akciók, UI-state, undo     │
├──────────────────────────────────────────────────────────┤
│ Pure core (src/lib/core/*)    domain-logika, se Tauri,   │
│                               se Svelte, se DOM import   │
├──────────────────────────────────────────────────────────┤
│ ipc.ts — AZ EGYETLEN Tauri-határ                         │
├──────────────────────────────────────────────────────────┤
│ Rust (src-tauri): SQLite repo, backup, Win32 integráció  │
└──────────────────────────────────────────────────────────┘
```

- **core**: minden érdemi logika pure TS modul, kolokált vitest teszttel
  (ops-modulok, rows-builder, search, links, shortcuts, transfer…).
- **ipc.ts**: kizárólag ez importál `@tauri-apps/*` csomagot — egy helyen
  auditálható a teljes natív felület.
- **Rust**: kicsi és fókuszált — SQLite (rusqlite), backup (VACUUM INTO),
  IVirtualDesktopManager/Win32 (summon), semmi üzleti logika.

## Persistence

- Az in-memory state az autoritás (Svelte 5 runes); az SQLite write-through.
- Minden mutáció a `store.apply()` pipeline-on megy át:
  `snapshot → mutate → diff → DbOp-batch → egy tranzakció`.
- A diff (`core/diff.ts`) pontosan a változott sorokat emitálja — a DnD
  reorder tipikusan 1 sort ír (fractional ordering, `ord REAL`).
- FK-k a tranzakción belül halasztottak (`defer_foreign_keys`), commitkor
  kötelezően konzisztensek; hibánál teljes rollback + látható hibaállapot
  a status barban (retry-jal, adat nem vész el csendben).
- Séma-verzió: `PRAGMA user_version` + append-only migrációs tömb.

## Undo

- Snapshot-stack (cap 30) a `store.apply()`-ban; a visszavonás ugyanazon a
  diff-pipeline-on íródik vissza a DB-be — a persistence-logika egyetlen
  helyen él. View-toggle-ök (collapse) `undoable:false`-szal mennek.

## Multi-window

- A Global Quick Add külön webview; NEM ír adatbázist: eseménnyel adja át a
  main ablaknak (egyetlen in-memory writer), majd elrejtőzik.

## Search

- `core/search.ts`: NFD → diakritika-eltávolítás → lowercase → whitespace;
  substring (title/desc/subtask) + subsequence fuzzy (≥4 char, title).
  Determinista, dependency-mentes.

## Summon Workspace (Windows)

- `src-tauri/src/winint/`: dokumentált API-k — IVirtualDesktopManager
  (GetWindowDesktopId/MoveWindowToDesktop), MonitorFromWindow + work-area
  clamp, SetForegroundWindow + FlashWindowEx fallback. A foreground HWND
  minden saját aktiválás ELŐTT kerül lekérdezésre; desktop-váltás soha.
- A summon mutex mögött serialized — gyors dupla hotkey nem interleave-el.

## Portable storage

- Minden a `myTODO/` mappán belül: `data/todo.db` + settings
  (SQLite `settings` tábla, JSON értékek) + `backup/`. Registry nincs.
- A shortcut-konfig, layout, theme, window-state mind a settings táblában.

## Fájlméret-elv

~150 sor/fájl felett bontás; egy fájl = egy felelősség. A Rust oldalon a
db/{schema,load,write,backup}, winint/{virtual_desktop,window_activation,
summon} bontás követi ugyanezt.
