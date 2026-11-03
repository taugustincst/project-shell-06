/* The 9:15 to Blackpool — casebook engine. Pure functions, no DOM; runs in Node (tools/validate.js) and the browser (window.BP).
   A case is data: figures (what the player sees), fields with option lists, evidence (prose + formal constraints), and a solution.
   The solver here is the same code the game uses to confirm entries, so what the validator proves is what the player plays. */
(function (root) {
'use strict';
const FIELDS = ['name', 'where', 'verdict'];
const VERDICTS = ['truthful', 'liar', 'culprit'];

/* ---------- domains ---------- */
function freshDomains(c) {
  const dom = {};
  for (const fg of c.figures) {
    dom[fg.id] = { name: c.names.slice(), where: c.places.slice(), verdict: VERDICTS.slice() };
  }
  return dom;
}
function isTruthful(dom, p) { return dom[p].verdict.length === 1 && dom[p].verdict[0] === 'truthful'; }
function isLiar(dom, p) { return !dom[p].verdict.includes('truthful'); }
function litTrue(dom, l) { const d = dom[l.p][l.f]; return d.length === 1 && d[0] === l.v; }
function litFalse(dom, l) { return !dom[l.p][l.f].includes(l.v); }
function assign(dom, p, f, v) { const d = dom[p][f]; if (!d.includes(v)) return 'contradiction'; if (d.length !== 1) { dom[p][f] = [v]; return true; } return false; }
function remove(dom, p, f, v) { const d = dom[p][f]; const i = d.indexOf(v); if (i < 0) return false; d.splice(i, 1); return d.length ? true : 'contradiction'; }
function setLit(dom, l, truth) { return truth ? assign(dom, l.p, l.f, l.v) : remove(dom, l.p, l.f, l.v); }
function litState(dom, l) { return litTrue(dom, l) ? true : litFalse(dom, l) ? false : null; }

/* One pass of every constraint. Returns 'contradiction', true (changed) or false. Rules are the plain inferences a reader makes. */
function propagateOnce(c, dom) {
  let changed = false;
  const mark = r => { if (r === 'contradiction') throw 'contradiction'; if (r) changed = true; };
  // every figure has a different name; every name belongs to exactly one figure
  const ids = c.figures.map(f => f.id);
  for (const f of ['name']) {
    for (const p of ids) if (dom[p][f].length === 1) for (const q of ids) if (q !== p) mark(remove(dom, q, f, dom[p][f][0]));
    for (const v of c.names) { const can = ids.filter(p => dom[p][f].includes(v)); if (can.length === 0) throw 'contradiction'; if (can.length === 1 && dom[can[0]][f].length > 1) mark(assign(dom, can[0], f, v)); }
  }
  // exactly one culprit
  { const can = ids.filter(p => dom[p].verdict.includes('culprit')); const sure = ids.filter(p => dom[p].verdict.length === 1 && dom[p].verdict[0] === 'culprit');
    if (can.length === 0) throw 'contradiction'; if (can.length === 1 && dom[can[0]].verdict.length > 1) mark(assign(dom, can[0], 'verdict', 'culprit'));
    if (sure.length > 1) throw 'contradiction'; if (sure.length === 1) for (const p of ids) if (p !== sure[0]) mark(remove(dom, p, 'verdict', 'culprit')); }
  for (const ev of c.evidence) for (const k of (ev.c || [])) {
    switch (k.t) {
      case 'is': mark(assign(dom, k.p, k.f, k.v)); break;
      case 'not': mark(remove(dom, k.p, k.f, k.v)); break;
      case 'truthful': mark(assign(dom, k.p, 'verdict', 'truthful')); break;
      case 'liar': mark(remove(dom, k.p, 'verdict', 'truthful')); break;
      case 'eq': { const a = dom[k.p][k.f], b = dom[k.q][k.g]; const inter = a.filter(v => b.includes(v)); if (!inter.length) throw 'contradiction'; if (inter.length < a.length) { dom[k.p][k.f] = inter; changed = true; } if (inter.length < b.length) { dom[k.q][k.g] = inter.slice(); changed = true; } break; }
      case 'neq': { if (dom[k.p][k.f].length === 1) mark(remove(dom, k.q, k.g, dom[k.p][k.f][0])); if (dom[k.q][k.g].length === 1) mark(remove(dom, k.p, k.f, dom[k.q][k.g][0])); break; }
      case 'says': { // the claim holds exactly when the speaker is truthful; a liar's every claim is false
        const s = litState(dom, k.l);
        if (isTruthful(dom, k.s)) mark(setLit(dom, k.l, true)); else if (isLiar(dom, k.s)) mark(setLit(dom, k.l, false));
        if (s === true) mark(assign(dom, k.s, 'verdict', 'truthful')); else if (s === false) mark(remove(dom, k.s, 'verdict', 'truthful'));
        break; }
      case 'saysnot': { // the speaker denies the literal: literal false iff speaker truthful
        const s = litState(dom, k.l);
        if (isTruthful(dom, k.s)) mark(setLit(dom, k.l, false)); else if (isLiar(dom, k.s)) mark(setLit(dom, k.l, true));
        if (s === false) mark(assign(dom, k.s, 'verdict', 'truthful')); else if (s === true) mark(remove(dom, k.s, 'verdict', 'truthful'));
        break; }
      case 'imp': { // if a then b (both literals; a literal may carry neg:true)
        const A = k.a.neg ? (x => x === null ? null : !x)(litState(dom, k.a)) : litState(dom, k.a);
        const B = k.b.neg ? (x => x === null ? null : !x)(litState(dom, k.b)) : litState(dom, k.b);
        if (A === true && B !== true) mark(setLit(dom, k.b, !k.b.neg)); if (B === false && A !== false) mark(setLit(dom, k.a, !!k.a.neg)); break; }
      case 'or': { // at least one literal true
        const states = k.ls.map(l => litState(dom, l)); if (states.every(s => s === false)) throw 'contradiction';
        const open = k.ls.filter((l, i) => states[i] === null); if (!states.includes(true) && open.length === 1) mark(setLit(dom, open[0], true)); break; }
      case 'count': { // exactly n figures have f = v (among listed ps, default all)
        const ps = k.ps || ids; const can = ps.filter(p => dom[p][k.f].includes(k.v)); const sure = ps.filter(p => dom[p][k.f].length === 1 && dom[p][k.f][0] === k.v);
        if (can.length < k.n || sure.length > k.n) throw 'contradiction';
        if (can.length === k.n) for (const p of can) mark(assign(dom, p, k.f, k.v)); if (sure.length === k.n) for (const p of ps) if (!sure.includes(p)) mark(remove(dom, p, k.f, k.v)); break; }
      case 'alone': { // if figure p was at place v then nobody else was: p.where=v => q.where!=v for all q
        if (dom[k.p].where.length === 1 && dom[k.p].where[0] === k.v) for (const q of ids) if (q !== k.p) mark(remove(dom, q, 'where', k.v));
        if (ids.some(q => q !== k.p && dom[q].where.length === 1 && dom[q].where[0] === k.v)) mark(remove(dom, k.p, 'where', k.v)); break; }
      case 'culpritwhere': mark(ids.reduce((acc, p) => { // the culprit was at place v
        if (dom[p].verdict.length === 1 && dom[p].verdict[0] === 'culprit') { const r = assign(dom, p, 'where', k.v); if (r === 'contradiction') throw 'contradiction'; acc = acc || r; }
        if (!dom[p].where.includes(k.v)) { const r = remove(dom, p, 'verdict', 'culprit'); if (r === 'contradiction') throw 'contradiction'; acc = acc || r; }
        return acc; }, false)); break;
      case 'named': { // the figure whose name is k.name has field f = v (used for documents that name a person, not a figure)
        const can = ids.filter(p => dom[p].name.includes(k.name));
        if (can.length === 1) mark(assign(dom, can[0], k.f, k.v));
        for (const p of can) if (!dom[p][k.f].includes(k.v)) mark(remove(dom, p, 'name', k.name)); break; }
      default: throw new Error('unknown constraint ' + k.t);
    }
  }
  return changed;
}
function propagate(c, dom) { try { while (propagateOnce(c, dom)) { } return true; } catch (e) { if (e === 'contradiction') return false; throw e; } }
function cloneDom(dom) { const o = {}; for (const p in dom) o[p] = { name: dom[p].name.slice(), where: dom[p].where.slice(), verdict: dom[p].verdict.slice() }; return o; }
function solved(dom) { for (const p in dom) for (const f of FIELDS) if (dom[p][f].length !== 1) return false; return true; }

/* Count solutions by search (cap 2) so the validator can prove uniqueness. */
function countSolutions(c, dom, cap) {
  cap = cap || 2;
  if (!propagate(c, dom)) return 0;
  if (solved(dom)) return 1;
  let best = null, bestN = 1e9;
  for (const p in dom) for (const f of FIELDS) if (dom[p][f].length > 1 && dom[p][f].length < bestN) { best = [p, f]; bestN = dom[p][f].length; }
  let n = 0;
  for (const v of dom[best[0]][best[1]]) { const d2 = cloneDom(dom); d2[best[0]][best[1]] = [v]; n += countSolutions(c, d2, cap); if (n >= cap) return n; }
  return n;
}
/* Deduction by propagation only: what a careful reader can prove without guessing. */
function deduce(c) { const dom = freshDomains(c); const ok = propagate(c, dom); return { ok, dom, solved: ok && solved(dom) }; }
function solutionOf(c) { const sol = {}; for (const fg of c.figures) sol[fg.id] = { name: fg.name, where: fg.where, verdict: fg.verdict }; return sol; }

/* ---------- the casebook (player state for one case) ---------- */
function newBook(c) { const b = { v: 1, caseId: c.id, pencil: {}, ink: {}, checks: 0, inks: 0, done: false, notes: '' }; return b; }
const key = (p, f) => p + '.' + f;
function setPencil(c, b, p, f, v) {
  if (b.done || b.ink[key(p, f)]) return { ok: false, reason: 'inked' };
  if (v == null || v === '') { delete b.pencil[key(p, f)]; return { ok: true }; }
  const opts = f === 'name' ? c.names : f === 'where' ? c.places : VERDICTS; if (!opts.includes(v)) return { ok: false, reason: 'option' };
  const n = Object.keys(b.pencil).filter(k => k !== key(p, f)).length; if (n >= 3) return { ok: false, reason: 'full' };
  b.pencil[key(p, f)] = v;
  return { ok: true, inked: Object.keys(b.pencil).length === 3 ? check(c, b) : false };
}
/* The Obra Dinn rule: three pencilled entries, all right, take ink together. Otherwise the book says nothing. */
function check(c, b) {
  const sol = solutionOf(c); const ks = Object.keys(b.pencil); b.checks++;
  if (ks.length !== 3) return false;
  const allRight = ks.every(k => { const [p, f] = k.split('.'); return sol[p][f] === b.pencil[k]; });
  if (!allRight) return false;
  for (const k of ks) { b.ink[k] = b.pencil[k]; delete b.pencil[k]; }
  b.inks += 3;
  if (Object.keys(b.ink).length === c.figures.length * FIELDS.length) b.done = true;
  return true;
}
function progress(c, b) { return Object.keys(b.ink).length / (c.figures.length * FIELDS.length); }
function sanitizeBook(c, raw) {
  const b = newBook(c); if (!raw || typeof raw !== 'object') return b;
  const valid = (p, f, v) => c.figures.some(fg => fg.id === p) && FIELDS.includes(f) && (f === 'name' ? c.names : f === 'where' ? c.places : VERDICTS).includes(v);
  const sol = solutionOf(c);
  if (raw.ink && typeof raw.ink === 'object') for (const k in raw.ink) { const [p, f] = String(k).split('.'); if (valid(p, f, raw.ink[k]) && sol[p][f] === raw.ink[k]) b.ink[k] = raw.ink[k]; }
  if (raw.pencil && typeof raw.pencil === 'object') for (const k in raw.pencil) { const [p, f] = String(k).split('.'); if (valid(p, f, raw.pencil[k]) && !b.ink[k] && Object.keys(b.pencil).length < 3) b.pencil[k] = raw.pencil[k]; }
  b.checks = Math.max(0, Math.min(1e6, Math.round(+raw.checks) || 0)); b.inks = Object.keys(b.ink).length;
  b.done = Object.keys(b.ink).length === c.figures.length * FIELDS.length; b.notes = typeof raw.notes === 'string' ? raw.notes.slice(0, 4000) : '';
  return b;
}

const BP = { FIELDS, VERDICTS, freshDomains, propagate, cloneDom, solved, countSolutions, deduce, solutionOf, newBook, setPencil, check, progress, sanitizeBook, key };
if (typeof module !== 'undefined' && module.exports) module.exports = BP; else root.BP = BP;
})(typeof window !== 'undefined' ? window : globalThis);
