# ADDENDUM – Windows Global Shortcuts & “Summon Workspace” Integration

Egészítsd ki az alkalmazást Windows-specifikus globális shortcut rendszerrel és egy kiemelten fontos **Summon Workspace** funkcióval.

Ez a specifikáció a fo development prompt kiegészítése.

A funkció célja kifejezetten a Windows 10/11 virtual desktop workflow támogatása.

A felhasználó több Windows virtuális desktopon dolgozik, és NEM akar azért desktopot váltani, hogy megkeresse a Todo Workspace alkalmazást.

Az alapelv:

> Do not take the user to the application. Bring the application to the user.

---

# 1. Summon Workspace – core behavior

Legyen egy konfigurálható globális Windows shortcut:

Default:

`Ctrl+Alt+T`

Function:

**Summon Workspace**

Amikor a felhasználó ezt bárhol megnyomja Windowsban:

1. állapítsd meg, melyik Windows virtuális desktopon dolgozik jelenleg;
2. NE válts át arra a virtuális desktopra, ahol a Todo Workspace jelenleg található;
3. mozgasd át a Todo Workspace MAIN WINDOW-ját arra a virtuális desktopra, ahol a felhasználó jelenleg dolgozik;
4. ha az ablak minimized, restore-old;
5. ha hidden, mutasd meg;
6. hozd elotérbe, amennyiben Windows ezt engedélyezi;
7. állítsd vissza az alkalmazás korábbi méretét és layoutját;
8. ne változtasd meg szükségtelenül az ablak méretét vagy pozícióját.

A legfontosabb követelmény:

> **DO NOT SWITCH THE USER'S ACTIVE WINDOWS VIRTUAL DESKTOP. MOVE THE APPLICATION WINDOW TO THE USER'S CURRENT VIRTUAL DESKTOP.**

Ez nem opcionális UX-részlet, hanem a funkció lényege.

---

# 2. Current Virtual Desktop meghatározása

Windows alatt elsodlegesen documented Windows API-kat használj.

A javasolt folyamat:

```text
Global hotkey pressed
        ?
GetForegroundWindow()
        ?
Capture foreground HWND BEFORE activating Todo Workspace
        ?
IVirtualDesktopManager::GetWindowDesktopId(foreground HWND)
        ?
Current user's virtual desktop GUID
        ?
Get Todo Workspace main HWND
        ?
IVirtualDesktopManager::MoveWindowToDesktop(todo HWND, target GUID)
        ?
Restore/show Todo window
        ?
Attempt foreground activation
```

FONTOS:

A foreground HWND-t még AZELOTT kell eltárolni, hogy a Todo alkalmazás bármilyen módon megpróbálná saját magát aktiválni.

Különben elveszítjük azt az információt, hogy a user melyik desktopon dolgozott.

---

# 3. Windows API implementation

Windows 10/11 alatt preferáld a hivatalos:

`IVirtualDesktopManager`

COM interface-t.

Relevant operations:

* `GetWindowDesktopId`
* `IsWindowOnCurrentVirtualDesktop`
* `MoveWindowToDesktop`

A Windows-specific implementáció kerüljön a Rust/Tauri oldalra.

Ne próbáld ezt frontend JavaScriptbol Win32 hackekkel megoldani.

Készíts jól elkülönített Windows integration module-t, például:

```text
src-tauri/src/windows/
    virtual_desktop.rs
    window_activation.rs
    global_shortcuts.rs
```

vagy ehhez hasonló tiszta struktúrát.

A frontend csak magas szintu actionöket lásson:

```text
summonWorkspace()
showGlobalQuickAdd()
openPinnedTodos()
openGlobalSearch()
```

A Win32/COM implementation detail ne szivárogjon be a Svelte komponensekbe.

---

# 4. Same-desktop behavior

Ha a Todo Workspace már azon a virtuális desktopon van, ahol a user dolgozik:

NE mozgasd feleslegesen.

Csak:

* restore, ha minimized;
* show, ha hidden;
* bring to foreground / activate.

Tehát:

```text
if todoDesktop == currentDesktop:
    show/restore/activate
else:
    move to current desktop
    show/restore/activate
```

---

# 5. Summon legyen opcionálisan toggle

