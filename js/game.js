/* The 9:15 to Blackpool — UI, save, casebook slots. The deduction logic lives in engine.js; the cases in cases.js. */
(function () {
'use strict';
const E = window.BP, CASES = window.BP_CASES, VERSION = '1.1.0', SAVE_KEY = 'blackpool.v1', BACKUP_KEY = 'blackpool.v1.backup';
const $ = id => document.getElementById(id);
const caseById = {}; CASES.forEach(c => { caseById[c.id] = c; });
const KINDS = { document: 'Document', object: 'Object', statement: 'Statement' };
const FREE_CASE = 'train';
const BILL = window.createBilling({ storageKey: 'blackpool.unlock', productId: 'full_unlock' });

/* ---------- profile ---------- */
let P = null; // { v, slot, books: {A:{caseId: book}}, done: {A:{caseId:true}}, settings }
function fresh() { return { v: 1, slot: 'A', books: { A: {}, B: {}, C: {} }, done: { A: {}, B: {}, C: {} }, settings: { large: false, contrast: false } }; }
function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { try { localStorage.setItem(BACKUP_KEY, localStorage.getItem(SAVE_KEY) || ''); } catch (e2) { } }
  P = fresh(); if (!raw || typeof raw !== 'object') return;
  if (['A', 'B', 'C'].includes(raw.slot)) P.slot = raw.slot;
  for (const s of ['A', 'B', 'C']) {
    const bs = raw.books && raw.books[s]; if (bs && typeof bs === 'object') for (const id in bs) if (caseById[id]) P.books[s][id] = E.sanitizeBook(caseById[id], bs[id]);
    const ds = raw.done && raw.done[s]; if (ds && typeof ds === 'object') for (const id in ds) if (caseById[id] && ds[id] === true) P.done[s][id] = true;
    for (const id in P.books[s]) if (P.books[s][id].done) P.done[s][id] = true;
  }
  if (raw.settings && typeof raw.settings === 'object') { P.settings.large = raw.settings.large === true; P.settings.contrast = raw.settings.contrast === true; }
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(P)); } catch (e) { } }
function book(c) { const bs = P.books[P.slot]; if (!bs[c.id]) bs[c.id] = E.newBook(c); return bs[c.id]; }
function finaleOpen() { return CASES.filter(c => c.id !== 'finale').every(c => P.done[P.slot][c.id]); }
const paidCase = c => c.id !== FREE_CASE && !BILL.state.owned;
// Threes put to the book that did not take ink. The book never says which entry was wrong; it only keeps count.
function falseStarts(b) { return Math.max(0, (b.checks || 0) - Math.floor(Object.keys(b.ink).length / 3)); }

/* ---------- home ---------- */
function renderHome() {
  document.querySelectorAll('#slots button').forEach(b => b.classList.toggle('on', b.dataset.slot === P.slot));
  const ol = $('case-list'); ol.innerHTML = '';
  for (const c of CASES) {
    const b = P.books[P.slot][c.id]; const pct = b ? Math.round(E.progress(c, b) * 100) : 0; const paid = paidCase(c); const locked = !paid && c.id === 'finale' && !finaleOpen();
    const li = document.createElement('li'); li.className = (locked ? 'locked' : '') + (paid ? ' paid' : '') + (P.done[P.slot][c.id] ? ' done' : '');
    li.innerHTML = `<button ${locked ? 'disabled' : ''}><span class="num">${c.n}</span><span><span class="t"></span><br><span class="w"></span></span><span class="pct"></span></button>`;
    li.querySelector('.t').textContent = c.title; li.querySelector('.w').textContent = locked ? 'Opens when the first five cases are in ink' : c.when;
    li.querySelector('.pct').textContent = paid ? 'Full casebook' : P.done[P.slot][c.id] ? (b && falseStarts(b) === 0 && b.checks > 0 ? 'In ink · clean' : 'In ink') : pct ? pct + '%' : '';
    if (paid) li.querySelector('button').addEventListener('click', () => showUnlock('shelf', c.id));
    else if (!locked) li.querySelector('button').addEventListener('click', () => openCase(c.id));
    ol.appendChild(li);
  }
}

