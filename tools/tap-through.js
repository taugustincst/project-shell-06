#!/usr/bin/env node
// Emulator tap-through: every screen of The 9:15 to Blackpool, driven with
// real Android touch input (adb shell input), on a debug build of the Play
// edition. Play's 3 Nov 2026 review of Bubble Pop's first upload listed
// "Unresponsive UI elements, such as buttons or icons"; this test, built the
// same way as Bubble Pop's, fails unless each control visibly does its job
// when a finger taps it: the shelf and its casebooks, a case's tabs and
// evidence reader, the person sheet's pickers (Android's own list dialog,
// tapped like a player taps it), a wrong three that stays in pencil and a
// right three that takes ink, the confirm dialog of "Start this case
// again", the full-casebook sheet (the emulator has no Play Store, so it
// must say so and let the player carry on), Back, and a relaunch that keeps
// the casebook.
//
// The page's layout and state are read over WebView DevTools (enabled only in
// debuggable builds, see MainActivity), so every tap lands on the element's
// measured centre and every step is checked against the game's own state.
// Taps themselves never go through DevTools: they are real touches.
//
//   node tools/tap-through.js <debug-apk> [package]
// Screenshots and a log go to $TAP_THROUGH_OUT (default tap-through/).
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APK = process.argv[2];
const PKG = process.argv[3] || 'com.taugustincst.blackpool';
const OUT = process.env.TAP_THROUGH_OUT || 'tap-through';
const PORT = 9333;
if (!APK) { console.error('usage: node tools/tap-through.js <debug-apk> [package]'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const adb = (...a) => execFileSync('adb', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 << 20 }).trim();
let shotN = 0;
const shot = name => {
  const f = path.join(OUT, String(++shotN).padStart(2, '0') + '-' + name + '.png');
  try { fs.writeFileSync(f, execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20 })); } catch (e) { /* best effort */ }
};
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
  return ok;
};
const fatal = msg => { console.log('FAIL ' + msg); finish(true); };

// ---------------------------------------------------------------- DevTools
let ws = null, msgId = 0;
const pending = new Map();
const pageErrors = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('DevTools timeout: ' + method)); } }, 15000);
  });
}
async function js(expression) {
  const m = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (m.error) throw new Error('DevTools: ' + m.error.message);
  if (m.result.exceptionDetails) {
    const d = m.result.exceptionDetails;
    throw new Error('page: ' + ((d.exception && d.exception.description) || d.text));
  }
  return m.result.result.value;
}
async function connect() {
  for (let i = 0; i < 40; i++) {
    let pid = '';
    try { pid = adb('shell', 'pidof', PKG); } catch (e) { /* not up yet */ }
    if (pid) {
      try {
        adb('forward', `tcp:${PORT}`, `localabstract:webview_devtools_remote_${pid.split(/\s+/)[0]}`);
        const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
        const page = list.find(t => t.type === 'page' && /appassets\.androidplatform\.net/.test(t.url));
        if (page) {
          ws = new WebSocket(page.webSocketDebuggerUrl);
          await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
          ws.onmessage = e => {
            const m = JSON.parse(e.data);
            if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
            if (m.method === 'Runtime.exceptionThrown') pageErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
          };
          await send('Runtime.enable');
          if (await js('!!(window.__blackpool)')) return;
          ws.close(); ws = null;
        }
      } catch (e) { /* the page or its DevTools socket is not ready yet */ }
    }
    await sleep(1000);
  }
  fatal('could not reach the game page over WebView DevTools (is this a debug build?)');
}