A shortcut kapjon konfigurálható viselkedést.

Default:

**Summon / Hide Toggle**

Logika:

### Todo másik virtual desktopon van

`Ctrl+Alt+T`

? move here
? show
? focus

### Todo ugyanitt van, de háttérben

`Ctrl+Alt+T`

? foreground

### Todo ugyanitt van ÉS jelenleg foreground/focused

`Ctrl+Alt+T`

? hide vagy minimize

Ezáltal ugyanaz a shortcut nagyon gyors:

```text
press
? Todo

press again
? vissza az elozo munkához
```

Settingsben lehessen választani:

```text
Summon shortcut behavior:

? Summon / Hide toggle
? Always summon / focus
```

Default:

**Summon / Hide toggle**

Ne implementálj szükségtelenül több summon módot.

---

# 6. Hide vs Minimize

A toggle esetében preferált viselkedés:

**Hide**

ha ez Tauri/Windows szempontból stabilan és kiszámíthatóan megoldható.

Ennek oka:

a funkció inkább egy gyorsan elohívható workspace legyen, mint hagyományos taskbar-minimize workflow.

Ha hide használata Windows UX vagy Tauri lifecycle problémát okoz, használható minimize.

A választott megoldást dokumentáld.

Az app process természetesen maradjon futva.

---

# 7. Foreground activation

A Windows korlátozhatja, hogy egy háttérfolyamat önkényesen ellopja a foreground focust.

Ne építs agresszív vagy undocumented focus-stealing hackeket.

A summon explicit user hotkey actionbol érkezik, ezért próbáld meg normál Win32 módszerekkel:

* restore/show window
* appropriate window positioning
* `SetForegroundWindow`
* szükség esetén standard documented activation methods

Ha Windows mégsem ad foreground permissiont:

1. az ablak attól még kerüljön át a megfelelo virtual desktopra;
2. legyen visible;
3. kérjen felhasználói figyelmet standard Windows módon, például taskbar flash használatával;
4. ne lépjen hibás állapotba.

Ne:

* switch virtual desktop,
* simulate Alt+Tab,
* inject fake keyboard input,
* használj instabil undocumented focus hackeket.

---

# 8. Window position több monitor esetén

A virtual desktop és a monitor két külön fogalom.

A summon funkció próbálja meg a window-t azon a monitoron megjeleníteni, ahol a felhasználó aktuálisan dolgozik.

Preferált muködés:

1. foreground window HWND;
2. állapítsd meg, melyik monitoron van;
3. mozgasd a Todo Workspace-t ugyanarra a monitorra;
4. tartsd meg lehetoség szerint a korábbi:

   * width,
   * height,
   * maximized state.

Ha a korábbi méret nem fér el az aktuális monitor work area-jában:

* clampeld biztonságosan a látható területre.

Soha ne kerüljön az ablak teljesen off-screen területre.

Ez különösen fontos:

* laptop + external monitor,
* docking station,
* eltéro DPI,
* monitor disconnect

esetekben.

---

# 9. Maximized state

Ha a Todo Workspace summon elott maximized volt:

az áthelyezés után is legyen maximized az új desktop/monitor környezetben.

Ha normál window state-ben volt:

orizd meg a normál méretét.

Ne legyen:

```text
maximized ? summon ? random small window
```

vagy:

```text
normal ? summon ? automatically maximized
```

---

# 10. Global Shortcut Manager

Ne hardcode-old a global shortcutokat.

Készíts egyszeru konfigurálható:

**Global Shortcuts**

settings szekciót.

A funkciókhoz tartozó shortcutok persistálódjanak.

Minimum támogatott global actions:

### Summon Workspace

Default:

`Ctrl+Alt+T`

Enabled by default.

### Global Quick Add

Default:

`Ctrl+Shift+Space`

Enabled by default.

Ez a fo promptban definiált Quick Add floating window.

### Pinned Todos

Default:

NINCS.

Disabled by default.

A felhasználó opcionálisan rendelhet hozzá global shortcutot.

Aktiválásakor:

1. summon Workspace ide;
2. nyissa meg a Pinned Todos nézetet;
3. focus kerüljön az alkalmazásra.

