# Implement a Portable Windows Developer Todo Workspace

Készíts egy teljes, production-quality, portable Windows desktop alkalmazást a mellékelt design package alapján.

Az alkalmazás egy egyszeru, gyors todo workspace.

Ez NEM projektmenedzsment rendszer.

A fo use case:

> Fejlesztés vagy más koncentrált munka közben néhány másodperc alatt felírok egy tennivalót, majd folytatom a munkát.

A legfontosabb alapelvek:

* speed over features
* zero-friction task capture
* keyboard-first
* local-first
* portable
* autosave
* predictable desktop UX
* minimal dialogs
* no unnecessary abstractions
* no project-management bloat

## 1. Elso lépés: olvasd el a design package-et

A repository `doc` vagy `docs` könyvtárában található egy design ZIP.

Mielott implementálsz:

1. keresd meg,
2. bontsd ki vagy olvasd ki,
3. dolgozd fel az összes releváns design dokumentumot és assetet,
4. értsd meg a képernyoket, komponenseket és interaction specificationt.

A design package a VISUAL és UX source of truth.

A jelen prompt a FUNCTIONAL source of truth.

Ha a design és ez a prompt között funkcionális eltérés van:

* ezt a promptot kövesd funkcióban,
* a design package-et megjelenésben és interaction részletekben.

Ne kezdj saját alternatív UI-t tervezni, ha a design már meghatározta.

## 2. Technológia

Használd:

* Tauri v2
* Rust backend/shell
* Svelte 5
* TypeScript
* SQLite
* Vitest frontend/unit tests

Az architektúra maradjon kicsi és könnyen értheto.

Preferáld:

* pure TypeScript domain/helper module-okat,
* jól definiált persistence réteget,
* minimális Tauri IPC felületet,
* egyszeru Rust oldalt.

Ne készíts enterprise architecture astronauticsot.

Ez egy kis desktop tool.

A végleges Windows build legyen minél kisebb és gyorsabb.

## 3. Windows target

Target:

* Windows 10
* Windows 11
* x64

Az alkalmazás muködjön installer nélkül portable módban.

A release eredménye lehessen például:

TodoWorkspace/
TodoWorkspace.exe
data/
backup/

A mappa másik helyre vagy másik számítógépre másolásával az alkalmazás adatai is vele mozogjanak.

Ne használj accountot vagy cloud storage-ot.

Ne legyen kötelezo registry-based application state.

A beállítások is kerüljenek portable adatállományba.

## 4. Persistence

Használj SQLite adatbázist.

Például:

data/todo.db

Az adatmodell támogassa legalább:

* lists
* groups
* todos
* subtasks
* activity events
* custom color labels
* settings
* layout state
* trash/deleted state

Használj megfelelo schema version/migration mechanizmust.

Ne legyen szükség internetkapcsolatra.

## 5. Automatic backup

Az adatbázisról automatikus backup készüljön.

Példa:

backup/
todo-2026-07-24.db
todo-2026-07-23.db
...

Tartsd meg az utolsó 10 biztonsági mentést.

A backup ne blokkolja érzékelhetoen a UI-t.

Legyen manuális:

Backup Now

funkció is.

## 6. Import / Export

Legyen:

* Export JSON
* Import JSON
* Backup
* Restore

Az SQLite a normál runtime storage.

A JSON egy hordozható, emberileg is olvasható adatcsere/mentési formátum.

Az export tartalmazzon minden érdemi user adatot:

* lists
* groups
* todos
* subtasks
* activity
* color definitions

A layout/settings exportálása opcionálisan külön kezelheto.

Import elott végezz validációt.

Hibás import ne rontsa el az aktuális adatbázist.

## 7. Core hierarchy

A modell:

List / Workspace
Group
Group
Group
Todo
Subtasks

A group hierarchy maximum:

3 levels.

Ennél mélyebbet sem UI-ból, sem importból, sem drag & dropból ne lehessen létrehozni.

A Subtask NEM számít bele ebbe.

A Subtask csak egy todo alatti egyszeru checklist elem.