// ----------------------------------------------------------------- geometry
let dpr = 1, offX = 0, offY = 0, screenW = 0, screenH = 0;
// Measure an element (scrolled into view programmatically if it sits in a
// scrolling panel) and make sure it is the topmost thing at its centre, so a
// tap there reaches it and nothing covers it.
async function measure(sel) {
  return js(`(function(){
    var el=document.querySelector(${JSON.stringify(sel)});
    if(!el) return {missing:true};
    el.scrollIntoView({block:'center',inline:'center'});
    var r=el.getBoundingClientRect();
    var cx=r.left+r.width/2, cy=r.top+r.height/2;
    var top=document.elementFromPoint(cx,cy);
    var visible=r.width>0&&r.height>0&&cx>=0&&cy>=0&&cx<=innerWidth&&cy<=innerHeight;
    return {cx:cx,cy:cy,w:r.width,h:r.height,visible:visible,onTop:!!top&&(top===el||el.contains(top))};
  })()`);
}
const toScreen = (cx, cy) => [Math.round(cx * dpr + offX), Math.round(cy * dpr + offY)];
// Wait for the layout to settle (the soft keyboard opening or closing
// resizes the page), so the tap lands where the element really is.
async function measureSettled(sel) {
  let m = await measure(sel);
  for (let i = 0; i < 12 && !m.missing; i++) {
    await sleep(250);
    const n = await measure(sel);
    if (n.missing || (Math.abs(n.cx - m.cx) < 1 && Math.abs(n.cy - m.cy) < 1)) return n;
    m = n;
  }
  return m;
}
async function tap(sel, label) {
  await sleep(150);
  const m = await measureSettled(sel);
  if (m.missing) return check(`${label}: on screen`, false, `${sel} not in the page`);
  if (!check(`${label}: visible and not covered`, m.visible && m.onTop, JSON.stringify(m))) return false;
  const [x, y] = toScreen(m.cx, m.cy);
  adb('shell', 'input', 'tap', String(x), String(y));
  return true;
}
async function longPress(sel, ms) {
  const m = await measureSettled(sel);
  const [x, y] = toScreen(m.cx, m.cy);
  adb('shell', 'input', 'swipe', String(x), String(y), String(x), String(y), String(ms));
}
async function waitFor(expr, ms = 3000) {
  const end = Date.now() + ms;
  for (;;) {
    let v = false;
    try { v = await js(expr); } catch (e) { /* page busy */ }
    if (v) return true;
    if (Date.now() > end) return false;
    await sleep(150);
  }
}
const hidden = id => `document.getElementById(${JSON.stringify(id)}).hidden`;
const shown = id => `!document.getElementById(${JSON.stringify(id)}).hidden`;
function alive() { try { return adb('shell', 'pidof', PKG) !== ''; } catch (e) { return false; } }

// ------------------------------------------------- native dialogs
// A <select> in the WebView opens Android's own list dialog, and confirm()
// opens an AlertDialog. Neither is in the page, so find their rows on screen
// with uiautomator and tap them like a finger would.
function screenNodes() {
  for (let i = 0; i < 3; i++) {
    try {
      adb('shell', 'uiautomator', 'dump', '/sdcard/tt-ui.xml');
      const xml = adb('exec-out', 'cat', '/sdcard/tt-ui.xml');
      const nodes = [];
      for (const m of xml.matchAll(/<node [^>]*?text="([^"]*)"[^>]*?resource-id="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)) {
        nodes.push({ text: m[1].replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'), id: m[2], x: (+m[3] + +m[5]) >> 1, y: (+m[4] + +m[6]) >> 1 });
      }
      if (nodes.length) return nodes;
    } catch (e) { /* the screen was still changing */ }
  }
  return [];
}
async function tapScreenText(want, label) {
  for (let tries = 0; tries < 4; tries++) {
    await sleep(600);
    const n = screenNodes().find(n => n.text === want);
    if (n) { adb('shell', 'input', 'tap', String(n.x), String(n.y)); return check(`${label}: "${want}" on screen and tapped`, true); }
    // a long list: scroll the dialog up a little and look again
    adb('shell', 'input', 'swipe', String(screenW >> 1), String(Math.round(screenH * 0.7)), String(screenW >> 1), String(Math.round(screenH * 0.4)), '300');
  }
  return check(`${label}: "${want}" on screen and tapped`, false);
}
async function pick(field, value, label) {
  await tap('#p-' + field, label + ' picker');
  const text = await js(`(function(){var s=document.getElementById('p-${field}');for(var i=0;i<s.options.length;i++)if(s.options[i].value===${JSON.stringify(value)})return s.options[i].textContent;return null})()`);
  await tapScreenText(text, label);
  return waitFor(`document.getElementById('p-${field}').value===${JSON.stringify(value)}`, 3000);
}

// -------------------------------------------------------------------- run
let finished = false;
function finish(stop) {
  if (finished) return; finished = true;
  try { fs.writeFileSync(path.join(OUT, 'logcat.txt'), adb('logcat', '-d')); } catch (e) { /* best effort */ }
  if (stop) failures = failures || 1;
  console.log(failures ? `tap-through: ${failures} FAILED` : 'tap-through: every screen and control responded');
  try { if (ws) ws.close(); } catch (e) { /* closing */ }
  process.exit(failures ? 1 : 0);
}
const K = 'window.__blackpool';
const inkCount = () => js(`Object.keys(${K}.book.ink).length`);
const pencilCount = () => js(`Object.keys(${K}.book.pencil).length`);

