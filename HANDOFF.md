# HANDOFF — project-shell-06 — THE 9:15 TO BLACKPOOL

## Status: ASSIGNED 2026-11-02 — build priority #6 in the roster sequence (writing-heavy; schedule around 02/07's writing loads)

Roster assignment by Folder at Tj's direction, from the 2026-11-02 Google Play niche research. This file is the build brief AND the living handoff. Keep it updated.

## 1. THE GAME — exactly what to make

**Fantasy:** You are the person they hand the impossible casebook to. No interrogation mini-games, no hidden objects — just evidence, a grid, and your own reasoning. Obra Dinn's logic book, rebuilt phone-native as pure 2D data.

**Why this game:** The format's PC successes (Obra Dinn, Case of the Golden Idol) have NO established Android-native premium equivalent — research found none. The neighbouring audience demonstrably exists and pays on phones (Strange Horticulture: 83k installs, 4.8 stars, at $2.50). Supply is effectively zero; the barrier is authorship, not demand.

**Core loop (one case):**
1. A closed setting with a fixed cast (8–12 people), a timeline, and one incident.
2. Evidence browser: passenger manifests, timetables, ticket stubs, luggage tags, interview statements (each person says things that are true, mistaken, or lies — and the categories are learnable).
3. The casebook: for each person you enter identity, location-at-key-times, and relationships/motives in structured fields.
4. Confirmation in SETS OF THREE: the game only validates when three related deductions are all correct (the Obra Dinn rule). No per-field green ticks — brute force cannot converge, real inference can.
5. Case resolution scene once the book is complete; a meta-thread clue links all six cases to one culprit, resolved in the finale.

**Content targets (v1.0):**
- 6 cases: the 9:15 night train; a village fête; a trawler in fog; a grand hotel; a circus train; the finale — the 9:15 again, a year later.
- Each case delivered as DATA (cast, timeline, evidence, solution) loaded by one engine — authoring a case never touches engine code.
- A built-in SOLVER: a script that proves each case has a unique solution reachable by deduction from the given evidence (no guessing-required leaps, no unintended alternate solutions). A case that fails the solver does not ship.

## 2. BUILD SPEC

- Vanilla HTML5/CSS/JS, no framework, no build step. Static files, GitHub Pages deploy from this repo (pattern: taugustincst/bubblepop, taugustincst/ironhold).
- Fully offline. Zero network calls, zero analytics, zero ads, zero accounts.
- Engine scope is deliberately trivial: evidence browser, structured casebook forms, set-of-three validator, progress save. ALL difficulty budget goes to case authorship and testing.
- Saves: localStorage, versioned key, sanitizer on load, fail-soft (Ironhold lesson). Multiple casebook slots (players WILL want to restart a case cleanly).
- Expose a `window.__blackpool` test API (load case, fill entries, query validator) so the solver and screenshot staging are scriptable.
- Portrait-first, large-text option (long reading sessions, older audience), colourblind-safe, no timers anywhere. Typography is the art direction. Under 3 MB.

## 3. MONETIZATION — exact

- Google Play: PAID app, **$3.99** one-time, full six-case book. No in-app purchases, no ads.
- Rationale: finite content, honestly priced. Do NOT price at $6.99 — players finish in 4–6 hours and review value-per-hour; $3.99 with 6 airtight cases is the review-proof point.

## 4. HOW IT SUCCEEDS — the launch playbook

- Store copy sells the method, not the plot: "Deduction, not guessing. Confirmed in threes." Search terms: deduction, mystery, casebook, detective logic. Short description: features only, NEVER price/promo wording (Play flags it — Ironhold lesson).
- Screenshots: real staged casebook/evidence screens via the test API. Shot 1 = a half-filled casebook with three entries awaiting confirmation.
- Declarations: IARC (expect Mild Violence references in text for case themes — answer honestly); audience 13-15 / 16-17 / 18+; Data safety = none collected/shared; privacy policy at this repo's Pages site (privacy.html); contact elderon@augustinnovations.io.
- Process: internal draft → declarations → production → Folder expert review → submission only on Tj's explicit approval.
- MANDATORY blind logic playtest before submission: at least 3 testers who did not author the cases play cold; log every stuck point and every unintended solution path. Stuck-because-unfair = authoring bug, fix the case, not the player.
- Post-launch: reply to every review for 30 days. Deduction players write the best reviews on Play when the logic is airtight — and the worst when it is not.
- SUCCESS TARGETS (90 days): 4,000 paid units; rating at or above 4.6 stars. For this genre, rating IS the marketing.

## 5. BUILD ORDER (5–6 weeks)

- Week 1: Engine + set-of-three validator + case data format.
- Week 2: Case 1 complete + solver proving uniqueness.
- Weeks 3–5: Cases 2–6 as data, solver-gated one by one; meta-thread woven in.
- Week 6: Blind playtest, unintended-solution fixes, store pack, expert review, submission prep.

## 6. COORDINATION RULES

- Tj decides scope, names, spending, submissions, and anything irreversible. Everything else, the working agent owns end to end.
- Log entries dated and appended below, newest last. Items needing Tj are marked FOR TJ.
- Verify live state before asserting. No prices on marketing websites. Passwords/signing keys are Tj's alone, secure forms only, Elderon-pattern keystore handling.

## Log

- **2026-10-29** — Shell created (README.md + this HANDOFF.md). Awaiting project assignment from Tj.
- **2026-11-02** — ASSIGNED: The 9:15 to Blackpool (roster #6). Full build brief installed above by Folder. Build priority #6 in the roster sequence.
- **2026-11-02** — GitHub Pages ENABLED (workflow deploy, standard static workflow added at .github/workflows/pages.yml). Site: https://taugustincst.github.io/project-shell-06/ — until the game is built, this serves the repo files (README/HANDOFF); the shipped game + privacy.html deploy from this same root.
- **2026-11-03** — **v1.0.0 DRAFT BUILT** (branch `ccr-89815447-wojzds`, merged to `main`). Six cases as data (55 figures, 97 evidence items, 165 entries): the 9:15 at Preston, the Little Eccleston fête, the Grace Dieu in fog, New Year at the Imperial, the circus special at Carnforth, and the 9:15 a year on, with the missing-finger thread resolved in the finale. One engine: a constraint-propagation solver that both validates cases and confirms play. The Obra Dinn rule as specified: three entries in pencil, all right take ink together, otherwise silence; no per-field ticks. `tools/validate.js` proves every case unique and solvable by pure deduction (no guessing) and runs in CI; engine unit tests and a Playwright smoke test (file://) all pass locally. Three casebook slots, notes, large-text and high-contrast, no timers, PWA, privacy.html, store copy draft, tasks/todo.md (plan + review) and tasks/lessons.md.
  - **FOR TJ:** (1) GitHub Pages: Folder's workflow enables it; confirm Settings → Pages → Source: GitHub Actions if the first deploy does not appear. (2) Play Console: paid app at $3.99, package name (suggest `com.taugustincst.blackpool`), upload keystore (Elderon pattern, Tj only); contact elderon@augustinnovations.io in privacy.html, confirm. (3) The brief's mandatory blind logic playtest (three non-authors, cold) must happen before any submission; the validator proves the logic, not the reading experience.
  - **Next (agent-owned):** Android TWA project (Ironhold `android/` pattern), store screenshots for all four captions, difficulty pass on cases 4–6 after blind playtest notes, expert review, submission prep.
