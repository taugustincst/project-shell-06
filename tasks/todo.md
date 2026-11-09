# The 9:15 to Blackpool — build plan (v1.0.0 draft)

## Content targets (brief §1)
- [x] 6 cases as data: night train, village fête, trawler in fog, grand hotel, circus train, finale (9:15 a year on)
- [x] Each case: closed setting, 8–12 figures, evidence browser (manifests, timetables, stubs, logs, interviews), casebook fields (identity / location / verdict)
- [x] Statements that are true or lies, learnable (truthful: every claim true; liar: every claim false; culprit is a liar)
- [x] Solver proves each case has exactly one solution and is reachable by pure deduction (tools/validate.js)
- [x] Meta-thread: the man with the missing left little finger across all six, resolved in the finale
- [x] Confirmation in sets of three (the Obra Dinn rule), no per-field ticks
- [x] Resolution scene per case; finale resolves the thread

## Build spec (brief §2)
- [x] Vanilla HTML/CSS/JS, no build step, static files, under 3 MB
- [x] Fully offline: service worker, manifest, icons; zero network calls
- [x] Saves: localStorage, versioned key, sanitizer on load, fail-soft; multiple casebook slots
- [x] `window.__blackpool` test API (load case, fill entries, query validator)
- [x] Portrait-first, large-text option, colourblind-safe, no timers
- [x] privacy.html

## Tests
- [x] tools/validate.js: uniqueness + pure deduction for every case (CI)
- [x] tests/engine.test.js: propagation rules, set-of-three inking, sanitizer
- [x] tests/smoke.js: Playwright over file:// (evidence, casebook, inking, save/reload, corrupt save, case completion)
- [x] CI workflow runs validator + unit + smoke; Pages workflow on main

## Store pack (brief §4)
- [x] store/listing.md: method-first copy, no price/promo wording, declarations checklist
- [x] Staged screenshot via the test API (half-filled casebook with three pencilled entries)
- [x] README, HANDOFF log entry with FOR TJ items

## Review
Built: six cases (55 figures, 97 evidence items, 165 casebook entries), one engine (propagation solver reused for play), shelf with three casebooks, evidence reader, person sheets, book grid, notes, resolution scenes with the thread, PWA shell, privacy page, store copy draft.
Verified locally on 2026-11-03: `node tools/validate.js` → ALL CASES AIRTIGHT (every case unique under search and solved by pure deduction); `node tests/engine.test.js` → ALL 7 PASSED; `node tests/smoke.js` (Playwright over file://) → ALL PASSED (21 checks: shelf, brief, evidence paging, pencil meter, silent wrong triple, fourth-pencil refusal, ink-in-threes, locked fields, reload persistence, slot B clean, resolution + thread, finale unlock after five, three mangled saves, no console errors).
Not done here (needs people): the brief's mandatory blind logic playtest by three non-authors; Android TWA wrapper; Play Console setup.

## v1.1.0 (2026-11-09): free with one unlock
- [x] Play Billing bridge (`PlayBilling.java`, `js/billing.js`), unlock sheet on paid cases and after case 1, Restore purchase
- [x] Restart a single case (Folder P1-2)
- [x] Record of threes that did not take ink at each case's close; store copy no longer overstates (P2-4)
- [x] Case dates in order, hotel weekday corrected (P3-5); validator still airtight
- [x] Toast no longer blocks the person sheet's Done button; blank cells look tappable
- [x] Smoke test covers buy, reload and restore; emulator tap-through in CI; launch on Android 9 and 14
- [x] Store screenshots regenerated; listing, privacy policy and PLAY.md updated for free + unlock
- [x] Playtest template `tasks/playtest.md` (P1-1 prep)
- [ ] Blind logic playtest, three non-authors (Taylor)
- [ ] Merge, upload-key secrets, Console product `full_unlock` at $3.99 (Taylor)
