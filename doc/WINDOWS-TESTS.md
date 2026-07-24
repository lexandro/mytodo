# Manuális Windows teszt-checklist — Summon Workspace & global shortcuts

A shortcut.md §30 szerinti tesztek. A virtual desktop / fókusz viselkedés
automatán nem tesztelhető — ezeket kézzel kell végigvinni egy többmonitoros,
több virtuális desktopos Windows 10/11 gépen.

Automatán már igazolt (CDP, 2026-07-24): a `summon_workspace` és
`show_quick_add` parancsok hibamentesen futnak; a Quick Add ablak a helyes
listákat mutatja, Enterrel a MAIN ablak írja az adatbázist; a shortcutok
OS-szinten regisztrálódnak (Control+Alt+T, Control+Shift+Space); a rebind
tranzakciós; az AltGr-figyelmeztetés megjelenik.

## Tesztek

- [ ] **A — Summon másik desktopról.** Desktop 1: myTODO. Desktop 2: VS Code
      aktív. Desktop 2-n `Ctrl+Alt+T`. Elvárt: Desktop 2 AKTÍV MARAD, a myTODO
      átjön Desktop 2-re, látható/fókuszált. Desktop 1-re NEM váltunk át.
- [ ] **B — Háttérből előre.** myTODO már az aktuális desktopon, háttérben.
      `Ctrl+Alt+T` → foreground.
- [ ] **C — Toggle hide.** myTODO fókuszban. `Ctrl+Alt+T` → elrejtés
      (Summon/Hide toggle default). Újra `Ctrl+Alt+T` → visszajön.
- [ ] **D — Minimized másik desktopon.** `Ctrl+Alt+T` → átjön + restore.
- [ ] **E — Monitor-követés.** Laptop + külső monitor; VS Code a külsőn.
      `Ctrl+Alt+T` → myTODO a külső monitorra érkezik.
- [ ] **F — Maximized megőrzés.** Maximalizált myTODO summon másik desktopra
      → maximalizált marad.
- [ ] **G — Lecsatolt monitor.** Külső monitor lehúzva → summon → látható
      területen jelenik meg (clamp).
- [ ] **H — Foglalt shortcut.** Másik app fogja a Ctrl+Alt+T-t → induláskor
      egyszeri, nem agresszív toast; az app működik tovább.
- [ ] **I — Rebind.** Settings → Summon → `Ctrl+Alt+W`. Az új működik, a
      régi már nem.
- [ ] **J — Sikertelen rebind.** Foglalt kombinációra rebind → hibaüzenet,
      a régi shortcut TOVÁBBRA IS működik.
- [ ] **K — Quick Add nem mozgatja a main ablakot.** Main a Desktop 1-en,
      user a Desktop 2-n. `Ctrl+Shift+Space` → a Quick Add a Desktop 2-n
      jelenik meg, a main NEM mozdul. Enter → todo az Inboxban.
- [ ] **L — Gyors dupla hotkey.** `Ctrl+Alt+T` gyorsan többször → nincs
      beragadt/duplikált átmenet (serialized summon).
- [ ] **M — AltGr együttélés.** HU kiosztással `AltGr+8` (`•`?) és társai
      működnek, amíg a default shortcutok élnek (Ctrl+Alt+T nem üt HU
      AltGr-karaktert).
