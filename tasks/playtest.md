# Blind logic playtest (the brief's gate before submission)

Three people who did not write or read the cases, playing cold on a phone. Nobody helps them during play. One copy of this sheet per player; file the results in `HANDOFF.md` as a dated log entry.

## Setup
- Install the internal-testing build from Google Play (a license tester, so the unlock costs nothing), or a debug build from the Android workflow's `play-debug` artifact.
- Casebook A, a fresh install. Do not explain the rules beyond the in-game "How it works" card.
- Ask the player to think aloud. Note times from the phone's clock.

## Player
- Name or initials:
- Plays puzzle or deduction games (never / sometimes / often):
- Date, phone:

## Per case
Copy this block for each case they reach.

### Case N: (title)
- Started / finished (times):
- Finished? (yes / no / gave up at):
- Threes that did not take ink (the resolution shows the count):
- Where they got stuck (which person, which field, which piece of evidence they were reading):
- Did they guess? Any three they cycled through by trial rather than reasoning (which fields, how many tries):
- Any reading of the evidence that seemed to allow a second answer (quote the line):
- Anything they misread or found unfair:
- Wording, layout or tap problems:

## After play
- Which case was hardest, and why:
- Did the "true or lie" rule feel fair? Did anyone want a "mistaken" category?
- Would they pay to open the other five after the first case?

## Gate
Submission waits until all three players finish at least cases 1 to 3 with no unintended second answer found. Any second answer goes to `tools/validate.js` as a new check before the case is changed.
