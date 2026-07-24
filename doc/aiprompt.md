# IMPLEMENTATION – AI Workspace Integration V1

> Original Hungarian functional prompt for the AI Workspace Integration,
> kept verbatim as a historical input (like `daprompt.md` and `shortcut.md`).
> Received 2026-07-24 together with the updated design package
> (`assets/prototype/design_handoff_mytodo/`, incl. `AI_INTEGRATION.md`).

Implementáld a meglévő Todo Workspace alkalmazásba az **AI Workspace Integration V1** funkciókat.

Ez egy már fejlesztés alatt álló alkalmazás.

NE készíts új projectet.

NE írj újra működő részeket indokolatlanul.

Az új feature-öket integráld a jelenlegi architecture-be és UI-ba.

---

# 1. Előkészítés

Mielőtt kódolsz:

1. olvasd el a teljes jelenlegi repository struktúrát;
2. értsd meg a meglévő architecture-t;
3. keresd meg és olvasd el az eredeti Todo Workspace functional specificationt;
4. keresd meg az UPDATE-ELT design package-et;
5. dolgozd fel a design összes releváns dokumentumát és assetjét;
6. keresd meg a repository meglévő future/backlog/roadmap Markdown dokumentumát.

A functional requirements forrása ez a prompt.

A visual/interaction source of truth az új design package.

A meglévő működő architecture-t evolváld, ne cseréld le szükségtelenül.

---

# 2. Product boundary

Az alkalmazás továbbra is:

* todo workspace,
* developer/work scratchpad,
* local-first desktop tool.

Nem:

* AI IDE,
* chatbot,
* autonomous project manager,
* Jira replacement.

Az új kapcsolat:

Todo List
↕
Linked Workspace Directory
↕
Claude Code / Codex

Az AI mindig explicit user actionből indul.

V1-ben nincs background AI.

---

# 3. Linked Workspace

Minden WorkspaceList / TodoList opcionálisan pontosan egy primary directoryt tárolhat.

Ez lehet:

* Git repository,
* source-code directory,
* marketing project,
* documentation directory,
* bármilyen generic directory.

A domain modell támogassa legalább:

* workspace path
* detected workspace type
* optional AI Brief
* optional preferred provider

Workspace type:

* Git
* Generic

Git felismerés automatikus lehet.

A Git NEM requirement az AI használatához.

---

# 4. Workspace validation

Link Workspace során:

* directory picker,
* path validation,
* directory existence,
* readable directory check,
* Git detection.

Ha később a könyvtár eltűnik:

a todo-lista továbbra is működjön.

Az AI action legyen unavailable és jelezze:

Workspace not found.

Legyen:

* Locate...
* Unlink

---

# 5. AI Brief

Workspace-enként opcionális plain-text AI Brief.

Ez minden workspace AI run contextjéhez hozzáadható.

Példa:

This is a small personal application.
Prefer simple implementations.
Do not modify deployment configuration.
Bun is used instead of npm.

Az app NE írja át és NE szinkronizálja:

* CLAUDE.md
* AGENTS.md
* provider-native configuration files.

A CLI a linked workspace directoryból fusson working directoryként, így a provider saját project context mechanizmusa természetesen működhet.

---

# 6. Provider architecture

Készíts provider-independent abstractiont.

Logikailag például:

AgentProvider

* id
* displayName
* detect()
* validateExecutable()
* getVersion()
* capabilities()
* run()
* cancel()
* resume(), ha támogatott

Implementáció:

ClaudeCodeProvider

CodexProvider

A UI és a domain NE parse-oljon közvetlenül Claude vagy Codex stdoutot.

Ez az adapter feladata.

---

# 7. V1 transport strategy

V1-ben lokális CLI integrationt használj.

## Claude Code

Használd a telepített Claude Code programozható/headless CLI képességeit.

A telepített verzió függvényében használható lehet például:

* headless/print mode,
* JSON output,
* streaming JSON output,
* permission modes,
* allowed/disallowed tools,
* session resume.

NE feltételezd vakon, hogy minden telepített verzió pontosan ugyanazokat a flag-eket támogatja.

## Codex

V1-ben használd a lokálisan telepített Codex CLI headless/exec/structured output képességeit.

A provider boundaryt úgy készítsd el, hogy később a CLI implementation lecserélhető legyen például:

CodexAppServerProvider

