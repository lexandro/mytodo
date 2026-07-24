# myTODO

Gyors, billentyűzet-központú, lokális Windows todo workspace fejlesztőknek —
Tauri v2 (Rust) + Svelte 5 + SQLite. **Nem projektmenedzsment-rendszer**: a cél,
hogy munka közben két másodperc alatt felírj egy tennivalót, aztán folytasd.

- **Tabbed workspace** — több lista (Inbox fixen), max 3 szintű groupok
- **Split pane** — 1 / 2 / 2×2 elrendezés, panelenként külön lista
- **Zero-friction capture** — Quick Add (Enter ment), globális Quick Add ablak
- **Summon Workspace** — `Ctrl+Alt+T` bárhonnan az aktuális virtuális
  desktopra hozza az appot (nem téged visz oda!)
- **Local-first, portable** — nincs account, nincs felhő; minden adat az exe
  melletti `data/` mappában
- **Élő frissítés** — aláírt automatikus update a GitHub Release-ekből

## Telepítés

A [Releases](https://github.com/lexandro/mytodo/releases/latest) oldalról:

- **Telepítő** (ajánlott): `myTODO_x.y.z_x64-setup.exe` (NSIS) vagy `.msi` —
  a telepített app **automatikusan frissül**: háttérben ellenőrzi az új
  verziót (6 óránként), és a status barban ajánlja fel; a letöltés/telepítés
  mindig a te döntésed. Kézi ellenőrzés: `Help → Check for updates…`
- **Portable**: `myTODO-vx.y.z-portable.zip` — kicsomagolod, fut, az adatok
  a mappában maradnak. A portable változat nem frissíti magát (jelzi az új
  verziót, de a cserét kézzel végzed).

## Fejlesztés

```
bun install
bun run tauri dev     # első indításkor a Rust-fordítás percekig tart
```

Előfeltételek: [Rust](https://rustup.rs) + VS Build Tools (C++ workload), Bun.

## Ellenőrzés

```
bun run typecheck     # svelte-check — commit előtt kötelező zöld
bun run test          # vitest (core modulok)
cd src-tauri && cargo test   # Rust persistence tesztek
```

## Build / portable release

- `build.bat` — teszt + release build + **portable mappa** összeállítása:

  ```
  release\myTODO\
      myTODO.exe
      data\        (első indításkor jön létre — todo.db, settings)
      backup\      (napi + kézi mentések)
  ```

  A mappa bárhová átmásolható, az adatok vele mennek. Nincs telepítő, nincs
  registry-függés.
- `bun run tauri build` — teljes release + MSI installer (opcionális út)

## Adattárolás és backup

- **SQLite**: `data/todo.db` (WAL, foreign keys, verziózott migrációk)
- **Backup**: indításkor naponta egyszer automatikusan + `File → Backup now`
  kézzel; `backup/todo-YYYY-MM-DD.db`, az utolsó 10 marad meg
- **Restore**: `File → Restore backup…` — a csere előtt a jelenlegi adatról
  biztonsági mentés készül (`backup/pre-restore.db`)
- **Export / Import JSON**: `File → Export JSON… / Import JSON…` — emberileg
  olvasható, hordozható formátum; az import validálás után, egyetlen
  visszavonható lépésként fut le, hibás fájl nem érinti az adatbázist

## Billentyűk (a teljes lista: F1 az appban)

| Művelet | Billentyű |
| --- | --- |
| Új todo / quick add fókusz | `Ctrl+N` |
| Új lista | `Ctrl+Shift+N` |
| Lista-váltás | `Ctrl+1…9` / `Ctrl+K` |
| Szűrés az aktuális listában | `Ctrl+F` |
| Globális keresés | `Ctrl+Shift+F` |
| Kész ↔ nyitott | `Ctrl+Enter` |
| Pin a listához | `Ctrl+P` |
| Átnevezés | `F2` |
| Törlés (Trash-be) | `Delete` |
| Visszavonás | `Ctrl+Z` |
| Todo szövegméret | `Ctrl+egérgörgő` |

## Windows Global Shortcuts

> **A Summon Workspace a meglévő alkalmazás-ablakot hozza át a TE aktuális
> virtuális desktopodra — nem téged kapcsol át oda, ahol az app volt.**

| Akció | Default | |
| --- | --- | --- |
| Summon Workspace | `Ctrl+Alt+T` | summon/hide toggle (Settingsben átállítható) |
| Global Quick Add | `Ctrl+Shift+Space` | kis lebegő ablak az aktuális desktopon |
| Pinned Todos | — | opcionális, Settingsben rendelhető |
| Global Search | — | opcionális, Settingsben rendelhető |

- Testreszabás: `File → Settings…` — kattints a mezőre és üsd le az új
  kombinációt. A csere tranzakciós: amíg az új nem regisztrálható, a régi
  működik tovább.
- Ütközéskor (más app fogja a kombinációt) érthető hibát kapsz, az app
  ettől még elindul.
- A `Ctrl+Alt` kombináció a magyar kiosztáson AltGr — a beállító figyelmeztet,
  ha olyan kombinációt választanál, ami gépelést blokkolhat.
- A shortcut-beállítások is a portable `data/` alatt élnek (nem registry).

## Kiadás (maintainer)

1. Verzió-emelés HÁROM helyen együtt: `package.json`,
   `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`
2. `git tag vX.Y.Z && git push origin vX.Y.Z`
3. A GitHub Actions (`release.yml`) megépíti az aláírt MSI + NSIS
   telepítőket az updater-artifactokkal (`latest.json`), publikálja a
   Release-t és mellécsatolja a portable zipet — a telepített appok innen
   frissülnek automatikusan.

Az updater-aláíró kulcspár a tulajdonos kulcstárában él (`E:\Mega\keys\
mytodo-updater\`), a repón `TAURI_SIGNING_PRIVATE_KEY(_PASSWORD)` secretként.
**A kulcs elvesztése = a meglévő telepítések nem frissíthetők tovább.**

## Dokumentáció

- `doc/ARCHITECTURE.md` — architektúra-áttekintés
- `doc/WINDOWS-TESTS.md` — manuális Windows integrációs teszt-checklist
- `doc/FUTURE.md` — jövőbeli ötletek (most tudatosan kimaradtak)
- `doc/progress.md` — fejlesztési napló

## Licenc

MIT — lásd [LICENSE](LICENSE).
