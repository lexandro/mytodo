# mytodo

Natív Windows asztali alkalmazás — Tauri v2 + Svelte 5 + Bun.

## Fejlesztés

```
bun install
bun run tauri dev     # első indításkor a Rust-fordítás percekig tart
```

Előfeltételek: [Rust](https://rustup.rs) + VS Build Tools (C++ workload), Bun.

## Build

- `build.bat` — gyors release exe (installer nélkül): `target\release\`
- `bun run tauri build` — teljes release + MSI installer

## Ellenőrzés

```
bun run typecheck
bun run test
```