adapterre anélkül, hogy az UI/domain jelentős részét újra kellene írni.

---

# 8. Capability/version detection

AI Client Settings megnyitásakor vagy explicit detection esetén:

1. keresd meg a commandot Windows PATH alapján;
2. validáld executable-ként;
3. kérdezd le a verziót rövid timeouttal;
4. ha szükséges, vizsgáld meg a támogatott CLI capabilityket;
5. tárold a validált konfigurációt.

A ténylegesen telepített CLI verzió legyen a source of truth.

Ne építs törékeny implementationt egyetlen fix Claude/Codex verzió feltételezésére.

---

# 9. AI Client auto detection

Windows alatt próbáld automatikusan megtalálni:

* claude
* codex

executables.

Elsődlegesen normál:

* PATH,
* Windows command resolution

alapján dolgozz.

Ha nem található:

a user manuálisan Browse... segítségével kiválaszthatja.

Ne scan-elj kontrollálatlanul teljes meghajtókat executable után.

---

# 10. AI Client Settings

Implementáld az updated design package alapján.

Providerenként:

* Enabled
* Auto Detect
* Executable Path
* Browse
* Version
* Status
* Test

Global:

Default AI Client.

Workspace szinten:

optional preferred provider.

A preferred provider hiányában global default.

Ha az adott provider nem elérhető:

fallbackot NE válassz csendben.

Kérd meg a usert provider választásra vagy konfigurációra.

---

# 11. Authentication

A Todo Workspace:

NE kérjen Claude API keyt.

NE kérjen OpenAI API keyt.

NE tároljon provider credentialt.

A telepített CLI saját authentication mechanizmusát használja.

A Test funkció lehetőség szerint különböztesse meg:

* executable missing
* invalid executable
* executable works
* provider/authentication readiness problem

Ne implementálj saját provider login flow-t.

---

# 12. Provider executable manual selection

Manual executable esetén validáld:

* path exists
* regular file
* executable indítható
* expected provider identity
* version command succeeds
* timeout kezelve

Egy tetszőleges executable kiválasztása ne váljon automatikusan:

"Claude Code detected"

vagy:

"Codex detected"

állapottá.

---

# 13. Process execution

Minden AI run child processként vagy provider adapter által menedzselt lokális processként fusson.

Working directory:

a linked workspace directory.

Követelmények:

* asynchronous
* stdout/stderr non-blocking
* streaming
* cancellation
* exit-code handling
* process cleanup
* no UI freeze

Windows alatt ne villogjon fel fölösleges console window.

---

# 14. CLI security

Ne adj a frontendnek általános arbitrary process execution lehetőséget.

A Tauri/Rust boundary csak explicit provider operationöket engedjen.

Ne készíts ilyen generic IPC-t:

run_any_command(command: string)

A backend validálja:

* provider executable
* working directory
* action
* execution mode

Command argumenteket strukturált process API-val adj át.

Kerüld:

cmd.exe /c "<assembled user text>"

jellegű string command constructiont.

Figyelj:

* shell injection
* quoting
* path with spaces
* Unicode path

esetekre.

---

# 15. AI execution modes

Implementálj három semantic mode-ot:

Analyze

Plan

Execute

## Analyze

Read-only.

Az agent vizsgálhatja a workspace-t, de nem módosíthatja.

## Plan

Read-only.

Konkrét implementation plan és todo proposals készíthetők.

## Execute

Workspace modification allowed.

A provider adapter fordítsa le ezt az adott CLI megfelelő permission/sandbox konfigurációjára.

NE használj automatikusan:

dangerously-skip-permissions

vagy más teljes permission bypass módot.

Ha egy provider/version nem képes biztonságosan read-only módot biztosítani:

ezt capabilityként kezeld és válassz biztonságos fallbacket.

---

# 16. Todo-level AI actions

Implementáld:

## Investigate

Default mode:

Analyze

Input:

* selected Todo
* workspace context

Cél:

a feladathoz/problémához kapcsolódó elemzés.

Workspace modification nélkül.

---

## Break into Subtasks

Mode:

Analyze vagy Plan.

Cél:

strukturált subtask proposal készítése.

Nem alkalmaz automatikusan semmit.

---

## Plan Implementation

Mode:

Plan

Cél:

konkrét implementation plan.

Workspace modification nélkül.

---

## Implement

Mode:

Execute

Cél:

a todo tényleges megvalósítása a linked workspace-ben.