## 8. Lists / tabbed workspace

Az alkalmazás egyik legfontosabb funkciója a tabbed workspace.

A felhasználó több todo-listát tarthat egy alkalmazásban.

Például:

* Conference App
* AI Todo
* Home Server
* Misc

List CRUD:

* create
* rename
* delete
* reorder

List property:

* name
* optional emoji

Legyen mindig:

?? Inbox

lista.

Az Inbox automatikusan jöjjön létre elso indításkor.

Nem törölheto.

A listák single-pane módban tabbed UX-ként muködjenek a design alapján.

## 9. Todo CRUD

Todo property-k:

* id
* list/group location
* title
* description
* status
* emoji
* color label
* local pinned
* global pinned
* archived
* created_at
* updated_at
* ordering
* deleted/trash metadata

Status enum:

* Open
* InProgress
* Done
* Cancelled

Teljes CRUD szükséges.

## 10. Quick Add

Minden TodoPane tetején legyen állandó quick-add input.

A primary workflow:

type ? Enter ? todo created

Sem modal, sem Save dialog.

Enter:
hozza létre a todo-t.

Shift+Enter:
hozza létre és nyissa meg a Details nézetet.

Ha a design ettol minimálisan eltéro, de ugyanolyan gyors interactiont ír le, kövesd a designt.

Quick Add a focused pane/list kontextusába dolgozzon.

## 11. Global Quick Add

Implementálj global Windows shortcutot.

Default:

Ctrl+Shift+Space

A shortcut az alkalmazástól függetlenül is muködjön, amennyiben Windows engedélyezi.

Nyisson egy kicsi, gyors floating Quick Add window-t.

Tartalmazzon:

* title input
* target list selector

Default target:

Inbox

Enter:

* create todo
* close/hide floating window
* restore previous focus

Escape:

close without creating.

Ez a window legyen extrém gyorsan használható.

## 12. Groups

Group CRUD:

* create
* rename
* delete
* reorder
* move
* collapse/expand

Group property:

* name
* optional emoji
* parent
* ordering

Maximum 3 level.

Group törlésekor ne vesszen el véletlenül egy teljes subtree confirmation nélkül.

Itt használható értelmes confirmation vagy move-content workflow.

A normál todo törlést viszont Trash + Undo oldja meg.

## 13. Drag & Drop

Implementálj korrekt drag & drop rendszert.

Támogatott:

* todo reorder same group
* todo move group ? group
* todo move root ? group
* todo move list ? list
* group reorder
* group move within legal max depth
* todo drag between visible split panes

A UI egyértelmuen mutassa:

* insert before
* insert after
* move into group

drop targeteket.

Invalid depth drop ne hajtódjon végre.

## 14. Split Pane system

Alap:

1 pane.

Támogass:

* vertical split
* horizontal split
* maximum 4 pane

Lehetséges layout:

1

2 vertical

2 horizontal

2×2

A split rendszer ne legyen általános IDE docking framework.

Csak a szükséges egyszeru 1/2/4 pane muködés kell.

Minden pane tárolja saját:

* selected list
* scroll position lehetoség szerint
* expanded groups
* current selection

állapotát.

A pane-ek egymástól függetlenül külön listákat mutathatnak.

A pane-ek között muködjön todo drag & drop.

A layout persistálódjon.

App restart után álljon vissza.

## 15. Pinning

Két pin type van.

### Local Pin

A todo az adott listán belüli Pinned sectionben jelenik meg.

### Global Pin

A todo globális pinned elem.

A design alapján legyen könnyen elérheto akkor is, amikor másik listán dolgozunk.

A két állapot legyen egyértelmuen megkülönböztetheto.

Ne legyen szükség duplicate todo-ra a pineléshez.

## 16. Pinned Todos View

Toolbarból és/vagy menübol nyitható külön Pinned Todos nézet.

Struktúra:

GLOBAL
globally pinned todos

Conference App
local pinned todos

AI Todo
local pinned todos

...

A Global section mindig legfelül.

Utána csak azok a listák jelenjenek meg, amelyeknek van local pinned todo-ja.

