// Headless smoke test over file:// (no server needed): node tests/smoke.js [url]
const { chromium } = require('playwright'); const path = require('path');
const base = process.argv[2] || ('file://' + path.resolve(__dirname, '..', 'index.html'));
let failures = 0; const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) failures++; };
// A stand-in for the Play app's billing bridge (android/play/.../PlayBilling.java). owned: what Play says at start.
const fakePlay = owned => {
  const say = m => setTimeout(() => window.__billingEvent(JSON.stringify(m)), 30);
  window.__buys = 0;
  window.AndroidBilling = {
    // Play remembers a purchase across launches, as the real store does.
    start(id) { const had = owned || localStorage.getItem('fakeplay.bought') === '1'; say({ type: 'ready', product: id }); say({ type: 'price', product: id, price: '$3.99' }); say({ type: 'owned', product: id, owned: had }); },
    buy(id) { window.__buys++; localStorage.setItem('fakeplay.bought', '1'); say({ type: 'purchased', product: id }); },
    restore(id) { say({ type: 'owned', product: id, owned: true }); }
  };
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, hasTouch: true });
  await p.addInitScript(fakePlay, true);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); }); p.on('dialog', d => d.accept());
  await p.goto(base); await p.waitForSelector('#app:not([hidden])');
  check('the shelf lists six cases with the finale locked', (await p.locator('#case-list li').count()) === 6 && (await p.locator('#case-list li.locked').count()) === 1);
  await p.click('#case-list li:first-child button'); await p.waitForSelector('#screen-case.active');
  check('a case opens on its brief', (await p.textContent('#case-title')) === 'The 9:15 to Blackpool' && (await p.textContent('#brief-intro')).includes('jewel case'));
  await p.click('.tab[data-tab="evidence"]'); const evN = await p.locator('#evidence-list li').count(); await p.click('#evidence-list li:first-child button'); await p.waitForSelector('#modal-evidence:not([hidden])');
  check('evidence opens in a reader with paging', evN === 15 && (await p.textContent('#ev-title')).includes('Reserved seats'));
  await p.click('#ev-next'); check('the reader pages to the next document', (await p.textContent('#ev-kind')).includes('2 of 15')); await p.click('#ev-close');
  await p.click('.tab[data-tab="people"]'); await p.click('#people-list li:first-child button'); await p.waitForSelector('#modal-person:not([hidden])');
  await p.selectOption('#p-name', 'Walter Pym'); await p.waitForTimeout(50); await p.selectOption('#p-where', "the guard's van"); await p.waitForTimeout(50);
  check('two pencilled entries show in the meter', (await p.textContent('#pencil-n')) === '2');
  await p.selectOption('#p-verdict', 'liar'); await p.waitForTimeout(100);
  check('three entries with one wrong stay in pencil, silently', await p.evaluate(() => { const B = window.__blackpool.book; return Object.keys(B.ink).length === 0 && Object.keys(B.pencil).length === 3; }) && (await p.isHidden('#toast') || !(await p.textContent('#toast')).includes('ink')));
  await p.click('#p-close'); await p.click('#people-list li:nth-child(2) button'); await p.selectOption('#p-name', 'Dorothea Haslam'); await p.waitForTimeout(100);
  check('a fourth pencil is refused', (await p.textContent('#toast')).includes('Three entries') && await p.evaluate(() => Object.keys(window.__blackpool.book.pencil).length === 3));
  await p.click('#p-close'); await p.click('#people-list li:first-child button'); await p.selectOption('#p-verdict', 'truthful'); await p.waitForTimeout(150);
  check('three right entries take ink together', await p.evaluate(() => { const B = window.__blackpool.book; return Object.keys(B.ink).length === 3 && Object.keys(B.pencil).length === 0; }) && (await p.textContent('#p-name-state')).includes('ink'));
  check('inked fields are locked', await p.isDisabled('#p-name'));
  await p.click('#p-close'); await p.click('.tab[data-tab="notes"]'); await p.fill('#notes', 'Crane. The stub.'); await p.dispatchEvent('#notes', 'change');
  await p.click('#btn-back'); await p.waitForSelector('#screen-home.active'); check('the shelf shows progress', (await p.textContent('#case-list li:first-child .pct')).includes('%'));
  await p.reload(); await p.waitForSelector('#app:not([hidden])'); await p.click('#case-list li:first-child button');
  check('ink and notes survive a reload', await p.evaluate(() => { const B = window.__blackpool.book; return Object.keys(B.ink).length === 3 && B.notes === 'Crane. The stub.'; }));
  await p.click('.tab[data-tab="brief"]'); await p.click('#btn-restart'); await p.waitForTimeout(50);
  check('Start this case again rubs out this case only', await p.evaluate(() => { const B = window.__blackpool.book; return Object.keys(B.ink).length === 0 && B.checks === 0; }) && (await p.textContent('#tab-brief')).length > 50);
  await p.click('#btn-back'); await p.click('#slots button[data-slot="B"]'); await p.click('#case-list li:first-child button');
  check('casebook B is a clean slate', await p.evaluate(() => Object.keys(window.__blackpool.book.ink).length === 0));
  await p.evaluate(() => window.__blackpool.solveAll()); await p.waitForSelector('#modal-resolution:not([hidden])');
  check('a completed case shows its resolution and thread', (await p.textContent('#r-text')).includes('Leonard Crane') && (await p.textContent('#r-thread')).includes('little finger'));
  check('the resolution says whether the case was closed clean', (await p.textContent('#r-record')).includes('clean'));
  await p.click('#r-close'); await p.waitForSelector('#screen-home.active');
  check('the shelf marks the case in ink', (await p.textContent('#case-list li:first-child .pct')) === 'In ink');
  for (let i = 2; i <= 5; i++) { await p.click(`#case-list li:nth-child(${i}) button`); await p.evaluate(() => window.__blackpool.solveAll()); await p.click('#r-close'); await p.waitForSelector('#screen-home.active'); }
  check('the finale opens after five cases', (await p.locator('#case-list li.locked').count()) === 0);
  // The first case is free; the other five are one Google Play purchase.
  const fresh = async owned => { const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true }); const q = await ctx.newPage(); q.on('pageerror', e => errs.push(e.message)); q.on('dialog', d => d.accept()); if (owned !== undefined) await q.addInitScript(fakePlay, owned); await q.goto(base); await q.waitForSelector('#app:not([hidden])'); await q.waitForTimeout(150); return { ctx, q }; };
  {
    const { ctx, q } = await fresh();
    check('outside the Play app only the first case is open', (await q.locator('#case-list li.paid').count()) === 5 && (await q.textContent('#case-list li:nth-child(2) .pct')) === 'Full casebook');
    await q.tap('#case-list li:nth-child(2) button'); await q.waitForSelector('#modal-unlock:not([hidden])');
    check('a paid case offers the full casebook and says where to get it', await q.isDisabled('#u-buy') && (await q.textContent('#u-note')).includes('Google Play edition') && await q.isVisible('#screen-home.active'));
    await q.tap('#u-later'); check('Not now goes back to the shelf', await q.isHidden('#modal-unlock'));
    await q.tap('#case-list li:nth-child(1) button'); await q.waitForSelector('#screen-case.active'); check('the first case opens free', (await q.textContent('#case-title')) === 'The 9:15 to Blackpool');
    await q.evaluate(() => window.__blackpool.solveAll()); await q.tap('#r-close'); await q.waitForSelector('#modal-unlock:not([hidden])');
    check('closing the first case offers the rest of the thread', (await q.textContent('#u-kicker')) === 'The thread goes on');
    await q.tap('#u-later'); await ctx.close();
  }
  {
    const { ctx, q } = await fresh(false);
    await q.tap('#case-list li:nth-child(3) button'); await q.waitForSelector('#modal-unlock:not([hidden])');
    check('the unlock shows Play\'s price', (await q.textContent('#u-buy')).includes('$3.99'));
    await q.tap('#u-buy'); await q.waitForSelector('#modal-unlock', { state: 'hidden' });
    check('buying opens the case that was tapped', await q.isVisible('#screen-case.active') && (await q.textContent('#case-title')).includes('Grace Dieu') && await q.evaluate(() => window.__buys === 1));
    await q.reload(); await q.waitForSelector('#app:not([hidden])'); await q.waitForTimeout(150);
    check('the unlock survives a reload (offline)', (await q.locator('#case-list li.paid').count()) === 0);
    await ctx.close();
  }
  {
    const { ctx, q } = await fresh(false);
    await q.tap('#case-list li:nth-child(2) button'); await q.waitForSelector('#modal-unlock:not([hidden])'); await q.tap('#u-restore'); await q.waitForSelector('#modal-unlock', { state: 'hidden' });
    check('Restore purchase unlocks a reinstall', (await q.locator('#case-list li.paid').count()) === 0 && await q.isVisible('#screen-case.active'));
    await ctx.close();
  }
  for (const [label, junk] of [['truncated JSON', '{"books":{"A":{"train":{"ink":{"f1.name":"Walter Pym"}}'], ['wrong types', '{"v":1,"slot":"Z","books":"no","done":[],"settings":{"large":"yes"}}'], ['wrong ink', '{"v":1,"slot":"A","books":{"A":{"train":{"ink":{"f1.name":"Arthur Dell","f1.where":"the guard\'s van"},"pencil":{"f9.name":"x"}}}}}']]) {
    const ctx = await b.newContext({ viewport: { width: 360, height: 640 } }); const q = await ctx.newPage(); const qe = []; q.on('pageerror', e => qe.push(e.message));
    await q.addInitScript(j => { try { localStorage.setItem('blackpool.v1', j); } catch (e) { } }, junk); await q.goto(base); await q.waitForSelector('#app:not([hidden])');
    check('a mangled save still loads: ' + label, qe.length === 0 && await q.evaluate(() => { const P = window.__blackpool.profile; return ['A', 'B', 'C'].includes(P.slot) && typeof P.books.A === 'object' && Object.values(P.books.A).every(bk => Object.keys(bk.ink).every(k => true)); }), qe.join(' | '));
    await ctx.close();
  }
  check('no page errors, console errors or failed requests', errs.length === 0, errs.join(' | '));
  await b.close(); console.log(failures ? `${failures} FAILED` : 'ALL PASSED'); process.exit(failures ? 1 : 0);
})();
