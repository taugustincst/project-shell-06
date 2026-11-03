# Evaluation — Shell 06: The 9:15 to Blackpool

**Repo:** `~/workspace/shell-repos/project-shell-06` (`taugustincst/project-shell-06`), HEAD `3850ba9`
**Build under review:** v1.0.0 DRAFT (single build commit `a09a3d4`, merged to `main` 2026-11-03)
**Brief:** HANDOFF.md in-repo (casebook deduction, confirm-in-threes, solver-gated, 6 cases + meta-culprit, $3.99 paid, mandatory blind playtest)
**Evaluator method:** read the brief and all source; ran the repo's own validator, unit tests, and Playwright smoke test; hand-traced Case 1 end to end.

## Scores

| Dimension | Score /10 |
|---|---|
| Brief compliance | 8 |
| Deduction design | 9 |
| Case content quality | 9 |
| Polish / presentation | 8 |
| UX / accessibility | 8 |
| Technical quality | 9 |
| Store readiness | 5 |
| **Overall** | **8** |

**Verdict: ship after fixes** — the game itself is essentially done and provably airtight; the remaining work is the brief's own gating process (blind playtest) plus packaging (screenshots set, Android wrapper), not game rework.

---

## Verification results (verbatim)

### Solver / validator — `node tools/validate.js` → exit 0, "ALL CASES AIRTIGHT"

For **every** case the validator proves: (1) the authored solution satisfies every formal constraint; (2) exhaustive search (capped at 3) finds **exactly one** solution; (3) constraint propagation alone — no branching, no guessing — reaches the full solution, and it agrees with the authored solution; (4) option-count floors; (5) per-item redundancy report.

| Case | Figures | Evidence | Entries | Unique | Pure deduction |
|---|---|---|---|---|---|
| 1 · The 9:15 to Blackpool (train) | 8 | 15 | 24 | ✅ | ✅ |
| 2 · The Fête at Little Eccleston | 9 | 16 | 27 | ✅ | ✅ |
| 3 · The Grace Dieu in Fog (trawler) | 8 | 14 | 24 | ✅ | ✅ |
| 4 · New Year at the Imperial (hotel) | 10 | 19 | 30 | ✅ | ✅ |
| 5 · The Circus Special at Carnforth | 10 | 17 | 30 | ✅ | ✅ |
| 6 · The 9:15, a Year On (finale) | 10 | 16 | 30 | ✅ | ✅ |

Totals match the builder's claim: 55 figures, 97 evidence items, 165 entries. Redundant-for-deduction items per case: 5 / 3 / 5 / 7 / 3 / 5 — corroborating evidence that adds texture and cross-checks without being load-bearing. That is good design (real casebooks have redundancy), and the validator reports it transparently rather than hiding it. Case 4 is the most corroborative (7 of 19), consistent with the builder's own plan for a difficulty pass on cases 4–6 after playtest.

### Engine unit tests — `node tests/engine.test.js` → "ALL 7 PASSED"

Including: "three right entries take ink together; anything else stays pencil and says nothing"; "a liar's claims are all false, a truthful person's all true"; sanitizer drops wrong ink / unknown figures / bad options and caps pencils at three; contradictory evidence is reported, not crashed on.

### Smoke test — `node tests/smoke.js` → "ALL PASSED" (19 checks)

Not installed in the repo checkout (devDependency only), so I ran it with a scratch Playwright 1.64.1 in /tmp plus the Chromium build already on this machine; the repo was not modified. It exercises the real UI over file://: six-case shelf with finale locked, evidence reader paging (15 items, case 1), pencil meter, **one-wrong triple stays pencil silently**, fourth pencil refused with toast, three right entries ink together, inked fields lock, progress on the shelf, ink + notes survive reload, casebook B is a clean slate, completed case shows resolution + thread, finale unlocks after five cases, three classes of mangled save still load, zero page/console errors. CI (`.github/workflows/ci.yml`) runs validator + unit + smoke on non-main pushes/PRs.