A listák szerint legyenek csoportosítva.

Todo kiválasztásakor navigáljunk az eredeti todo-hoz:

* megfelelo listára,
* megfelelo grouphoz,
* megfelelo pane/contextbe,
* szükség esetén scroll into view.

## 17. Subtasks

Todo alatt legyen egyszeru ordered checklist.

Subtask:

* id
* todo_id
* text
* checked
* ordering

Támogass:

* create
* edit
* delete
* check/uncheck
* reorder

A subtask nem rendelkezik:

* saját descriptionnel
* saját status enum-mal
* saját activity historyval
* child subtasks-szal

## 18. Emoji

Emoji rendelheto:

* list
* group
* todo

Támogasd a normál Unicode emojikat.

A Windows Win+. emoji input muködjön természetesen a text inputokban.

Custom icon infrastructure nem szükséges.

## 19. Color Labels

Legyen preset palette.

Minimum:

* neutral
* red
* orange
* yellow
* green
* blue
* purple
* gray

Ezen kívül:

maximum 12 user-defined custom color label.

Custom Color Label:

* id
* color
* optional name
* ordering

Például:

Important
Boss
Personal
Free time

A labelnév opcionális.

Todo egyszerre egy ilyen color labelt használjon.

A color csak vizuális classification.

Ne vezess be külön priority rendszert.

A design package szerinti visszafogott színjelzést használd.

## 20. Search

Két search scope:

Current List

Global

Legyen:

* live
* case insensitive
* Hungarian accent insensitive
* fuzzy

Normalization esetén például:

ÁRVÍZTURO

és

arvizturo

egyezzen.

Search fields:

* todo title
* description
* subtask texts

Használj Unicode-aware normalizálást.

A fuzzy matching legyen könnyu és gyors.

Ne vezess be nehéz search engine dependency-t indokolatlanul.

Global result tartalmazzon breadcrumbot:

Conference App / Backend / Authentication

Kattintásra navigáljon az eredeti todo-hoz.

Írj unit testeket különösen:

* Hungarian accent normalization
* case normalization
* fuzzy match
* global/current scoping

esetekre.

## 21. Todo Details

A design package szerinti desktop detail UI-t implementáld.

A detail nézet tabbed:

Details | Activity

Details tartalmazza:

* title
* status
* emoji
* color
* description
* subtasks
* local/global pin
* duplicate
* archive
* delete

Módosítások autosave muködésuek.

## 22. Description

A description:

* multiline
* plain text

Most NINCS Markdown.

Automatikusan ismerd fel lehetoség szerint:

* http://
* https://
* Windows file path
* Windows directory path

Ezek legyenek kattinthatók.

Web URL:

default browser.

Directory:

Explorer.

File:

Windows default associated application.

Kezeld biztonságosan a local path megnyitást.

## 23. Activity Log

Todo-nként egyszeru activity log kell.

Csak értelmes események.

Példák:

Created

Open ? In Progress

Added subtask "fix retry"

Moved Backend ? Authentication

Pinned locally

Pinned globally

Archived

Restored from archive

Cancelled

Nem kell:

* character-level history
* diff
* revision system
* audit-grade event sourcing

A cél:

> késobb lássam, nagyjából mikor mit csináltam vele.

Activity event minimum:

* todo_id
* event_type
* human-readable summary/data
* timestamp

## 24. Archive

Archive külön fogalom a statustól.

Todo lehet például:

Done + Archived

Cancelled + Archived

Minden listának alul legyen egy:

Archived (N)

section.

Default:

collapsed.

Kinyitva mutassa az adott lista archivált todo-jait.

Archived todo:

* megnyitható
* keresheto
* visszaállítható

A normál listában ne zavarjon.

## 25. Trash

Delete ? Trash.

Ne physical delete.

Trash item tárolja a restore-höz szükséges eredeti location információt.

Legyen külön Trash view.

Funkciók:

* Restore
* Delete Permanently
* Empty Trash

Az Empty Trash kérhet confirmationt.

## 26. Undo

Implementálj valódi, használható undo rendszert.