(async () => {
  adb('wait-for-device');
  adb('install', '-r', APK);
  try { adb('shell', 'pm', 'clear', PKG); } catch (e) { /* fresh install */ }
  adb('logcat', '-c');
  adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1');
  await connect();
  [screenW, screenH] = adb('shell', 'wm', 'size').match(/(\d+)x(\d+)\s*$/).slice(1).map(Number);
  dpr = await js('devicePixelRatio');
  await sleep(1500);
  shot('shelf');

  // 1. The shelf. Calibrate on the masthead (no handler).
  check('the shelf lists six cases', await waitFor(`document.querySelectorAll('#case-list li').length===6`));
  await js(`window.__tt=[];addEventListener('pointerdown',function(e){__tt.push([e.clientX,e.clientY])},true);1`);
  {
    const m = await measure('.masthead h1');
    const sx = Math.round(m.cx * dpr), sy = Math.round(m.cy * dpr);
    adb('shell', 'input', 'tap', String(sx), String(sy));
    if (!(await waitFor('__tt.length>0'))) fatal('a tap on the screen never reached the page (touch input is not getting through)');
    const [px, py] = await js('__tt[__tt.length-1]');
    offX = sx - px * dpr; offY = sy - py * dpr;
    console.log(`geometry: screen ${screenW}x${screenH}, devicePixelRatio ${dpr}, page offset ${offX.toFixed(1)},${offY.toFixed(1)}`);
    check('touch reaches the page where it was aimed', Math.abs(offX) < screenW && Math.abs(offY) < screenH);
  }
  await tap('#slots button[data-slot="B"]', 'Casebook B');
  check('casebook B is chosen', await waitFor(`${K}.profile.slot==='B'`));
  await tap('#slots button[data-slot="A"]', 'Casebook A');
  check('casebook A is chosen', await waitFor(`${K}.profile.slot==='A'`));
  await tap('#opt-large', 'Large text');
  check('Large text turns on', await waitFor(`document.documentElement.classList.contains('large')`));
  await tap('#opt-large', 'Large text again');
  check('Large text turns off', await waitFor(`!document.documentElement.classList.contains('large')`));

  // 2. The free first case: tabs and the evidence reader.
  await tap('#case-list li:nth-child(1) button', 'First case');
  check('the first case opens on its brief', await waitFor(`document.getElementById('screen-case').classList.contains('active')&&document.querySelector('.tab[data-tab="brief"]').classList.contains('active')`));
  for (const t of ['evidence', 'people', 'book', 'notes', 'brief']) {
    await tap(`.tab[data-tab="${t}"]`, `${t} tab`);
    check(`the ${t} tab opens`, await waitFor(`document.getElementById('tab-${t}').classList.contains('active')`));
  }
  await tap('.tab[data-tab="evidence"]', 'evidence tab');
  await tap('#evidence-list li:nth-child(1) button', 'First document');
  check('a document opens in the reader', await waitFor(shown('modal-evidence')));
  await tap('#ev-next', 'Next document');
  check('the reader pages on', await waitFor(`document.getElementById('ev-kind').textContent.indexOf('2 of')>=0`));
  await tap('#ev-prev', 'Previous document');
  check('the reader pages back', await waitFor(`document.getElementById('ev-kind').textContent.indexOf('1 of')>=0`));
  shot('evidence');
  await tap('#ev-close', 'Close the reader');
  check('the reader closes', await waitFor(hidden('modal-evidence')));

  // 3. The book: a wrong three stays in pencil, a right three takes ink. Every
  // entry goes in through the picker a player uses.
  await tap('.tab[data-tab="book"]', 'book tab');
  const sol = await js(`(function(){var c=${K}.case;return {ids:c.figures.map(function(f){return f.id}),s:${K}.E.solutionOf(c)}})()`);
  const [a, b2, c3] = sol.ids;
  const wrong = sol.s[a].verdict === 'truthful' ? 'liar' : 'truthful';
  const entries = [[a, 'verdict', wrong], [b2, 'verdict', sol.s[b2].verdict], [c3, 'verdict', sol.s[c3].verdict]];
  for (const [id, f, v] of entries) {
    const row = sol.ids.indexOf(id) + 2;
    await tap(`#book-table tr:nth-child(${row}) td:nth-child(4) button`, `Book cell ${id}.${f}`);
    check(`the person sheet opens for ${id}`, await waitFor(shown('modal-person')));
    check(`the ${id}.${f} picker sets the entry`, await pick(f, v, `${id}.${f}`));
    await tap('#p-close', 'Done');
    check('Done closes the person sheet', await waitFor(hidden('modal-person')));
  }
  shot('wrong-three');
  check('a wrong three stays in pencil, silently', (await inkCount()) === 0 && (await pencilCount()) === 3);
  await tap(`#book-table tr:nth-child(2) td:nth-child(4) button`, `Book cell ${a}.verdict again`);
  check(`the ${a}.verdict picker corrects the entry`, await pick('verdict', sol.s[a].verdict, `${a}.verdict`));
  check('a right three takes ink together', await waitFor(`Object.keys(${K}.book.ink).length===3`));
  // The ink message must not stand in the way of the sheet's own button.
  await tap('#p-close', 'Done (just after the ink message)');
  check('Done works while the ink message shows', await waitFor(hidden('modal-person'), 1500));
  shot('ink');

  // 4. Start this case again, through its confirm dialog.
  await tap('.tab[data-tab="brief"]', 'brief tab');
  await tap('#btn-restart', 'Start this case again');
  await tapScreenText('OK', 'Confirm dialog');
  check('the case is blank again', await waitFor(`Object.keys(${K}.book.ink).length===0`));

  // 5. Back to the shelf; a paid case offers the full casebook. No Play Store
  // here, so the sheet must say so and let the player carry on.
  await tap('#btn-back', 'Back to the shelf');
  check('the shelf shows again', await waitFor(`document.getElementById('screen-home').classList.contains('active')`));
  check('the app has the Play billing bridge', await js('!!window.AndroidBilling'));
  await tap('#case-list li:nth-child(2) button', 'Second case');
  check('a paid case offers the full casebook', await waitFor(shown('modal-unlock')));
  check('without a Play Store the sheet says so', await waitFor(`!document.getElementById('u-note').hidden&&document.getElementById('u-note').textContent.length>10`, 8000), await js(`document.getElementById('u-note').textContent`));
  shot('unlock');
  if (await js(`!document.getElementById('u-buy').disabled`)) {
    await tap('#u-buy', 'Unlock button');
    check('the unlock button answers and is not left waiting', await waitFor(`!${K}.billing.state.busy&&!document.getElementById('u-note').hidden`, 10000));
    check('nothing unlocked without Play', await js(`!${K}.billing.state.owned&&${shown('modal-unlock')}`));
  }
  if (await js(`!document.getElementById('u-restore').disabled`)) {
    await tap('#u-restore', 'Restore purchase');
    check('Restore answers and is not left waiting', await waitFor(`!${K}.billing.state.busy`, 10000));
  }
  await tap('#u-later', 'Not now');
  check('Not now goes back to the shelf', await waitFor(`${hidden('modal-unlock')}&&document.getElementById('screen-home').classList.contains('active')`));

  // 6. Back leaves without a crash, and the casebook is still there on relaunch.
  await js(`(function(){var k=${K};k.loadCase('train');var ids=k.case.figures.map(function(f){return f.id});k.fillInk([ids[0]+'.name',ids[1]+'.name',ids[2]+'.name']);k.closeCase();k.save()})();1`);
  adb('shell', 'input', 'keyevent', '4');
  await sleep(1500);
  const log1 = adb('logcat', '-d');
  check('Back leaves without a crash', !new RegExp(`FATAL EXCEPTION[\\s\\S]{0,200}Process: ${PKG.replace(/\./g, '\\.')}`).test(log1));
  try { ws.close(); } catch (e) { /* reconnecting */ } ws = null;
  adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1');
  await connect();
  await sleep(1000);
  check('the casebook is kept on relaunch', await waitFor(`Object.keys((${K}.profile.books.A.train||{ink:{}}).ink).length===3`));
  shot('relaunch');

  const log = adb('logcat', '-d');
  check('no crash', !new RegExp(`FATAL EXCEPTION[\\s\\S]{0,200}Process: ${PKG.replace(/\./g, '\\.')}`).test(log));
  check(`no "app not responding"`, !log.includes(`ANR in ${PKG}`));
  check('no errors in the page', pageErrors.length === 0, pageErrors.join(' | '));
  check('the app is still running', alive());
  finish(false);
})().catch(e => { console.log('FAIL tap-through stopped: ' + (e && e.stack || e)); finish(true); });
