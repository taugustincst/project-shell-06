# The 9:15 to Blackpool

**A casebook deduction puzzler.** One closed setting per case: a night train, a village fête, a trawler in fog, a grand hotel, a circus special, and the 9:15 again a year on. Manifests, timetables, ticket stubs, logbooks, interviews. You fill the casebook: who is who, who was where, who is lying. The book confirms only in sets of three correct entries, so brute force fails and real inference wins. Six cases. One culprit.

Free on Google Play with the first case to play; one in-app purchase ($3.99) opens the other five. A book you play. No ads, fully offline.

Status: **v1.0.0 draft built 2026-11-03**, not yet submitted. Build brief and the living log are in [HANDOFF.md](HANDOFF.md). Plan and verification in [tasks/todo.md](tasks/todo.md); lessons in [tasks/lessons.md](tasks/lessons.md). Repo rename at ship time (Tj's call).

Owner: Tj (Taylor Augustin) / AugustInnovations LLC.

## The game

- **Six cases as data** (`js/cases.js`): 55 figures, 97 evidence items, 165 casebook entries. Authoring a case never touches engine code.
- **Three fields per person**: identity (from the manifest), location during the incident window, and their word: truthful (every claim true), lying (every claim false), or the culprit (who always lies).
- **The Obra Dinn rule**: three entries in pencil; all right and they take ink together; otherwise the book says nothing, and there are no per-field ticks.
- **The thread**: a man with the left little finger missing to the second joint appears behind every case and is caught in the finale, which opens once the first five are in ink.
- **Three casebooks** (A, B, C) so a case can be restarted clean. Notes per case. Large-text and high-contrast options. No timers.

## Code

| File | What it is |
| --- | --- |
| `js/engine.js` | Constraint-propagation solver (the same code confirms the player's entries), casebook rules, sanitizer. Runs in Node and the browser. |
| `js/cases.js` | The six cases: prose for the player and formal constraints for the solver. |
| `js/game.js` | Shelf, evidence reader, person sheets, book grid, save slots, test API. |
| `tools/validate.js` | Proves every case: authored solution satisfies all evidence, search finds exactly one solution, propagation alone (no guessing) reaches it, and reports redundant evidence. Runs in CI. A case that fails does not ship. |
| `tests/engine.test.js` | Engine unit tests. `tests/smoke.js` is a Playwright smoke test that runs over `file://`. |
| `tools/make-icons.js` | Renders icons and the staged store screenshot. |

```bash
node tools/validate.js      # every case airtight?
node tests/engine.test.js
npm install && node tests/smoke.js
```

### Constraint vocabulary (for authoring)
`is`/`not` (a figure's field), `named` (the figure with a given name has a field value), `truthful`/`liar`, `eq`/`neq`, `says`/`saysnot` (a claim holds exactly when the speaker is truthful), `imp`, `or`, `count` (exactly n figures at a place), `alone`, `culpritwhere`. Every case must pass `tools/validate.js` as *pure deduction* before it is played by anyone.

### Test API
`window.__blackpool`: `loadCase(id)`, `set(p, f, v)`, `fillInk([keys])`, `solveAll()`, `deduce()`, `setTab(name)`, `book`, `profile`, `save()`, `reset()`.

### Saves
`localStorage` key `blackpool.v1`: three casebooks, per-case ink/pencil/notes, settings. Every entry is validated against the case on load (wrong ink is dropped, unknown figures ignored, at most three pencils); an unparseable save is copied to `blackpool.v1.backup` and the game starts fresh.

## Publishing
A free app on Google Play, with a one-time unlock for cases two to six, and the whole game packed inside it (`android/play`, see `PLAY.md`). Pages deploys only the store page from `main` (`site/index.html`, the privacy policy `privacy.html` and the store graphics), not the playable game. Store copy: `store/listing.md`. The brief requires a blind logic playtest by three non-authors before submission.