Minimum undoable actionök:

* delete
* move
* reorder
* status change
* rename
* archive
* restore
* pin/unpin
* group/list reorder

Ctrl+Z.

Delete/archive után toastban is megjelenhet:

Undo

Az undo stacknek nem szükséges app restart után persistálódnia.

Tartsd egyszeruen.

Írj unit testeket az undoable domain actionökre.

## 27. Duplicate Todo

Duplicate Todo másolja:

* title
* description
* emoji
* color
* subtasks

Az új todo:

* új ID
* új created timestamp
* új activity log
* Open status, hacsak a design/function szempontból indokoltan másként nem döntesz
* ne legyen automatikusan archived

Pin state másolását inkább ne végezd el automatikusan.

## 28. UI Scale és Todo Font Size

Két külön setting.

### UI Scale

Példák:

80
90
100
110
125
150 %

Skálázza:

* controls
* toolbar
* tabs
* padding
* icons
* tree indentation
* row sizes

### Todo Font Size

Külön állítható.

A controls legyenek közvetlenül, könnyen elérhetok az alkalmazás fo UI-jából.

Ne csak Settings dialogban.

Implementálj megfelelo:

Ctrl + mouse wheel

zoom interactiont a design szerint.

A settings persistálódjanak.

## 29. Keyboard shortcuts

Implementáld minimum:

Ctrl+N
Focus Quick Add / New Todo

Ctrl+Shift+N
New List

Ctrl+F
Search Current List

Ctrl+Shift+F
Global Search

Ctrl+P
Pin action/menu

Ctrl+Enter
Toggle selected todo Done/Open

F2
Rename selected

Delete
Move selected todo to Trash

Ctrl+Z
Undo

Ctrl+1 ... Ctrl+9
Switch list/tab

Ctrl+Shift+Space
Global Quick Add

Arrow Up / Down
Navigate todos

Escape
Close active overlay/search/detail where appropriate

A shortcut kezelés ne törje el a normál text editing keyboard behavior-t.

Például Delete textboxban ne törölje a todo-t.

Írj centralizált shortcut handlinget.

## 30. Selection és keyboard navigation

Desktop appként legyen konzisztens selected todo koncepció.

Mouse click vagy keyboard navigation kiválaszthatja.

Arrow keys:

navigate visible todos.

Enter:

open details lehet a design szerint.

Space vagy megfelelo shortcut:

status action lehet.

Focus state mindig látható legyen.

Split pane esetén legyen világos, melyik pane focused.

## 31. Context menus

Implementáld a design alapján.

Todo minimum:

* Open Details
* Status
* Pin Locally
* Pin Globally
* Move To
* Duplicate
* Archive
* Delete

Group:

* New Todo
* New Subgroup
* Rename
* Emoji
* Move
* Delete

List:

* Rename
* Emoji
* Reorder/move
* Delete

Az Inbox speciális delete restrictiont kapjon.

## 32. Autosave

Nincs Save button.

Minden módosítás automatikusan persistálódik.

Az UI legyen optimistic, amennyiben biztonságos.

Persistence hiba esetén:

* ne vesszen el csendben adat,
* jelenjen meg jól látható, de nem agresszív hiba,
* legyen retry lehetoség.

## 33. Window state

Persistáld:

* window position
* window size
* maximized state
* split layout
* active list(s)
* UI scale
* todo font size

Lehetoleg több monitoros használatnál is robusztusan.

Ha a korábbi monitor már nem létezik, ne nyíljon az app láthatatlan koordinátára.

## 34. Light / Dark mode

A design package szerint támogasd.

Minimum:

* System
* Light
* Dark

Persistáld a settinget.

System mód kövesse a Windows theme-et, ha ez ésszeruen megoldható.

## 35. Sorting

A default todo sorrend legyen explicit user-defined ordering.

Drag & drop határozza meg.

Pinned todo-k kerüljenek a megfelelo pinned sectionbe.

Ne vezess be automatikus „intelligens” újrarendezést.

A user által beállított sorrend legyen stabil.