Az AI módosíthat fájlokat és használhatja a szükséges workspace toolokat a provider permission modellje szerint.

---

## Verify

Mode:

Analyze

Cél:

bizonyíték alapján eldönteni, hogy a todo:

* complete
* incomplete
* partially complete
* uncertain

Lehetőség szerint vizsgálhatja:

* implementációt
* teszteket
* Git állapotot
* releváns dokumentációt

és javaslatot adhat a Todo státuszára.

A Todo státusz NEM változik automatikusan.

---

# 17. Workspace-level AI actions

Implementáld:

## Analyze Workspace

Read-only általános workspace elemzés.

## Suggest Todos

Workspace alapján Todo proposalok.

## Reconcile Todos ↔ Workspace

A todo-lista és a workspace együttes elemzése.

Javasolhat:

* status change
* new todo
* new subtask
* update
* archive

de semmit nem alkalmaz automatikusan.

## Ask Workspace

Egy egyszeri szabad szöveges read-only kérdés.

V1-ben ne építs multi-turn chatbotot köré.

---

# 18. Context Builder

Készíts külön domain/service modult:

AIContextBuilder

Feladata a run context összeállítása.

Az action függvényében tartalmazhatja:

* action definition
* execution mode
* workspace metadata
* workspace AI Brief
* selected todo
* todo description
* subtasks
* relevant activity summary
* list/group context
* szükség esetén current todo-list snapshot

NE küldd automatikusan az egész Todo adatbázist minden runhoz.

---

# 19. Native project instructions

A workspace saját provider-native instrukcióit ne másold a Todo DB-be.

Ne módosítsd őket.

Ne próbáld saját parserrel összeolvasztani őket.

A provider CLI a workspace megfelelő working directoryjából fusson, és a saját natív context/instruction mechanizmusát használja.

---

# 20. AI Run domain model

Adj domain/entity támogatást AI runokhoz.

Minimum:

AIRun

* id
* provider
* action
* mode
* workspace/list id
* optional todo id
* startedAt
* finishedAt
* status
* optional provider session/thread id
* context/prompt audit summary
* final human-readable result
* error
* proposed actions
* optional provider metadata

Status például:

* pending
* running
* completed
* failed
* cancelled

---

# 21. AI run persistence

Completed, failed és cancelled runok maradjanak visszanézhetők.

Ne tárolj korlátlan méretű teljes raw terminal outputot az SQLite-ban.

A normál UI számára elegendő:

* summary
* result
* meaningful progress/events
* proposals
* provider metadata

Ha részletes log megőrzése szükséges:

használj limitált vagy külön log storage-t.

---

# 22. Streaming

A provider outputot streameld a UI felé.

A user tömör progress információt lásson.

Például:

Reading auth/session.ts

Inspecting tests

Running tests

Analyzing implementation

Ne dumpolj automatikusan raw JSON event streamet.

Lehessen:

Show Details

nézet a részletesebb technikai outputhoz.

---

# 23. Structured provider result

A provider-independent eredmény legyen valami ehhez hasonló:

AgentRunResult

* summary
* findings
* recommendation
* proposedTodoActions
* providerMetadata

A konkrét schema kialakítását igazítsd a meglévő domain architecture-höz.

---

# 24. Structured output strategy

A CLI-k képességei verziónként változhatnak.

Preferáld sorrendben:

1. provider által támogatott structured/schema output
2. stabil JSON event output
3. kontrollált fallback result envelope

A provider adapter normalizálja a végeredményt.

A domain/UI NE függjön Claude vagy Codex saját JSON event schema-jától.

Ismeretlen extra event type ne crashelje az alkalmazást.

---

# 25. Proposed Todo Actions

V1-ben támogass legalább:

* CreateTodo
* UpdateTodo
* ChangeTodoStatus
* AddSubtask
* UpdateSubtask
* MoveTodoToGroup
* ArchiveTodo

A proposal model legyen strongly typed.

Az AI SOHA ne adhasson:

* raw SQL
* arbitrary DB command
* arbitrary domain command string

műveletet.

---

# 26. Todo database marad a source of truth

Az AI SOHA ne kapjon közvetlen SQLite hozzáférést.

Nem:

AI
→ UPDATE todos

Hanem:

AI
→ structured proposed actions
→ parser
→ domain validation
→ user review
→ Apply Selected
→ normal Todo domain command
→ SQLite
→ activity log
→ undo