### Global Search

Default:

NINCS.

Disabled by default.

Aktiválásakor:

1. summon Workspace ide;
2. nyissa meg a Global Search felületet;
3. focus kerüljön a search inputra.

Ez a négy global action elegendo.

Ne építs általános macro/hotkey automation rendszert.

---

# 11. Shortcut Settings UI

Legyen egy egyszeru:

```text
Global Shortcuts
------------------------------------------

Summon Workspace
[ Ctrl + Alt + T ]          [Enabled]

Global Quick Add
[ Ctrl + Shift + Space ]    [Enabled]

Pinned Todos
[ Not assigned ]            [Disabled]

Global Search
[ Not assigned ]            [Disabled]

                         Reset Defaults
```

A shortcut mezo legyen keyboard recorder.

Például kattintás után:

```text
Press shortcut...
```

majd a user lenyom:

`Ctrl+Alt+W`

és a rendszer ezt eltárolja.

Ne kelljen stringként begépelni.

---

# 12. Shortcut validation

Shortcut mentésekor:

1. parse;
2. validate;
3. próbáld regisztrálni;
4. csak sikeres registration után váljon aktívvá.

Ha a shortcutot más alkalmazás vagy Windows már használja:

NE írjuk felül csendben.

Mutass értheto hibát:

```text
Ctrl+Alt+T could not be registered.
It may already be used by Windows or another application.

Choose another shortcut.
```

A korábbi muködo shortcut maradjon regisztrálva, amíg az új sikeresen át nem veszi a helyét.

Tehát ne legyen:

```text
unregister old
register new ? FAIL
user now has no shortcut
```

Preferált tranzakció:

```text
validate new
attempt register new
if success:
    unregister old
    persist new
else:
    keep old
```

Ha ugyanazon process/plugin korlátozásai miatt ehhez más sorrend szükséges, biztosíts rollbacket.

---

# 13. Shortcut conflicts az alkalmazáson belül

Ugyanaz a global shortcut nem rendelheto két külön actionhöz.

Például:

```text
Summon Workspace     Ctrl+Alt+T
Global Quick Add     Ctrl+Alt+T
```

? invalid.

Mutass világos conflict state-et.

---

# 14. Safe shortcut requirements

Ne engedj olyan shortcutot, amely csak egyetlen normál karakter.

Például:

`T`

nem lehet global hotkey.

A global shortcut minimum tartalmazzon megfelelo modifier kombinációt.

Preferált modifier:

* Ctrl
* Alt
* Shift

Kerüld a Windows által fenntartott vagy veszélyes rendszerkombinációkat.

Ne próbálj:

* Win+L
* Ctrl+Alt+Delete
* Alt+Tab
* Win+D

jellegu system shortcutsot elfoglalni.

Ha szükséges, blacklistelj egy kis explicit rendszershortcut listát.

---

# 15. Tauri global shortcuts

A global shortcut registrationhez preferáld a Tauri v2 hivatalos global-shortcut megoldását/pluginját, amennyiben megfelel a követelményeknek.

Legyen centralizált ShortcutManager.

Ne regisztráljanak külön Svelte komponensek shortcutokat.

Például logikailag:

```text
ShortcutManager

registerAll()
register(action, accelerator)
unregister(action)
rebind(action, newAccelerator)
validate(accelerator)
resetDefaults()
```

A konfiguráció egyetlen source of truthból érkezzen.

---

# 16. Startup registration

App startupkor:

1. settings betöltés;
2. enabled global shortcutok regisztrálása;
3. registration failure-ek összegyujtése;
4. app ettol még induljon el.

Ha például:

Global Quick Add sikeres

de:

Summon Workspace conflict miatt sikertelen,

akkor ne álljon le az alkalmazás.

Mutass egyszer egy nem agresszív notificationt:

```text
Some global shortcuts could not be registered.

Review shortcuts
```

---

# 17. Global Quick Add és Virtual Desktop

A Global Quick Add külön ablak.

Amikor shortcutból megnyílik:

az AKTUÁLIS virtual desktopon és lehetoség szerint az AKTUÁLIS monitoron jelenjen meg.

NE:

* summonolja automatikusan a teljes main workspace-et;
* váltson desktopot.

