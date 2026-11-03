# Lessons (corrections and mistakes, kept so they are not repeated)

- Local network ports are denied in this sandbox: drive Playwright over `file://` and keep tests file-capable.
- CSS `transform` animations override an SVG element's `transform` attribute; wrap animated shapes in a `<g transform>`.
- A `pagehide` save overwrites a corrupt save planted via `localStorage.setItem` before `reload()`; plant it with `addInitScript` in a fresh context instead.
- GitHub Pages must be enabled manually by Tj (Settings → Pages → Source: GitHub Actions); the workflow token cannot create the site. Log it FOR TJ.
- Knights-and-knaves honesty (truthful: all claims true; liar: all claims false) keeps deduction crisp and machine-checkable; a "mistaken" category is not provable from text and was dropped from the formal model.
- Encode in constraints only what the prose actually licenses (e.g. a woman's handle excludes men's names); the validator proves the constraints, not the prose, so keep them honest.
- Another agent (Folder) pushes to these repos concurrently (Pages workflow, placeholder index.html). Before merging: fetch origin main, merge main into the branch (never force-push or reset), keep their workflow and HANDOFF line, make sure the game's index.html wins over any placeholder, then fast-forward main.