Ez kötelező architectural boundary.

---

# 27. Proposal validation

Minden proposal:

AI
→ parse
→ validation
→ UI review
→ apply

Ugyanazokat a domain szabályokat használja, mint manuális action esetén.

Például:

* group depth maximum 3
* valid status
* valid IDs
* valid target list/group
* archive semantics
* custom color rules
* activity log
* undo

Invalid proposal:

NE hajtódjon végre.

Jelenjen meg érthető hiba.

---

# 28. Review requirement

V1-ben minden AI-origin Todo mutation review-köteles.

Sem:

* Suggest Todos
* Reconcile
* Verify
* Investigate
* Plan
* Implement

ne változtassa automatikusan a Todo DB-t.

Fontos:

**Execute mode kizárólag a LINKED WORKSPACE módosítására jogosítja az agentet.**

A Todo Workspace saját adatainak módosítása továbbra is:

proposal → review → apply.

---

# 29. Apply Selected

A design alapján implementálj proposal selection UI-t.

A user:

* egyenként kiválaszthat,
* mindet kiválaszthat,
* kihagyhat.

Apply Selected:

lehetőleg egyetlen undoable logical operation group legyen.

Például öt AI proposal egyszerre alkalmazva:

Ctrl+Z

ésszerűen vissza tudja vonni a batch műveletet.

---

# 30. Activity Log integration

Kapcsolódó Todo Activity Logba csak magas szintű események kerüljenek.

Például:

AI Investigate started

AI Investigate completed

AI Implement completed

AI Verify completed

Added subtask from AI proposal

Status changed from AI proposal

A teljes AI response ne kerüljön Activity Logba.

Az activity event hivatkozhasson AIRun ID-ra.

---

# 31. Todo Details AI tab

A meglévő:

Details | Activity

nézetet az updated design szerint bővítsd:

Details | Activity | AI

Az AI tab tartalmazza:

* Todo-level AI actions
* recent AI runs
* selected AI run result
* proposals

---

# 32. Workspace AI panel

Lista-szintű actionök ugyanazt az AI Run infrastruktúrát használják.

Ne készíts külön AI engine-t Todo és Workspace szintre.

A különbség csak:

* action
* context
* result type.

---

# 33. Cancellation

A user bármikor:

Cancel

A provider adapter próbálja kulturáltan leállítani a processt.

Preferált:

graceful termination

majd szükség esetén timeout után forced termination.

A Cancelled run maradjon historyban.

---

# 34. Concurrency

V1-ben tartsd egyszerűen.

Ugyanazon workspace-en alapból maximum egy Execute run fusson egyszerre.

Ha másik Execute indulna:

`Another AI operation is already running for this workspace.`

Read-only concurrency csak akkor legyen, ha egyszerűen és stabilan implementálható.

Ne építs általános job scheduler rendszert.

---

# 35. Provider session/thread IDs

Ha Claude Code vagy Codex resumable session/thread identifier-t ad vissza:

tárold az AIRun mellett.

V1-ben nem kell teljes conversation manager.

Az AgentProvider abstraction azonban ne dobja el ezt az információt.

---

# 36. Git awareness

Ha a linked workspace Git repository:

az AI természetesen használhat:

* Git status
* diff
* history
* current changes

információkat a provider capabilityk szerint.

A Todo Workspace maga NE váljon Git klienssé.

NE készíts:

* branch managementet
* commit UI-t
* Git dashboardot

csak ezért.

Execute után opcionálisan megjeleníthető:

* changed files count
* concise change summary

ha ez megbízhatóan rendelkezésre áll.

Ez ne legyen V1 blocker.

---

# 37. AI Client Test

A Test action lehetőleg ellenőrizze:

1. executable elindul,
2. verzió lekérhető,
3. provider nagyjából működőképes,
4. authentication/readiness megfelelő-e.

A Test NE hajtson végre valódi workspace modificationt.

---

# 38. AI nélkül is teljes értékű app

Ha:

* egyik kliens sincs telepítve,
* AI le van tiltva,
* workspace nincs linkelve,

a teljes Todo Workspace továbbra is működjön.

Az AI integráció nem lehet mandatory dependency.

---

# 39. Split Pane compatibility

Az AI action mindig ahhoz a TodoPane contexthez kötődjön, ahonnan indították.

A run közben:

