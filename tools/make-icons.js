// Renders app icons and the staged store screenshot with the pre-installed Chromium. node tools/make-icons.js [pageUrl]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f3ecdd"/>
<g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
<rect x="56" y="56" width="400" height="400" rx="18" fill="none" stroke="#1f1a14" stroke-width="10"/>
<rect x="96" y="96" width="320" height="320" rx="8" fill="#fbf7ee" stroke="#1f1a14" stroke-width="6"/>
<text x="256" y="215" font-family="Georgia, serif" font-size="150" font-weight="700" text-anchor="middle" fill="#1f1a14">9:15</text>
<line x1="130" y1="260" x2="382" y2="260" stroke="#1f1a14" stroke-width="6"/>
<text x="256" y="330" font-family="Georgia, serif" font-size="52" text-anchor="middle" fill="#8a1c1c" letter-spacing="6">BLACKPOOL</text>
<circle cx="170" cy="380" r="12" fill="#1d3a6b"/><circle cx="256" cy="380" r="12" fill="#1d3a6b"/><circle cx="342" cy="380" r="12" fill="#1d3a6b"/>
</g></svg>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  const out = path.join(__dirname, '..', 'icons'); fs.mkdirSync(out, { recursive: true });
  for (const [name, pad, size] of [['icon-512.png', 0, 512], ['icon-192.png', 0, 192], ['maskable-512.png', 60, 512]]) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0">${svg(pad).replace('viewBox="0 0 512 512"', `viewBox="0 0 512 512" width="${size}" height="${size}"`)}</body></html>`);
    await p.screenshot({ path: path.join(out, name), clip: { x: 0, y: 0, width: size, height: size } });
  }
  const base = process.argv[2];
  if (base) {
    const q = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
    await q.goto(base); await q.waitForSelector('#app:not([hidden])');
    await q.evaluate(() => { const T = window.__blackpool; T.loadCase('train'); T.fillInk(['f1.name', 'f1.where', 'f1.verdict', 'f4.name', 'f2.name', 'f8.name']); T.set('f3', 'where', 'Compartment C'); T.set('f6', 'verdict', 'liar'); T.set('f2', 'where', 'the corridor'); T.setTab('book'); });
    await q.waitForTimeout(300); await q.screenshot({ path: path.join(out, 'screenshot-portrait.png') });
  }
  await b.close(); console.log('icons written');
})();