## 36. Archived/Done visibility

Done és Cancelled todo ne tunjön el automatikusan csak azért, mert státuszt váltott.

A user döntse el, mikor archiválja.

Lehet vizuálisan halványabb.

Archive explicit action.

## 37. No accidental complexity

TUDATOSAN NE implementáld:

* account
* cloud
* sync
* collaboration
* comments
* Kanban
* Gantt
* Calendar
* due date/deadline
* reminder
* recurring task
* priority score
* story point
* assignee
* sprint
* AI
* GitHub integration
* GitLab integration
* plugin architecture
* filter query language
* analytics/dashboard

Ha egy ilyen feature az implementáció során „kézenfekvonek” tunik, akkor se add hozzá.

## 38. Future backlog

Készíts:

docs/FUTURE.md

fájlt.

Ebbe jelenleg egy feature kerüljön:

### Minimal Markdown support

Future versionben opcionális minimális Markdown rendering/editing:

* todo title
* description

mezokben.

Most NE implementáld.

A jelenlegi adatmodellt viszont ne tervezd úgy, hogy késobb emiatt fájdalmas migráció legyen.

A title és description nyers szövegként tárolása megfelelo.

## 39. Database robustness

SQLite esetén:

* foreign keys
* transactions
* indexes ahol indokolt
* schema migrations
* corruption/error handling
* atomic import/restore

használata szükséges.

Drag & drop reorder esetén ne írj feleslegesen több száz sort minden mozdulatnál.

Használj egyszeru, robusztus ordering strategy-t.

## 40. Suggested core domain entities

Nem kötelezo pontosan ezt a sémát használni, de a domain legyen ehhez hasonló:

WorkspaceList

* id
* name
* emoji
* order

Group

* id
* listId
* parentGroupId?
* name
* emoji
* order
* collapsed

Todo

* id
* listId
* groupId?
* title
* description
* status
* emoji?
* colorLabelId?
* localPinned
* globalPinned
* archived
* order
* createdAt
* updatedAt
* deletedAt?

Subtask

* id
* todoId
* text
* checked
* order

ActivityEvent

* id
* todoId
* type
* data/summary
* createdAt

ColorLabel

* id
* name?
* color
* custom
* order

Settings

LayoutState

A database legyen normalizált, de ne túlmodellezett.

## 41. Search normalization

Külön utility/module készüljön.

A matching pipeline legyen determinisztikus.

Például:

1. Unicode normalization
2. diacritic removal
3. lowercase
4. whitespace normalization

Írj teszteket magyar szövegekre:

"árvízturo tükörfúrógép"

"ARVIZTURO TUKORFUROGEP"

"Árvízturo"

A fuzzy matcher ne adjon teljesen irreleváns találatokat.

## 42. Performance

Az alkalmazás kis személyes tool, de akár több ezer todo mellett is maradjon gyors.

Target:

* instant list switching
* instant Quick Add
* instant local search
* global search érzésre azonnali
* smooth split pane
* smooth drag & drop

Kerüld a szükségtelen full rerendereket és teljes DB reloadokat.

Nem kell premature optimization, de nyilvánvaló N² UI muveleteket ne építs be.

## 43. Accessibility / usability

Legalább:

* keyboard focus
* sufficient contrast
* readable disabled state
* clear selected state
* tooltips az ambiguus ikonokra
* UI scale
* font size

A fontos funkciók ne legyenek kizárólag ikon alapján érthetok.

## 44. Error handling

Ne használj silent catch-et.

Legalább kezeld:

* DB unavailable
* DB migration failure
* invalid JSON import
* backup failure
* restore failure
* inaccessible file/folder link
* global shortcut registration failure

Global shortcut failure esetén az alkalmazás ettol még induljon el.

Mutass értheto hibát.

## 45. Tests

Legyenek releváns automatikus tesztek.

Kiemelten:

* group max depth = 3
* todo move
* group move
* invalid group depth
* status transition persistence
* archive/restore
* trash/restore
* undo
* pinning
* custom color limit = 12
* search Unicode normalization
* accent-insensitive search
* fuzzy search
* import validation
* serialization roundtrip

