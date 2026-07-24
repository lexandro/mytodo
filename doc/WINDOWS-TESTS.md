# Manual Windows test checklist — Summon Workspace & global shortcuts

The tests from shortcut.md §30. **Executed on 2026-07-24 in an unlocked
session** (real synthetic keyboard input + IVirtualDesktopManager checks +
Win+Ctrl+D desktop creation) against the portable release build.

## Results

- [x] **A — Summon from another desktop.** ✅ New virtual desktop created
      (Win+Ctrl+D) → app `onCurrentDesktop=False` → `Ctrl+Alt+T` → the app
      MOVED OVER (`onCurrentDesktop=True`) and got focus; the desktop never
      switched to the app's old location.
- [x] **B — Foreground from background.** ✅ Chrome focused → `Ctrl+Alt+T`
      → myTODO foreground.
- [x] **C — Toggle hide.** ✅ App focused → `Ctrl+Alt+T` → hidden, focus
      fell back naturally to the previous app; press again → back with focus.
- [x] **D — Restore from minimized.** ✅ Minimized → `Ctrl+Alt+T` → instant
      restore + foreground. (One early run restored with a ~1–2 s delay —
      WebView2 throttling while minimized; a repeat run was instant.)
- [x] **E — Monitor following.** ✅ Focused window on the left (secondary)
      monitor → summon → main landed on the left monitor (rect −1253,391);
      it also followed back to the primary monitor.
- [ ] **G — Disconnected monitor.** Not automatable (needs a physical
      disconnect). Covered by the work-area clamp + the monitor-intersection
      guard in window-state restore; manual check recommended when docking.
- [ ] **H — Shortcut already taken.** Not provoked (needs a foreign app
      grabbing Ctrl+Alt+T first). Code path: registration failure →
      collected → single non-aggressive toast, app keeps running — covered
      at unit level in F8.
- [x] **I — Rebind.** ✅ (F8 CDP test: recorder → Ctrl+Alt+P → registered
      at OS level, old released, persisted.)
- [~] **J — Failed rebind.** The transactional rollback logic is
      unit-tested; a live conflict provocation has not run (see H).
- [x] **K — Quick Add.** ✅ `Ctrl+Shift+Space` → Quick Add on the current
      desktop with focus, the main window did NOT move; real typing + Enter
      → todo in the portable DB, window hid, focus fell back.
- [x] **L — Rapid triple hotkey.** ✅ 3 rapid presses → no stuck state,
      process alive, responds consistently to further presses (serialized
      summon).
- [ ] **M — AltGr coexistence.** The test machine's active layout was US
      English — repeat with a Hungarian layout: AltGr+F/G/B (`[ ] {`) must
      keep typing while Ctrl+Alt+T is registered. (The Settings validator
      warns about every Ctrl+Alt combination.)

## Notes

- Foreground grants were occasionally denied with synthetic input (Windows
  foreground lock) — the spec'd FlashWindowEx taskbar flash runs in that
  case; with real user input the grant was consistent in tests B/C/D/E.
- G, H, M (with a Hungarian layout) and the live-conflict branch of J remain
  for manual verification.
