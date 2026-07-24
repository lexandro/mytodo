# mytodo

Natív Windows asztali app: **Tauri v2** (Rust héj) + **Svelte 5** (SvelteKit SPA) + Bun.

## Közös szabályok (minden projektemre érvényesek)

### Kommunikáció és nyelv
- **Magyarul kommunikálj** a felhasználóval; **angolul programozz** (kód, azonosítók, kód-kommentek angolul)
- Projekt-dokumentáció magyarul, hacsak a projekt mást nem ír elő

### Alapelvek
- **Soha ne feltételezz — kérdezz!** Kétség esetén kérdés, nem találgatás (típusról, API-válasz shape-ről, fájltartalomról sem)
- Alapelvek prioritási sorrendben (ütközéskor a feljebb álló nyer): 1. KISS/YAGNI, 2. SOLID, 3. Clean Architecture
- A kód elsődleges olvasója az AI: olyan kód kell, amit egy LLM minimális kontextussal helyesen tud folytatni — explicit mindig, implicit soha; nincs "okos kód"; konzisztens minta > egyedi elegancia
- Nincs shortcut, hack, duct-tape — csak professzionális megoldás

### Tooling
- **Csomagkezelő: Bun** — SOHA npm/yarn/pnpm; a `bun.lock` commitolva van
- CLI-k telepítve és authentikálva: `glab`, `gh`, `wrangler` — ezeket használd, ne curl/REST hívásokat
- Git: minden repo alapból **privát GitLab**; GitHub-ra csak külön, explicit kérésre. Conventional commits angolul (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)

### Kódminőség
- ~150 sor/fájl felett állj meg és gondold át a bontást — ez smell, nem kemény plafon (kivétel: pure types, generált kód, tesztadat). Egy fájl = egy felelősség. Max ~20-25 sor/függvény.
- TypeScript: `strict: true`; `any` TILOS (`unknown` + type guard helyette); explicit return type minden függvényen; TILOS a barrel export (index.ts re-export)
- Nincs silent fail — mindig explicit hibakezelés; async/await try-catch-ben
- Kommentek a MIÉRT-et magyarázzák, nem a MIT-et

### "Kész" definíciója
- Commit előtt: typecheck + az érintett tesztek zöldek. A teszt a szerződés — mivel a kódolás delegálva van, teszt nélkül nincs visszajelzés a helyességről.

### Secrets
- Titok SOHA nem kerül repóba. Lokálisan `.env` / `.dev.vars` (gitignore-olva); minta `.env.example` / `.dev.vars.example` CSAK kulcsnevekkel; prod értékek CF env / GitLab CI masked variables-ből.

### Windows környezet
- `.bat` fájlok MINDIG CRLF sorvéggel és ASCII szöveggel (ékezet nélkül)
- Bash-ben: ne használj `cd /d`-t és `-C` flaget Windows útvonalakkal; használj forward slash-t


## Architektúra — tiszta core, vékony héj

- **Az érdemi logika tiszta `.ts` modulokba megy** a `src/lib/core/` alá: se Tauri-, se Svelte-, se DOM-import. Minden core-modul mellé kolokált `*.test.ts` (vitest).
- **A Tauri API-t KIZÁRÓLAG az `src/lib/ipc.ts` importálhatja** — ez az egyetlen határ-modul a natív oldal felé. Új natív képességet ide vezess be, wrapper-függvényként.
- A Svelte-komponensek vékonyak: állapot + megjelenítés, a logikát a core-ból hívják.
- Rust-oldali (src-tauri) kód csak akkor, ha a frontendről nem megy: új `#[tauri::command]` + regisztráció a `lib.rs`-ben, és jogosultság a `capabilities/default.json`-ban. A capability-készlet minimál — tudatosan bővítsd.

## Parancsok

- `bun install` — függőségek
- `bun run tauri dev` — az app fejlesztői módban (ELSŐ indításkor a Rust-fordítás percekig tart!)
- `bun run dev` — csak a frontend (port 1420, strict — foglalt portnál hibázik)
- `bun run typecheck` — svelte-check (commit előtt kötelező zöld)
- `bun run test` — vitest
- `build.bat` — gyors lokális release exe (`target\release\` alá, installer nélkül)
- `bun run tauri build` — teljes release + MSI installer

## Sarokpontok

- **Single-instance**: második indításkor a meglévő ablak kap fókuszt (plugin a `lib.rs`-ben).
- **CSP szigorú** (`tauri.conf.json`): új külső forrás/inline script nem mehet be a CSP lazítása nélkül — ha lazítani kell, indokold.
- **Verzió-emelés HÁROM helyen** (mindig együtt): `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`.
- A `target/` a projekt gyökerében van (`.cargo/config.toml` állítja) — gitignore-olva.
- Sorvégek: a `.gitattributes` LF-et kényszerít, `.bat` fájlok CRLF-ek.