* a user használhassa tovább az appot,
* válthasson másik tabra,
* használhasson másik pane-t.

A futás ne vesszen el.

A result később visszanyitható.

---

# 40. Quick workflow performance

Az AI integration NE lassítsa és NE bonyolítsa:

* Quick Add
* tab switching
* search
* split panes
* drag & drop
* keyboard navigation
* normal startup

workflow-kat.

AI provider detectiont se futtass szükségtelenül minden UI műveletnél.

---

# 41. Portable behavior

A linked workspace config és AI client executable configuration a Todo Workspace portable settingsében tárolódjon.

Credential NEM.

Másik gépre átmásoláskor:

* workspace path invalid lehet,
* executable path invalid lehet.

Ezt graceful módon kezeld.

Auto Detect újra futtatható legyen.

---

# 42. Error handling

Kezeld legalább:

* CLI missing
* invalid executable
* CLI version detection failure
* authentication/readiness failure
* workspace missing
* workspace inaccessible
* provider process crash
* timeout
* malformed structured result
* proposal validation failure
* cancellation
* permission failure

Ne használj silent catch-et.

Az AI hiba ne sértse meg a Todo adatbázist.

---

# 43. Tests

Adj releváns unit/integration teszteket legalább:

* workspace linking
* workspace missing state
* Git detection
* provider selection
* preferred provider fallback logic
* executable validation
* capability mapping
* AI context generation
* proposal parsing
* unknown provider event handling
* invalid proposal rejection
* ChangeStatus proposal
* CreateTodo proposal
* AddSubtask proposal
* MoveTodo proposal
* group depth validation AI proposalnál
* proposal batch apply
* undo after proposal batch apply
* cancelled run state
* failed run state
* Execute concurrency restriction

Provider process executiont mockolható adapter mögé tedd.

---

# 44. Manual integration tests

Dokumentálj manuális teszteket.

## Claude Code

* Auto Detect
* Manual Path
* Test
* Investigate
* Plan
* Implement
* Verify
* Cancellation
* Failure

## Codex

Ugyanez.

## Workspace

* Generic directory
* Git repository
* directory deleted after linking
* directory relocated
* workspace with spaces/Unicode in path

## AI actions

* Investigate
* Break into Subtasks
* Plan Implementation
* Implement
* Verify
* Analyze Workspace
* Suggest Todos
* Reconcile
* Ask Workspace

---

# 45. Existing future/backlog document

Nagyon fontos.

KERESD MEG a repository MÁR LÉTEZŐ future/backlog/roadmap Markdown fájlját vagy az erre szolgáló dokumentációs szekciót.

Keress többek között:

* FUTURE.md
* ROADMAP.md
* BACKLOG.md
* TODO.md
* docs/**/*.md
* "Future"
* "Roadmap"
* "Later"
* "Planned"
* "Backlog"

NE hozz létre új párhuzamos future dokumentumot, ha már létezik megfelelő.

A meglévő tartalmat NE írd felül.

Egészítsd ki az alábbi deferred AI feature-ökkel.

---

# 46. Future – Todo Workspace MCP / Agent Tools

MOST NE implementáld.

Később a Todo Workspace adhasson kontrollált agent tool interface-t.

Például:

* list_todos
* get_todo
* create_todo
* update_todo
* add_subtask
* add_activity

Ez később lehet MCP vagy más explicit tool protocol.

V1-ben structured proposals vannak helyette.

---

# 47. Future – Trusted AI Actions

MOST NE implementáld.

Később a user explicit trust policy alapján bizonyos AI-origin Todo módosításokat review nélkül engedélyezhessen.

V1-ben minden mutation review-köteles.

---

# 48. Future – Background / Scheduled AI

MOST NE implementáld.

Később opcionálisan:

* workspace analysis
* reconcile
* todo suggestion
* change monitoring

futhat automatikusan.

V1-ben semmilyen background AI nem fut.

---

# 49. Future – Workspace Change Monitoring

MOST NE implementáld.

Később:

* filesystem change
* Git commit
* Git branch change
* más projekt-esemény

indíthat AI workflow-t.

---

# 50. Future – Rich Interactive Agent Sessions

MOST NE implementáld.

Később lehessen hosszabb, resumable workspace-agent beszélgetést folytatni.

V1-ben:

egy action → egy run → egy result.

---

# 51. Future – Codex App Server

MOST NE implementáld.