Tehát:

```text
Ctrl+Shift+Space

? tiny Quick Add appears HERE
? type
? Enter
? window disappears
```

Ez külön workflow a Summon Workspace-tol.

---

# 18. Pinned Todos global shortcut behavior

Ha a user késobb rendel shortcutot a:

Pinned Todos

actionhöz, például:

`Ctrl+Alt+P`

akkor:

```text
Ctrl+Alt+P

? determine current desktop
? move main Todo Workspace here
? restore/show
? open Pinned Todos view
? focus
```

Ne külön floating pinned window nyíljon.

A meglévo Workspace jöjjön ide.

---

# 19. Global Search shortcut behavior

Ha a user rendel hozzá shortcutot:

```text
Ctrl+Alt+F

? Todo Workspace summoned here
? Global Search opened
? search field focused
```

A user azonnal gépelhessen.

Ez nagyon fontos:

ne kelljen még kattintania a search inputba.

---

# 20. Do not make every shortcut global

A fo alkalmazásban meglévo shortcutok:

* Ctrl+N
* Ctrl+F
* Ctrl+P
* Ctrl+Enter
* F2
* Delete
* Ctrl+1..9
* etc.

maradjanak APPLICATION-LOCAL shortcutok.

NE regisztráld mindet Windows global shortcutként.

A global shortcutok ritka, szándékos entry pointok:

* Summon
* Quick Add
* optional Pinned
* optional Global Search

Ez csökkenti:

* conflictokat,
* meglepetéseket,
* OS shortcut interference-t.

---

# 21. Previous focus handling

A Summon/Hide toggle esetében érdemes eltárolni:

* melyik foreground window volt aktív a summon elott.

Amikor a user másodszor megnyomja a toggle shortcutot és elrejti a Todo Workspace-t:

próbálj természetes Windows viselkedéssel visszaadni a focust az elozo alkalmazásnak, HA ez megbízhatóan és documented API-k segítségével megoldható.

Ez nice-to-have.

Ne használj hackeket ennek kikényszerítésére.

A legfontosabb követelmény továbbra is:

summon ? Todo megjelenik ott, ahol dolgozom.

---

# 22. Multiple rapid shortcut presses

Kezeld a gyors dupla/tripla hotkey press eseményeket.

Ne legyen race condition:

```text
move
hide
move
restore
activate
hide
```

egymással párhuzamosan.

A summon operation legyen serialized/debounced annyira, amennyire szükséges.

Nem kell látható delay.

Csak ne fusson egyszerre több window transition.

---

# 23. Global Quick Add singleton

A Quick Add ablakból csak egy példány létezzen.

Ha már nyitva van és újra megnyomják:

`Ctrl+Shift+Space`

akkor:

* ne nyisson második ablakot;
* hozza elo/focusolja a meglévot.

---

# 24. Main Window singleton

A Summon funkció mindig ugyanazt a main Workspace window-t mozgatja.

NE hozz létre új main window instance-t virtuális desktoponként.

Ez fontos.

A koncepció:

```text
one workspace
one database
one main window

wherever I currently need it
```

Nem:

```text
Desktop 1 ? Todo window
Desktop 2 ? another Todo window
Desktop 3 ? another Todo window
```

---

# 25. Tray behavior

Amennyiben az alkalmazás fo promptja vagy designja támogat tray icont, a Summon funkció legyen kompatibilis vele.

De a global shortcut muködéséhez NE legyen szükséges külön tray interaction.

Ha nincs tray requirement a designban:

ne építs komplex tray menüt csak ezért.

---

# 26. Portable settings

A global shortcut settings is a portable application data könyvtárban tárolódjon.

Ne registry legyen a shortcut konfiguráció primary storage-ja.

Például ugyanabban a settings storage-ban, ahol:

* theme
* UI scale
* font size
* window layout

is található.

Ha az egész portable app mappát átmásoljuk:

a shortcut preferences is menjenek vele.

Természetesen az új gépen startupkor újra kell regisztrálni oket Windowsban.

---

# 27. Failure behavior

Kezeld legalább:

