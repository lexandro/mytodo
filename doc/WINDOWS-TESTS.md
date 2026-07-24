# Manuális Windows teszt-checklist — Summon Workspace & global shortcuts

A shortcut.md §30 szerinti tesztek. **2026-07-24-én automatizáltan levezényelve**
a feloldott munkameneten (valódi szintetikus billentyű-input + IVirtualDesktopManager-
ellenőrzés + Win+Ctrl+D desktop-létrehozás), a portable release builddel.

## Eredmények

- [x] **A — Summon másik desktopról.** ✅ Új virtuális desktop létrehozva
      (Win+Ctrl+D) → az app `onCurrentDesktop=False` → `Ctrl+Alt+T` → az app
      ÁTJÖTT (`onCurrentDesktop=True`), fókuszt kapott; a desktop nem váltott
      át az app régi helyére.
- [x] **B — Háttérből előre.** ✅ Chrome fókuszban → `Ctrl+Alt+T` → myTODO
      foreground.
- [x] **C — Toggle hide.** ✅ App fókuszban → `Ctrl+Alt+T` → elrejtve, a fókusz
      természetesen visszaesett az előző appra; újra → visszajött fókusszal.
- [x] **D — Minimized restore.** ✅ Minimalizált → `Ctrl+Alt+T` → azonnali
      restore + foreground. (Egy korai futásban a restore ~1-2 mp késéssel jött
      — a minimalizált WebView2 throttlingja; ismételt tesztben azonnali volt.)
- [x] **E — Monitor-követés.** ✅ Fókuszált ablak a bal (másodlagos) monitoron
      → summon → a main a bal monitorra érkezett (rect: -1253,391); vissza-irányban
      is követte a primary monitort.
- [ ] **G — Lecsatolt monitor.** Nem tesztelhető automatán (fizikai lecsatolás
      kell). A kód work-area clamp-je + a window-state restore monitor-metszet
      guardja fedi; kézi ellenőrzés ajánlott docking-váltásnál.
- [ ] **H — Foglalt shortcut.** Nem provokálva (kellene egy idegen app, ami
      előbb lefoglalja a Ctrl+Alt+T-t). A kódút: regisztrációs hiba → gyűjtés →
      egyszeri toast, app fut tovább — F8-ban unit-szinten fedve.
- [x] **I — Rebind.** ✅ (F8 CDP-teszt: recorder → Ctrl+Alt+P → OS-szinten
      regisztrálva, régi elengedve, persist.)
- [~] **J — Sikertelen rebind.** A tranzakciós rollback-logika unit-tesztelt;
      élő ütközéses provokáció nem futott (lásd H).
- [x] **K — Quick Add.** ✅ `Ctrl+Shift+Space` → Quick Add az aktuális
      desktopon fókusszal, a main NEM mozdult; valódi gépelés + Enter → todo
      a portable DB-ben, ablak elrejtőzött, fókusz visszaesett.
- [x] **L — Gyors tripla hotkey.** ✅ 3 gyors lenyomás → nincs beragadt állapot,
      process él, további lenyomásra konzisztensen reagál (serialized summon).
- [ ] **M — AltGr együttélés.** A tesztgép aktív kiosztása US English volt —
      HU kiosztással kell megismételni: AltGr+F/G/B (`[ ] {`) gépelhető marad-e,
      amíg a Ctrl+Alt+T él. (A Settings-validátor figyelmeztet minden Ctrl+Alt
      kombinációra.)

## Megjegyzések

- A foreground-grant szintetikus inputnál időnként tagadott (Windows
  foreground-lock) — ilyenkor a spec szerinti FlashWindowEx taskbar-villogás
  fut le; valódi user-lenyomásnál a grant a B/C/D/E tesztekben konzisztensen
  megvolt.
- G, H, M (HU layouttal) és a J élő ütközéses ága maradt kézi ellenőrzésre.
