# Feladat

Egy szimpla windowsos todo app lesz, de meg keszul a design es a prompt, szoval eleg egy teljesen minimalista konyvtarat letrehozni, mert nagy meretu prompt fog majd erkezni

## Hogyan kezdd

1. Olvasd el a CLAUDE.md-t — az architektúra-szabályok (tiszta core + `ipc.ts` határ) kötelezőek.
2. Bontsd a célt kis lépésekre, és vezesd fel őket egy ROADMAP.md-be.
3. A logikát `src/lib/core/*.ts` modulokként írd, kolokált vitest tesztekkel — előbb a core, aztán a UI.
4. Natív képesség (fájl, dialog, folyamat-indítás) csak az `src/lib/ipc.ts`-en át; ha új Tauri-jogosultság kell, a `capabilities/default.json`-t is bővítsd, indoklással.
5. Külső CLI-eszközre építés esetén (pl. letöltő/konvertáló): a Rust-oldalon `tauri-plugin-shell` sidecar vagy `std::process::Command` — a binárisok elérhetőségét induláskor ellenőrizd, és adj érthető hibát, ha hiányzik.
6. Minden funkció után: `bun run typecheck && bun run test` zölden.
