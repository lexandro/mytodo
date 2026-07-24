# FUTURE — backlog, NEM a jelenlegi verzióba

## Minimal Markdown support

Egy jövőbeli verzió opcionálisan minimális Markdown-renderelést kaphat a todo
**title** és **description** mezőkben (félkövér/dőlt/inline kód, esetleg
listák). Most szigorúan plain text. Az adatmodell ezt már nem nehezíti: a
title/description nyers szövegként tárolódik, migráció nélkül bővíthető.
(Az URL/Windows-path auto-link a descriptionben már most is él — az nem
Markdown.)

## A design package további halasztott tételei

- **Group drag-reorder** — v1-ben a listák és todo-k drag-elhetők; a group
  sorok húzása (parenten belüli reorder + re-nest a 3 szintes cap-pel) az
  első follow-up.
- **Resizable split dividerek** — v1 fix 1fr trackeket használ; húzható
  panel-osztók perzisztált arányokkal később jöhetnek.
- **Alt-menü accelerátorok** — a menüsáv Alt+F/E/V/G/H gyorsbillentyűi.

## Tudatosan SOHA (termék-döntés, daprompt §37)

kanban / gantt / naptár, határidők és emlékeztetők, kollaboráció / felhő /
account, AI, integrációk, dashboardok, pluginok, priority-rendszer.