/* ---------- case ---------- */
let C = null, B = null, tab = 'brief', evIndex = 0, personId = null;
function openCase(id) {
  if (paidCase(caseById[id])) { showUnlock('shelf', id); return; }
  C = caseById[id]; B = book(C);
  $('case-title').textContent = C.title; $('case-when').textContent = C.when;
  $('brief-place').textContent = C.place; $('brief-intro').textContent = C.intro; $('brief-question').textContent = C.question;
  $('notes').value = B.notes || '';
  renderEvidence(); renderPeople(); renderBook(); renderMeter();
  $('screen-home').classList.remove('active'); $('screen-case').classList.add('active'); setTab(B.done ? 'book' : (Object.keys(B.ink).length ? 'book' : 'brief'));
  window.scrollTo(0, 0);
}
function restartCase() {
  if (!C || !confirm(`Rub out every entry in "${C.title}" and start it again? Your other cases are not touched.`)) return;
  const id = C.id; P.books[P.slot][id] = E.newBook(C); delete P.done[P.slot][id]; save(); openCase(id); setTab('brief'); toast('This case is blank again.');
}
function closeCase() { save(); C = null; B = null; $('screen-case').classList.remove('active'); $('screen-home').classList.add('active'); renderHome(); }
function setTab(t) { tab = t; document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t)); document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + t)); if (t === 'book') renderBook(); if (t === 'people') renderPeople(); }
function renderMeter() {
  const n = Object.keys(B.pencil).length; $('pencil-n').textContent = n;
  const total = C.figures.length * 3, inked = Object.keys(B.ink).length;
  $('progress-bar').style.width = (100 * inked / total) + '%'; $('progress-text').textContent = `${inked} of ${total} entries in ink`;
}
function renderEvidence() {
  const ol = $('evidence-list'); ol.innerHTML = '';
  C.evidence.forEach((ev, i) => { const li = document.createElement('li'); li.innerHTML = `<button><div class="k ${ev.kind}"></div><div class="t"></div></button>`; li.querySelector('.k').textContent = KINDS[ev.kind] || ev.kind; li.querySelector('.t').textContent = ev.title; li.querySelector('button').addEventListener('click', () => showEvidence(i)); ol.appendChild(li); });
}
function showEvidence(i) { evIndex = (i + C.evidence.length) % C.evidence.length; const ev = C.evidence[evIndex]; $('ev-kind').textContent = (KINDS[ev.kind] || ev.kind) + ` · ${evIndex + 1} of ${C.evidence.length}`; $('ev-title').textContent = ev.title; $('ev-text').textContent = ev.text; $('modal-evidence').hidden = false; $('modal-evidence').querySelector('.sheet').scrollTop = 0; }
function entryState(p, f) { const k = E.key(p, f); if (B.ink[k]) return { s: 'ink', v: B.ink[k] }; if (B.pencil[k]) return { s: 'pencil', v: B.pencil[k] }; return { s: 'blank', v: '' }; }
const VLABEL = { truthful: 'Truthful', liar: 'Lying', culprit: 'The culprit' };
const glyph = s => s === 'ink' ? '✒' : s === 'pencil' ? '✎' : '·';
function renderPeople() {
  const ol = $('people-list'); ol.innerHTML = '';
  for (const fg of C.figures) { const li = document.createElement('li'); li.innerHTML = `<button><span class="st"></span><div class="h"></div><div class="d"></div></button>`; li.querySelector('.h').textContent = fg.handle; li.querySelector('.d').textContent = fg.desc; li.querySelector('.st').textContent = E.FIELDS.map(f => glyph(entryState(fg.id, f).s)).join(''); li.querySelector('button').addEventListener('click', () => showPerson(fg.id)); ol.appendChild(li); }
}
function renderBook() {
  const t = $('book-table'); t.innerHTML = '<tr><th>Person</th><th>Name</th><th>Where</th><th>Word</th></tr>';
  for (const fg of C.figures) {
    const tr = document.createElement('tr'); const th = document.createElement('td'); th.className = 'h'; th.textContent = fg.handle; tr.appendChild(th);
    for (const f of E.FIELDS) { const st = entryState(fg.id, f); const td = document.createElement('td'); const b = document.createElement('button'); b.className = st.s === 'ink' ? 'ink-e' : st.s === 'pencil' ? 'pencil-e' : 'blank'; if (st.s === 'blank') { const sp = document.createElement('span'); sp.textContent = '+'; b.appendChild(sp); b.setAttribute('aria-label', `${fg.handle}: ${f === 'verdict' ? 'their word' : f}, blank`); } else b.textContent = f === 'verdict' ? VLABEL[st.v] : st.v; b.addEventListener('click', () => showPerson(fg.id, f)); td.appendChild(b); tr.appendChild(td); }
    t.appendChild(tr);
  }
  renderMeter();
}
function fillSelect(sel, opts, labels) { sel.innerHTML = '<option value="">—</option>'; for (const o of opts) { const op = document.createElement('option'); op.value = o; op.textContent = labels ? labels[o] : o; sel.appendChild(op); } }
function showPerson(id, focus) {
  personId = id; const fg = C.figures.find(f => f.id === id);
  $('p-handle').textContent = fg.handle; $('p-desc').textContent = fg.desc; $('p-where-label').textContent = 'Where were they? ' + (C.whenLabel || '');
  fillSelect($('p-name'), C.names); fillSelect($('p-where'), C.places);
  for (const f of E.FIELDS) { const st = entryState(id, f); const sel = $('p-' + f); sel.value = st.v; sel.disabled = st.s === 'ink' || B.done; const se = $('p-' + f + '-state'); se.textContent = st.s === 'ink' ? '✒ In ink' : st.s === 'pencil' ? '✎ In pencil' : ''; se.className = 'state' + (st.s === 'ink' ? ' ink' : ''); }
  const hasStatement = C.evidence.some(e => e.speaker === id); $('p-statement').hidden = !hasStatement;
  $('p-help').textContent = B.done ? 'This case is closed.' : `${Object.keys(B.pencil).length} of 3 entries in pencil across the book. Three right at once take ink.`;
  $('modal-person').hidden = false; if (focus) $('p-' + focus).focus();
}
function onEntry(f) {
  const v = $('p-' + f).value; const before = Object.keys(B.ink).length;
  const r = E.setPencil(C, B, personId, f, v);
  if (!r.ok) { if (r.reason === 'full') { toast('Three entries are already in pencil. Rub one out first.'); $('p-' + f).value = entryState(personId, f).v; } return; }
  if (r.inked) { toast('Three entries have taken ink.'); }
  save(); showPerson(personId); renderPeople(); renderBook();
  if (B.done) { P.done[P.slot][C.id] = true; save(); setTimeout(showResolution, 600); }
}
function showResolution() {
  $('modal-person').hidden = true; $('r-title').textContent = C.title; $('r-text').textContent = C.resolution; $('r-thread').textContent = C.thread;
  const n = falseStarts(B); $('r-record').textContent = n === 0 ? 'Closed clean: every three you put to the book took ink.' : `Closed after ${n} ${n === 1 ? 'three that' : 'threes that'} did not take ink.`;
  $('modal-resolution').hidden = false;
}