---

## Audit against the brief

**Cases as data — full compliance.** All six brief-mandated settings exist as pure data in `js/cases.js`, loaded by one engine; authoring touches no engine code: (1) the 9:15 night train at Preston, (2) the Little Eccleston village fête, (3) the trawler *Grace Dieu* in fog, (4) the Imperial Hotel on New Year's Eve, (5) the circus special at Carnforth, (6) the 9:15 again, a year on. Casts are 8–10 figures (brief: 8–12). Each case carries cast with player-facing handles/descriptions, timeline framing in the brief, evidence in three kinds (document / object / statement), a resolution scene, and a thread beat.

**Meta-thread — present and lands.** The missing left little finger recurs in every case: Crane's paymaster described by his hands (C1); the fête's unsigned typed letter and a cutting underlined "by a left hand" (C2); Dunne's glove-off money-count (C3); the typed list of six dates with a left-handed tick (C4); Rye's ledger addressed to "Mr L.", who "will attend in person this time" (C5); and the finale, where Lathom is caught — plus returning faces (Pym, Foulkes, Haslam, Edie, the boy) aged a year. The finale is locked until the first five cases are in ink *per casebook slot*, so the thread can't be skipped.

**Set-of-three validator — genuinely blocks per-field brute force, with one honest caveat.** `setPencil` caps the book at three pencils globally; `check` fires only at exactly three, compares the triple against the solution, inks all three on success and says **nothing** on failure (no partial feedback of any kind). Inked fields lock. There is no per-field tick anywhere in the UI — the book grid shows only blank/pencil/ink state. Caveat: with two *certain* entries in pencil, a player can cycle the third field through its options until ink lands (≤10 tries for a name, only 3 for a verdict; checks are unlimited and the `checks` counter is never surfaced as a cost). The same leak exists in Obra Dinn, and it still requires two genuinely deduced entries to exploit — but the store copy's "Brute force cannot converge" is, strictly, overstated. Minor.

**"Mistaken" statements — brief deviation (minor).** The brief (§1.2) calls for statements that are "true, mistaken, or lies". The build implements a stricter binary: a truthful person's **every** claim is true; a liar's **every** claim is false; the culprit is a liar. This is uniform, learnable, disclosed in the store copy, and it's what makes the propagation proof possible — but there is no "honestly mistaken" texture, and some verdict deductions hinge on one false sub-claim flipping a whole statement. It plays fair because the rule never varies; it is still a deviation from the brief as written.

**Evidence browser + casebook UX — good.** Tabs (Brief / Evidence / People / Book / Notes); evidence reader with prev/next paging and kind labels; person sheet jumps straight to that person's statement; the Book grid is a proper one-screen overview with per-entry state glyphs (✒/✎/·) also mirrored in the People list; free-text notes (4,000 chars) persist per case. Progress ("N of 24 entries in ink") is shown on the brief.

**Saves — strong, one gap.** localStorage under versioned key `blackpool.v1` with a corruption backup key; `sanitizeBook` re-validates every loaded entry against the case data *and the solution* (wrong ink is dropped — a tampered or drifted save can never fake progress), caps pencils at 3, clamps counters, truncates notes; the profile loader sanitizes all three slots and rebuilds done-flags; three mangled-save classes pass the smoke test. **Gap:** three casebook slots (A/B/C) exist as briefed, but there is **no per-case restart** — clearing is whole-casebook only ("Start this casebook again" wipes every case in that slot). The brief explicitly predicted players "WILL want to restart a case cleanly"; wiping a whole book to redo one case is real friction.

**Test API — full compliance.** `window.__blackpool` exposes loadCase/closeCase/setTab/set/fillInk/solveAll/deduce/save/reset plus live book/case/profile getters — everything the smoke test and screenshot staging need.