A provider architecture azonban legyen alkalmas későbbi:

CodexAppServerProvider

bevezetésére.

Ez később használható például:

* bidirectional structured events
* approvals
* richer streaming
* diff events
* thread lifecycle
* interactive execution

célokra.

A V1 CLI adaptert ne úgy írd meg, hogy az UI/domain közvetlenül rá legyen drótozva.

---

# 52. Future – Additional AI Providers

MOST NE implementáld.

Az AgentProvider abstraction később további provider implementációkat is támogathasson.

Ne építs azonban dinamikus plugin rendszert V1-ben.

---

# 53. Future – Multiple Workspace Roots

MOST NE implementáld.

V1:

egy todo-lista → maximum egy primary linked workspace directory.

Később több root is lehetséges lehet.

---

# 54. Future file preservation

A már meglévő future Markdownban található korábbi terveket NE töröld és NE duplikáld.

Különösen őrizd meg, ha már szerepel:

* Markdown support
* due-date/deadline
* más korábbi planned feature

Csak akkor hozz létre:

docs/FUTURE.md

fájlt, ha ténylegesen nincs semmilyen megfelelő meglévő future/backlog dokumentum.

---

# 55. No project-management creep

Az AI feature miatt se adj hozzá:

* sprint
* ticket system
* assignee
* story point
* project dashboard
* AI priority score
* burndown
* automated roadmap generation
* autonomous project manager

funkciókat.

A todo app eredeti egyszerűsége maradjon meg.

---

# 56. No chatbot creep

Ne alakítsd át az alkalmazást ChatGPT-szerű felületté.

V1-ben:

Todo / Workspace action
→ AI Run
→ Result
→ Proposals

Az Ask Workspace is:

egy kérdés
→ egy run
→ egy válasz.

---

# 57. Documentation

Update:

README.md

Adj új:

## AI Workspace Integration

szekciót.

Tartalmazza:

* linked workspace
* AI Brief
* Claude Code setup
* Codex setup
* Auto Detect
* Manual executable path
* Analyze / Plan / Execute
* Todo AI actions
* Workspace AI actions
* proposal review
* security model

Update:

docs/ARCHITECTURE.md

Dokumentáld:

Todo Domain
↕
AI Orchestration
↕
AgentProvider
↙       ↘
Claude   Codex

és:

AI Result
→ Proposed Actions
→ Validation
→ Review
→ Normal Domain Commands

---

# 58. Definition of Done

A feature akkor kész, ha:

* todo-listához directory kapcsolható
* Generic workspace működik
* Git workspace felismerés működik
* AI Brief működik
* Claude Code Auto Detect működik
* Codex Auto Detect működik
* manual executable selection működik
* provider validation/Test működik
* global default provider működik
* workspace preferred provider működik
* AI nélküli Todo app változatlanul működik
* Investigate működik
* Break into Subtasks működik
* Plan Implementation működik
* Implement működik
* Verify működik
* Analyze Workspace működik
* Suggest Todos működik
* Reconcile Todos ↔ Workspace működik
* Ask Workspace működik
* Analyze / Plan / Execute permission model működik
* AI run streamelhető
* AI run Cancel működik
* AI run history persistálódik
* structured proposals működnek
* proposals csak review után kerülnek alkalmazásra
* proposal application Activity Logba kerül
* proposal batch undozható
* AI közvetlenül nem ír Todo SQLite-ba
* missing workspace gracefully kezelve
* missing/broken CLI gracefully kezelve
* updated design implementálva
* releváns tesztek elkészültek
* meglévő future/backlog dokumentum frissítve lett
* MCP NEM lett implementálva
* background AI NEM lett implementálva
* Codex App Server NEM lett implementálva
* autonomous Todo modification NEM lett implementálva

---

# 59. A legfontosabb product rule

Mindig ezt tartsd szem előtt:

A Todo Workspace nem arra szolgál, hogy egy AI önállóan menedzselje a munkámat.

Arra szolgál, hogy én leírjam:

> ezt kell megcsinálni

és ugyanabból a felületből megkérhessek egy agentet:

> nézd meg

> bontsd fel

> tervezd meg

> csináld meg

> ellenőrizd

abban a workspace-ben, amelyhez a feladat tartozik.

Az AI legyen **közreműködő**, ne a Todo Workspace gazdája.

A Todo-lista maradjon a user által kontrollált source of truth.