/* ---------- the full casebook (one Google Play purchase) ---------- */
let unlockReason = null, unlockCase = null;
function showUnlock(reason, caseId) { unlockReason = reason; unlockCase = caseId || null; renderUnlock(); $('modal-unlock').hidden = false; }
function renderUnlock() {
  const b = BILL.state, note = $('u-note');
  $('u-kicker').textContent = unlockReason === 'after-first' ? 'The thread goes on' : 'The full casebook';
  let msg = '';
  if (!b.available) msg = 'The full casebook is unlocked in the Google Play edition of the game.';
  else if (b.pending) msg = 'Your purchase is waiting for the payment to clear. The cases open as soon as Google Play confirms it.';
  else if (b.error) msg = b.error;
  else if (b.busy) msg = 'Waiting for Google Play…';
  note.hidden = !msg; note.textContent = msg;
  $('u-buy').textContent = b.price ? `Unlock the full casebook · ${b.price}` : 'Unlock the full casebook';
  $('u-buy').disabled = !b.available || b.busy || b.pending || b.owned; $('u-restore').disabled = !b.available || b.busy;
}
function unlocked() {
  renderHome();
  if ($('modal-unlock').hidden) return;
  $('modal-unlock').hidden = true; toast('The full casebook is yours. Thank you.');
  const id = unlockCase; unlockReason = null; unlockCase = null;
  if (id && $('screen-home').classList.contains('active')) openCase(id);
}
let toastTimer = 0; function toast(m) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600); }
function applySettings() { document.documentElement.classList.toggle('large', P.settings.large); document.documentElement.classList.toggle('contrast', P.settings.contrast); $('opt-large').checked = P.settings.large; $('opt-contrast').checked = P.settings.contrast; }