* global shortcut registration failure
* foreground HWND unavailable
* target desktop ID lookup failure
* COM initialization failure
* MoveWindowToDesktop failure
* Todo HWND unavailable
* SetForegroundWindow denied
* monitor unavailable
* previous monitor removed

A funkció legyen graceful.

Például SetForegroundWindow failure NEM kritikus.

Virtual desktop move failure esetén:

* ne switch-elj automatikusan desktopot fallbackként.

Ez fontos.

A user kifejezetten azért használja a Summon funkciót, hogy NE hagyja el az aktuális desktopot.

---

# 28. Logging

A Windows integration hibák kerüljenek debug/application logba.

Például:

```text
Summon requested
Foreground HWND: ...
Target desktop: ...
Main HWND: ...
MoveWindowToDesktop: success
Restore: success
SetForegroundWindow: denied
Fallback FlashWindowEx used
```

Ne logolj túl sokat normál használat során.

Debugginghoz azonban legyen elég információ.

---

# 29. Tests

A tisztán tesztelheto logikákhoz írj unit testet:

* shortcut conflict detection
* shortcut validation
* default configuration
* rebind rollback
* action mapping
* toggle state logic

A Win32 API köré készíts vékony adaptert/interface-t, hogy a magasabb szintu summon orchestration mockolható legyen.

Ne próbálj unit testben tényleges Windows virtual desktopot manipulálni.

A valódi Windows integrationhöz készíts manuális test checklistet.

---

# 30. Manual Windows test checklist

Dokumentáld és teszteld legalább:

### Test A

Desktop 1:
Todo Workspace

Desktop 2:
VS Code active

Desktop 2-n:

Ctrl+Alt+T

Expected:

* Desktop 2 marad aktív.
* Todo Workspace átjön Desktop 2-re.
* Visible/focused.
* Desktop 1-re NEM váltunk.

### Test B

Todo már Desktop 2-n, háttérben.

Ctrl+Alt+T

Expected:

foreground.

### Test C

Todo Desktop 2-n foreground.

Ctrl+Alt+T

Expected:

hide/minimize toggle.

### Test D

Todo minimized másik desktopon.

Ctrl+Alt+T

Expected:

move to current desktop + restore.

### Test E

Laptop monitor + external monitor.

VS Code external monitoron.

Ctrl+Alt+T

Expected:

Todo lehetoség szerint external monitorra érkezik.

### Test F

Todo maximized.

Summon másik desktopra.

Expected:

maximized marad.

### Test G

External monitor disconnected.

Summon.

Expected:

Todo látható területen jelenik meg.

### Test H

Global shortcut already occupied.

Expected:

clear conflict error, app continues working.

### Test I

Rebind:

Ctrl+Alt+T
?
Ctrl+Alt+W

Expected:

new works, old no longer triggers.

### Test J

Failed rebind.

Expected:

old shortcut continues working.

### Test K

Global Quick Add while main app is another desktop.

Expected:

Quick Add appears on CURRENT desktop.

Main workspace does NOT move.

---

# 31. README

Egészítsd ki a dokumentációt egy:

## Windows Global Shortcuts

résszel.

Dokumentáld:

* Summon Workspace
* Global Quick Add
* optional Pinned Todos
* optional Global Search
* default shortcuts
* shortcut customization
* conflict handling
* virtual desktop behavior

Külön emeld ki:

> Summon Workspace moves the existing application window to your current Windows virtual desktop instead of switching you to the desktop where the application was previously located.

---

# 32. Product philosophy

Ez nem pusztán egy technikai extra.

A feature közvetlenül az alkalmazás alapveto célját támogatja:

> A Todo Workspace legyen mindig egy billentyunyomásra attól a helytol, ahol éppen dolgozom.

A workflow:

```text
working on Desktop 3

        ?

Ctrl+Alt+T

        ?

Todo Workspace appears HERE

        ?

check/edit something

        ?

Ctrl+Alt+T

        ?

Todo disappears

        ?

continue working
```

A felhasználónak ne kelljen azon gondolkodnia:

> „Melyik desktopon hagytam a todo appot?”

A válasz mindig az legyen:

> **Nem érdekes. Megnyomom a shortcutot, és idejön.**

Ezt tekintsd a Summon Workspace feature Definition of Done-jának.