**Offline / purity — full compliance.** Repo total 344 KB (brief cap 3 MB). No analytics, no accounts, no ads anywhere. The only `fetch(` in the codebase is the service worker's same-origin cache refresh; SW registration is skipped on `file://`. PWA manifest + icons + privacy.html (accurate: no collection, local storage only, GitHub Pages delivery disclosed) all present.

**Blind playtest — NOT DONE, and the repo says so.** No playtest evidence anywhere in the repo. `tasks/todo.md`: "Not done here (needs people): the brief's mandatory blind logic playtest by three non-authors; Android TWA wrapper; Play Console setup." HANDOFF logs the same as a FOR TJ gate. The brief makes this mandatory before submission — correctly treated by the builder as a blocker, and it remains the single biggest open item.

---

## Spot-check: Case 1 traced by hand

I solved "The 9:15 to Blackpool" from the evidence alone, without reading the solution fields first:

- **Names fall from documents, not guesses:** the manifest names Dell, Ashworth and Pym outright; luggage labels name Foulkes (sample case), Crane (L.C. on the cricket bag) and Haslam (hatbox). The manifest's gendered exclusions then force the young man = Jack Tomlinson and the young woman = Edie.
- **Places:** the guard's journal fixes Pym and the boy in the van; the tea-trolley book puts Haslam on the platform; the defects book puts Dell in B (flickering lamp); the inspector puts Foulkes in the corridor for the whole stop; the booking register's "named" stub chain puts **Crane in Compartment C** — and the inspector's note says the thief was inside C. Culprit = Crane follows from documents alone.
- **The verdicts need real inference, which is the good part:** Edie's statement claims she never left A *and* that Crane was in B. The second claim contradicts the register, so — under the game's uniform rule — Edie is a liar, which flips her first claim too and places her in the corridor, exactly as her husband (whose own claims all check out) said. Crane's statement (himself in A, Dell never left C) is false on both counts. Every step is forced; at no point did I need to guess and check.

Verdict on the spot-check: **genuinely deducible, with at least one satisfying multi-step verdict chain.** The propagation solver independently reaching the identical full solution confirms this isn't just my reading.

Minor narrative nit found while tracing the full book: case dates run Oct 1934 → Jun 1935 → Feb 1935 → Dec 1934 → May 1935 → Oct 1935 — non-chronological across the shelf. The meta-thread is thematic rather than calendrical, so nothing breaks, but this audience notices dates.

---

## Top defects

1. **Blind playtest missing (gating).** The brief's mandatory pre-submission gate — three non-authors playing cold, stuck points and unintended paths logged — has zero evidence in the repo. The validator proves the logic, not the reading experience; cases 4–6 in particular have never been read cold. The builder flags this honestly (FOR TJ), but nothing ships until it happens.
2. **Packaging incomplete.** Store pack is copy-only: `store/listing.md` is complete and rules-compliant (features-only short description at 73/80 chars, content captions, honest IARC notes, $3.99 in Console only), and one staged screenshot exists (`icons/screenshot-portrait.png`), but the four captioned screenshots aren't all produced, and there is no Android/TWA wrapper yet — the Play deliverable doesn't exist as an artifact.
3. **No per-case restart.** Three casebook slots exist, but restarting a single case means wiping an entire casebook slot. The brief called this exact need out in advance.

Further minors: the probe leak vs "brute force cannot converge" copy (see above); the collapsed "mistaken" category; solutions ship in readable plaintext inside `cases.js` (normal for a static web game, but a determined cheater needs no skill); non-chronological case dates.

## Bottom line

This is the strongest kind of draft: the hard part — six fair, unique, purely-deducible cases with a working meta-thread and an engine where *the same code* validates the cases and confirms the player's book — is done and independently verified. What's left is process and packaging, all of it already itemised in the repo's own handoff. **Overall 8/10 — ship after fixes** (blind playtest, screenshot set, Android wrapper, ideally per-case restart).
