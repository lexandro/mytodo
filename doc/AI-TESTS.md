# AI-TESTS — manual AI integration checklist (aiprompt §44)

Automated coverage already exists (218 TS + 37 Rust tests; CDP end-to-end
runs incl. real `claude -p` runs, a resumed two-turn conversation, batch
apply + single-undo, cancel and failure paths — see `doc/progress.md`
AI1–AI8). This checklist covers what only a live user session can verify.
Mark items as they are done.

Prereqs: Claude Code and Codex installed + authenticated; a Git repo and a
plain folder to link (one path with spaces/accents, e.g. `D:\árvíztűrő
tükörfúrógép proj`).

## A — AI Clients

- [ ] A1 Auto Detect finds `claude` and `codex` (versions shown) *(CDP ✓,
      re-check after any CLI update)*
- [ ] A2 Browse… to a WRONG executable (e.g. notepad.exe renamed) → "does
      not appear to be" message, never becomes Detected
- [ ] A3 Test on Claude Code → Detected; Test on Codex → Detected when
      `codex login status` says logged in; log out (`codex logout`) →
      Test → "Installed — not ready" amber message
- [ ] A4 Disable a provider → running with it preferred fails with the
      explicit "disabled" message (no silent fallback to the other one)

## B — Workspaces

- [ ] B1 Link a Git repo → chip shows basename + `git` tag; tooltip shows
      path · type · client
- [ ] B2 Link a generic folder → no git tag; AI actions work the same
- [ ] B3 Rename/delete the linked directory on disk → chip turns ⚠ amber;
      AI panel shows "Workspace not found" + Locate… / Unlink; todos still
      fully usable
- [ ] B4 Locate… to the moved directory → chip recovers, brief + preferred
      client preserved
- [ ] B5 Workspace path with spaces + accents: link + Investigate run works
- [ ] B6 Two lists linked to the SAME directory: starting a run on one
      blocks the other ("Another AI operation…")

## C — Todo actions with Claude Code (linked Git repo)

- [ ] C1 Investigate a real todo → summary/findings make sense; progress
      lines stream ("Reading …")
- [ ] C2 Break into Subtasks → "Proposed Subtasks"; apply two → subtasks
      appear; ONE Ctrl+Z removes both
- [ ] C3 Plan Implementation → plan steps as findings
- [ ] C4 Implement on a SMALL real task → amber "Run — may modify
      workspace"; files actually changed in the repo (check `git diff`);
      todo data unchanged until proposals applied
- [ ] C5 Verify a done todo → 4-value verdict + checks + Apply
      Recommendation applies the status proposal (status changes ONLY then)
- [ ] C6 Cancel mid-run → run ends as Cancelled, stays in history, no
      orphan `claude`/`node` processes in Task Manager
- [ ] C7 Failure: temporarily point the Claude path at a bogus exe → run
      fails with a readable message + Retry + Open AI Clients…

## D — Same with Codex

- [ ] D1 Repeat C1 (Investigate), C2 (Subtasks), C4 (Implement on a small
      task), C6 (Cancel — verify the whole `codex` tree dies) with Codex
      as preferred provider
- [ ] D2 Codex on a NON-git folder works (the runner passes
      --skip-git-repo-check)

## E — Workspace actions

- [ ] E1 Analyze Workspace on a non-code folder (docs/marketing) → sensible
      generic summary/findings
- [ ] E2 Suggest Todos → "Potential Todos" + Add Selected creates them
- [ ] E3 Reconcile on a list with done-but-open todos → mapping rows with
      tones + Suggested Changes; apply a status change
- [ ] E4 Ask Workspace → one question, one answer, no chat thread

## G — Conversations and models

- [ ] G1 ✦ AI opens the panel straight away (no dropdown); the composer is
      focusable and Enter sends, Shift+Enter adds a newline *(CDP ✓)*
- [ ] G2 Ask something, then a follow-up that only a resumed session can
      answer ("what did I just ask?") → correct answer with Claude *(CDP ✓)*
      AND with Codex *(session continuity CDP ✓ — both turns reported the
      same thread id, which only `exec resume` produces; the ANSWER could
      not be checked, OpenAI was 503 during the test — redo when it is up)*
- [ ] G3 Preset task first, then a chat follow-up about its result → the
      answer refers to the preset run (same session)
- [ ] G4 Chat that proposes todo changes → proposals render and Apply
      Selected works from inside the thread
- [ ] G5 Switch the composer to Execute BEFORE the first turn → thread runs
      in execute mode; after the first turn the toggle is locked
- [ ] G6 `+` starts an empty thread; the clock icon lists conversations and
      reopening one continues it *(CDP ✓ — a thread created before an app
      RESTART was reopened from history and the next turn still recalled
      both earlier messages; pre-v3 rows list as single-turn threads)*
- [ ] G7 Model picker: pick Sonnet/Haiku → the turn header shows it; type a
      custom name → used verbatim; garbage like `--foo` is refused
- [ ] G8 Codex with a non-default model (`openai/terra`) answers, and a
      resumed Codex turn still runs read-only (no file writes in a
      read-only thread) *(argv verified against the real CLI: `codex exec
      resume -c sandbox_mode="read-only" --json --skip-git-repo-check -m
      openai/terra <id> -` parses and loads the session; the answer itself
      is pending the OpenAI outage)*
- [ ] G9 Provider trouble mid-run (unplug the network / an outage): the
      retry lines show as progress, the turn ends Failed with the provider's
      message, and Show details lists the log *(CDP ✓ during the 503)*

## F — App behavior around runs

- [ ] F1 Close the panel during a run → work continues; completion toast;
      run reopens from history with the full result
- [ ] F2 Switch tabs/panes + Quick Add + search during a run → no lag, no
      lost run (split-pane: start from pane 1, work in pane 2)
- [ ] F3 Narrow the window below ~1250 px effective width → opening the
      detail panel closes the AI panel and vice versa; ≥1250 px they
      coexist
- [ ] F4 Kill the app mid-run → relaunch: the run shows as Failed
      ("Interrupted…"), nothing corrupted
- [ ] F5 Restart with AI configured → startup feels unchanged (no
      detection delay); with NO client installed the app is fully usable,
      AI surfaces show quiet CTAs only

Results / notes:

| Item | Date | Result |
| --- | --- | --- |
