// Engine unit tests: node tests/engine.test.js
const assert = require('assert'); const E = require('../js/engine.js'); const CASES = require('../js/cases.js');
let n = 0; const t = (name, fn) => { try { fn(); n++; console.log('PASS ' + name); } catch (e) { console.log('FAIL ' + name + '\n  ' + (e.stack || e)); process.exitCode = 1; } };
const c1 = CASES[0];
t('every case deduces to its authored solution without search', () => { for (const c of CASES) { const d = E.deduce(c); assert.ok(d.ok && d.solved, c.id); const sol = E.solutionOf(c); for (const p in d.dom) for (const f of E.FIELDS) assert.strictEqual(d.dom[p][f][0], sol[p][f], c.id + ' ' + p + '.' + f); } });
t('every case has exactly one solution under search', () => { for (const c of CASES) assert.strictEqual(E.countSolutions(c, E.freshDomains(c), 3), 1, c.id); });
t('a liar\'s claims are all false, a truthful person\'s all true', () => {
  const sol = E.solutionOf(c1);
  for (const ev of c1.evidence) for (const k of (ev.c || [])) if (k.t === 'says' || k.t === 'saysnot') { const truthful = sol[k.s].verdict === 'truthful'; const holds = sol[k.l.p][k.l.f] === k.l.v; assert.strictEqual(k.t === 'says' ? holds : !holds, truthful, ev.id); }
});
t('three right entries take ink together; anything else stays pencil and says nothing', () => {
  const b = E.newBook(c1); const sol = E.solutionOf(c1);
  assert.ok(E.setPencil(c1, b, 'f1', 'name', sol.f1.name).ok); assert.ok(E.setPencil(c1, b, 'f1', 'where', sol.f1.where).ok);
  const wrong = E.setPencil(c1, b, 'f3', 'where', 'the platform'); assert.ok(wrong.ok); assert.strictEqual(wrong.inked, false); assert.strictEqual(Object.keys(b.ink).length, 0); assert.strictEqual(Object.keys(b.pencil).length, 3);
  assert.strictEqual(E.setPencil(c1, b, 'f4', 'name', sol.f4.name).reason, 'full');
  assert.ok(E.setPencil(c1, b, 'f3', 'where', '').ok); const right = E.setPencil(c1, b, 'f3', 'where', sol.f3.where); assert.strictEqual(right.inked, true);
  assert.strictEqual(Object.keys(b.ink).length, 3); assert.strictEqual(Object.keys(b.pencil).length, 0);
  assert.strictEqual(E.setPencil(c1, b, 'f1', 'name', 'Arthur Dell').reason, 'inked');
});
t('a case is done when every entry is in ink', () => { const b = E.newBook(c1); const sol = E.solutionOf(c1); const ks = []; for (const fg of c1.figures) for (const f of E.FIELDS) ks.push([fg.id, f]); for (let i = 0; i < ks.length; i += 3) { for (let j = i; j < i + 3; j++) E.setPencil(c1, b, ks[j][0], ks[j][1], sol[ks[j][0]][ks[j][1]]); } assert.ok(b.done); assert.strictEqual(E.progress(c1, b), 1); });
t('sanitizeBook drops wrong ink, unknown figures and bad options, and keeps at most three pencils', () => {
  const b = E.sanitizeBook(c1, { ink: { 'f1.name': 'Walter Pym', 'f1.where': 'the platform', 'zz.name': 'Walter Pym', 'f2.verdict': 'maybe' }, pencil: { 'f3.where': 'Compartment C', 'f4.name': 'x', 'f5.where': 'the corridor', 'f6.where': 'the corridor', 'f7.where': 'the corridor', 'f1.name': 'Arthur Dell' }, checks: 'lots', notes: 7, done: true });
  assert.deepStrictEqual(b.ink, { 'f1.name': 'Walter Pym' }); assert.strictEqual(Object.keys(b.pencil).length, 3); assert.ok(!b.pencil['f1.name']); assert.strictEqual(b.checks, 0); assert.strictEqual(b.notes, ''); assert.strictEqual(b.done, false);
  assert.strictEqual(E.sanitizeBook(c1, null).done, false); assert.strictEqual(E.sanitizeBook(c1, 'junk').caseId, c1.id);
});
t('contradictory evidence is reported, not crashed on', () => { const c = { ...c1, evidence: c1.evidence.concat([{ id: 'x', c: [{ t: 'is', p: 'f1', f: 'where', v: 'the platform' }] }]) }; const d = E.deduce(c); assert.strictEqual(d.ok, false); assert.strictEqual(E.countSolutions(c, E.freshDomains(c)), 0); });
console.log(process.exitCode ? 'SOME FAILED' : `ALL ${n} PASSED`);