Ne írj értelmetlen snapshot-test tömeget csak coverage kedvéért.

## 46. Code quality

TypeScript:

* strict
* no unnecessary `any`
* clear domain types

Rust:

* proper Result/error handling
* no unwrap/expect normál runtime pathokon, ahol hiba reálisan elofordulhat

Tartsd a kódot olvashatónak.

Ne készíts hatalmas god-componenteket.

Ne készíts ugyanakkor több száz apró absztrakciót sem.

## 47. Development documentation

Készíts legalább:

README.md

Tartalmazza:

* app purpose
* development setup
* run
* test
* build
* portable release
* directory layout
* DB location
* backup behavior
* keyboard shortcuts

Továbbá:

docs/ARCHITECTURE.md

Röviden:

* frontend structure
* persistence
* IPC boundary
* state management
* undo design
* search design
* portable storage strategy

## 48. Build scripts

Legyen egyszeru Windows build workflow.

Például:

build.bat

A script:

* install/check dependencies amennyire ésszeru
* run tests
* create release build
* assemble portable output folder

A végén legyen egy egyértelmu portable release könyvtár.

Ne csinálj szükségtelenül komplex packaging rendszert.

## 49. Implementation workflow

Ne próbáld egyetlen óriási lépésben összerakni.

Dolgozz logikus szakaszokban:

### Phase 1

Project skeleton, design integration, database, domain model.

### Phase 2

Lists, groups, basic todo CRUD, Quick Add.

### Phase 3

Tabs, tree, drag & drop, subtasks.

### Phase 4

Todo details, activity log, colors, emoji.

### Phase 5

Pinning, Pinned Todos view, Archive, Trash, Undo.

### Phase 6

Search.

### Phase 7

Split panes and persistent layout.

### Phase 8

Global Quick Add, Windows integration, file/URL handling.

### Phase 9

Scaling, themes, keyboard polish.

### Phase 10

Backup/import/export, hardening, tests, portable release.

Minden phase után legyen muködo állapot.

## 50. Definition of Done

A project akkor tekintheto késznek, ha:

* portable Windows build elkészül,
* alkalmazás elindul installer nélkül,
* adat a portable data könyvtárba kerül,
* Inbox muködik,
* több tab/list létrehozható,
* maximum 3 mélységu group hierarchy muködik,
* Quick Add Enterrel muködik,
* Global Quick Add muködik,
* todo CRUD muködik,
* Open/In Progress/Done/Cancelled muködik,
* subtasks muködnek,
* emoji muködik,
* preset + maximum 12 custom color labels muködnek,
* local pin muködik,
* global pin muködik,
* Pinned Todos nézet muködik,
* drag & drop muködik listák és pane-ek között,
* 1/2/4 pane layout muködik,
* layout restart után visszaáll,
* current/global accent-insensitive fuzzy search muködik,
* Todo Details muködik,
* Activity tab muködik,
* Archive section muködik,
* Trash/Restore muködik,
* Undo muködik,
* Duplicate muködik,
* URL/file/folder linkek muködnek,
* UI scale muködik,
* Todo font size muködik,
* keyboard shortcuts muködnek,
* light/dark/system theme muködik,
* SQLite persistence stabil,
* backup muködik,
* JSON import/export muködik,
* alapveto tesztek lefutnak,
* README elkészült,
* FUTURE.md tartalmazza a Markdown ötletet.

## A termék lényegét ne veszítsd szem elol

Nem az a cél, hogy minél több feature legyen benne.

A cél:

> Munka közben gondolok valamire ? két másodperc alatt felírom ? folytatom a munkát.

A tabbed todo workspace azért fontos, mert külön gondolati kontextusokat tarthatok egyetlen alkalmazásban.

A split-pane rendszer azért fontos, mert idonként több ilyen kontextust akarok egyszerre látni.

Minden más ezt szolgálja.

Ha egy technikai vagy UX döntésnél választani kell:

**az egyszerubb, gyorsabb és kevésbé zavaró megoldást válaszd.**
