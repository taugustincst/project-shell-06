/* Proves every case ships airtight: node tools/validate.js
   For each case: (1) the authored solution satisfies every constraint; (2) search finds exactly one solution;
   (3) propagation alone (no guessing) reaches the full solution; (4) every field has at least 3 live options;
   (5) each evidence item is consistent, and the report names which items are redundant for uniqueness. Exit 1 on any failure. */
const BP = require('../js/engine.js'); const CASES = require('../js/cases.js');
let fail = 0; const bad = (m) => { console.log('  FAIL ' + m); fail++; };
for (const c of CASES) {
  console.log(`\n${c.title} (${c.id}) — ${c.figures.length} figures, ${c.evidence.length} evidence items, ${c.figures.length * 3} entries`);
  // shape
  const ids = new Set(c.figures.map(f => f.id)); const names = new Set(c.names);
  if (c.names.length !== c.figures.length) bad('names list must match figure count');
  for (const f of c.figures) { if (!names.has(f.name)) bad(`${f.id} name not in list`); if (!c.places.includes(f.where)) bad(`${f.id} place not in list`); if (!BP.VERDICTS.includes(f.verdict)) bad(`${f.id} verdict`); }
  if (c.figures.filter(f => f.verdict === 'culprit').length !== 1) bad('exactly one culprit');
  for (const e of c.evidence) for (const k of (e.c || [])) { for (const key of ['p', 'q', 's']) if (k[key] && !ids.has(k[key])) bad(`${e.id}: unknown figure ${k[key]}`); for (const l of [k.l, k.a, k.b].concat(k.ls || [])) if (l && !ids.has(l.p)) bad(`${e.id}: unknown figure ${l.p}`); }
  // (1) solution satisfies constraints
  const solDom = BP.freshDomains(c); for (const f of c.figures) { solDom[f.id].name = [f.name]; solDom[f.id].where = [f.where]; solDom[f.id].verdict = [f.verdict]; }
  if (!BP.propagate(c, solDom)) { bad('authored solution contradicts the evidence'); for (const e of c.evidence) { const one = { ...c, evidence: [e] }; const d = BP.freshDomains(c); for (const f of c.figures) { d[f.id].name = [f.name]; d[f.id].where = [f.where]; d[f.id].verdict = [f.verdict]; } if (!BP.propagate(one, d)) console.log('    contradicted by ' + e.id); } }
  // (2) uniqueness
  const n = BP.countSolutions(c, BP.freshDomains(c), 3); if (n !== 1) bad(`search finds ${n} solutions`);
  // (3) pure deduction
  const d = BP.deduce(c); if (!d.ok) bad('propagation hits a contradiction'); else if (!d.solved) { const open = []; for (const p in d.dom) for (const f of BP.FIELDS) if (d.dom[p][f].length > 1) open.push(`${p}.${f}[${d.dom[p][f].join('|')}]`); bad('needs guessing; undetermined: ' + open.join(' ')); }
  else { const sol = BP.solutionOf(c); for (const p in d.dom) for (const f of BP.FIELDS) if (d.dom[p][f][0] !== sol[p][f]) bad(`deduction disagrees with authored solution at ${p}.${f}`); }
  // (4) option counts
  if (c.names.length < 3 || c.places.length < 3) bad('too few options');
  // (5) redundancy report
  const redundant = [];
  for (const e of c.evidence) { const without = { ...c, evidence: c.evidence.filter(x => x !== e) }; const dd = BP.deduce(without); if (dd.ok && dd.solved) redundant.push(e.id); }
  console.log(`  unique: ${n === 1} · pure deduction: ${d.solved} · redundant for deduction: ${redundant.length ? redundant.join(', ') : 'none'}`);
  // leak estimate: a player holding two certain entries can probe one unknown field; cost = options
  console.log(`  probe cost per unknown entry: name ${c.names.length} · where ${c.places.length} · verdict 3`);
}
console.log(fail ? `\n${fail} FAILURE(S)` : '\nALL CASES AIRTIGHT'); process.exit(fail ? 1 : 0);