/* ---------- wiring ---------- */
function init() {
  load(); applySettings(); $('about-version').textContent = VERSION;
  document.querySelectorAll('#slots button').forEach(b => b.addEventListener('click', () => { P.slot = b.dataset.slot; save(); renderHome(); }));
  $('btn-clear-slot').addEventListener('click', () => { if (!confirm(`Rub out every entry in casebook ${P.slot}? The other casebooks are not touched.`)) return; P.books[P.slot] = {}; P.done[P.slot] = {}; save(); renderHome(); toast(`Casebook ${P.slot} is blank again.`); });
  for (const k of ['large', 'contrast']) $('opt-' + k).addEventListener('change', e => { P.settings[k] = e.target.checked; applySettings(); save(); });
  $('btn-back').addEventListener('click', closeCase);
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('ev-close').addEventListener('click', () => { $('modal-evidence').hidden = true; }); $('ev-prev').addEventListener('click', () => showEvidence(evIndex - 1)); $('ev-next').addEventListener('click', () => showEvidence(evIndex + 1));
  for (const f of E.FIELDS) $('p-' + f).addEventListener('change', () => onEntry(f));
  $('p-close').addEventListener('click', () => { $('modal-person').hidden = true; });
  $('p-statement').addEventListener('click', () => { const i = C.evidence.findIndex(e => e.speaker === personId); if (i >= 0) showEvidence(i); });
  $('r-close').addEventListener('click', () => { const first = C && C.id === FREE_CASE; $('modal-resolution').hidden = true; closeCase(); if (first && !BILL.state.owned) showUnlock('after-first', 'fete'); });
  $('btn-restart').addEventListener('click', restartCase);
  $('u-buy').addEventListener('click', () => { BILL.buy(); renderUnlock(); });
  $('u-restore').addEventListener('click', () => { BILL.restore(); renderUnlock(); });
  $('u-later').addEventListener('click', () => { $('modal-unlock').hidden = true; unlockReason = null; unlockCase = null; });
  BILL.onChange(st => { if (st.owned) unlocked(); else { if (!$('modal-unlock').hidden) renderUnlock(); renderHome(); } });
  $('notes').addEventListener('input', () => { if (B) { B.notes = $('notes').value.slice(0, 4000); } }); $('notes').addEventListener('change', save);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); }); window.addEventListener('pagehide', save);
  renderHome(); $('app').hidden = false; BILL.start();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
}
/* Test API for the validator-in-browser, staging and the smoke test. */
window.__blackpool = {
  E, CASES, VERSION, billing: BILL, get profile() { return P; }, get book() { return B; }, get case() { return C; },
  loadCase: openCase, closeCase, setTab, set(p, f, v) { const r = E.setPencil(C, B, p, f, v); save(); renderPeople(); renderBook(); if (B.done) { P.done[P.slot][C.id] = true; save(); showResolution(); } return r; },
  fillInk(keys) { const sol = E.solutionOf(C); for (const k of keys) { const [p, f] = k.split('.'); B.ink[k] = sol[p][f]; delete B.pencil[k]; } B.done = Object.keys(B.ink).length === C.figures.length * 3; if (B.done) P.done[P.slot][C.id] = true; save(); renderPeople(); renderBook(); },
  solveAll() { const sol = E.solutionOf(C); for (const fg of C.figures) for (const f of E.FIELDS) B.ink[E.key(fg.id, f)] = sol[fg.id][f]; B.pencil = {}; B.done = true; P.done[P.slot][C.id] = true; save(); renderBook(); showResolution(); },
  deduce() { return E.deduce(C); }, save, reset() { localStorage.removeItem(SAVE_KEY); location.reload(); }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
