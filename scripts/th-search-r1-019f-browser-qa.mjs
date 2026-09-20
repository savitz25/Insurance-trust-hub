/**
 * TH-SEARCH-R1-019F browser QA. Real Chromium, real keyboard typing + Enter, real clicks, Back / Forward /
 * reload, three viewports. Runs against a locally started OPTIMIZED runtime (`next build && next start`).
 * Playwright is not a dependency of this repo; point PLAYWRIGHT_PATH at any local install:
 *   PLAYWRIGHT_PATH=/path/to/node_modules/playwright BASE=http://localhost:3947 node scripts/th-search-r1-019f-browser-qa.mjs <label>
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const BASE = process.env.BASE ?? 'http://localhost:3947';
const label = process.argv[2] ?? 'run';
const OUT = `docs/qa/th-search-r1-019f/browser-qa.${label}.json`;
if (fs.existsSync(OUT)) { console.error(`${OUT} exists; one pass per label.`); process.exit(1); }
const FROZEN = 'allied';
const steps = []; let failures = 0;
const step = (name, ok, detail) => { steps.push({ name, ok, ...detail }); if (!ok) failures += 1; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail)); };

const probe = (page) => page.evaluate(() => ({
  url: location.pathname + location.search,
  overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
  innerWidth: window.innerWidth,
  cards: [...document.querySelectorAll('[data-specialist-results] ol > li h3')].map((h) => h.textContent),
  nav: [...document.querySelectorAll('[data-name-candidate-nav] a')].map((a) => a.textContent.trim()),
  badLinks: [...document.querySelectorAll('a[href]')].filter((a) => /=(undefined|null)(&|$)/.test(a.getAttribute('href'))).length,
  profileButtons: document.querySelectorAll('[data-specialist-event=profile_open]').length,
  researchOnlyNotes: [...document.querySelectorAll('[data-specialist-results] ol > li')].filter((li) => /public graph-agency profile is not currently published/.test(li.textContent)).length,
  forbiddenCopy: /\b\d+ total\b|all results|complete list/i.test(document.body.innerText),
  moreMessage: /More matching source-name candidates are available/.test(document.body.innerText),
  noMatch: /No matching indexed research identity/.test(document.body.innerText),
  headings: [...document.querySelectorAll('[data-specialist-results] h2')].map((h) => h.textContent),
}));

async function search(page, text) {
  await page.goto(`${BASE}/ask`);
  const box = page.getByRole('searchbox').or(page.getByRole('textbox')).first();
  await box.click(); await page.keyboard.type(text, { delay: 25 }); await page.keyboard.press('Enter');
  await page.waitForURL(/[?&]q=/); await page.waitForSelector('[data-specialist-results]');
  return probe(page);
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // 1-3: historical controls, typed + Enter.
  for (const term of ['allied', 'beacon', 'summit']) {
    const p = await search(page, term);
    step(`${term}: typed + Enter shows a full first candidate window with a truthful continuation`, p.cards.length === 10 && p.nav.includes('Next') && !p.nav.includes('Previous') && p.moreMessage && !p.forbiddenCopy && p.badLinks === 0 && !/undefined|null/.test(p.url), { url: p.url, cards: p.cards.length, nav: p.nav, badLinks: p.badLinks, forbiddenCopy: p.forbiddenCopy });
    step(`${term}: research-only agencies expose no profile button`, p.profileButtons === 0 && p.researchOnlyNotes === p.cards.length, { profileButtons: p.profileButtons, researchOnlyNotes: p.researchOnlyNotes });
  }

  // 4-5: frozen multi-window name; move to the next window by CLICKING Next.
  const w1 = await search(page, FROZEN);
  await page.getByRole('navigation', { name: 'Source-name candidate windows' }).getByRole('link', { name: 'Next' }).click();
  await page.waitForURL(/page=2/); await page.waitForSelector('[data-specialist-results]');
  const w2 = await probe(page);
  step('window 2: genuinely different candidates, none repeated from window 1, no stale cards', w2.cards.length === 10 && w2.cards.every((c) => !w1.cards.includes(c)) && w2.nav.includes('Previous') && w2.nav.includes('Next') && w2.badLinks === 0, { url: w2.url, overlap: w2.cards.filter((c) => w1.cards.includes(c)), nav: w2.nav });

  // 6: select a candidate FROM WINDOW 2 by clicking its own link.
  const intended = w2.cards[3];
  const card = page.locator('[data-specialist-results] ol > li').nth(3);
  await card.getByRole('link', { name: 'Select this identity and continue' }).click();
  await page.waitForURL(/selected=/); await page.waitForSelector('[data-specialist-results]');
  const sel = await probe(page);
  step('selecting a window-2 candidate reopens exactly that source identity (server-revalidated)', sel.cards.length === 1 && sel.cards[0] === intended && !/undefined|null/.test(sel.url) && sel.badLinks === 0, { intended, shown: sel.cards, url: sel.url });

  // 7-9: Back, Forward, reload.
  await page.goBack(); await page.waitForSelector('[data-specialist-results]'); const back = await probe(page);
  step('Back returns to window 2 with the same candidates', /page=2/.test(back.url) && JSON.stringify(back.cards) === JSON.stringify(w2.cards), { url: back.url });
  await page.goForward(); await page.waitForSelector('[data-specialist-results]'); const fwd = await probe(page);
  step('Forward returns to the selected identity', fwd.cards.length === 1 && fwd.cards[0] === intended, { shown: fwd.cards });
  await page.reload(); await page.waitForSelector('[data-specialist-results]'); const re = await probe(page);
  step('Reload keeps the selected identity (no substitution)', re.cards.length === 1 && re.cards[0] === intended, { shown: re.cards });

  // Last window + Previous.
  await page.goto(`${BASE}/ask?q=${FROZEN}&page=5`); await page.waitForSelector('[data-specialist-results]'); const last = await probe(page);
  step('last window: Previous only, no Next, no "more" message', last.cards.length > 0 && last.nav.includes('Previous') && !last.nav.includes('Next') && !last.moreMessage, { cards: last.cards.length, nav: last.nav });
  // A stale / wrong selection typed into the URL fails closed.
  await page.goto(`${BASE}/ask?q=beacon&selected=${new URL(BASE + sel.url).searchParams.get('selected')}`); await page.waitForSelector('[data-specialist-results]'); const stale = await probe(page);
  step('an allied identity selected under a beacon request fails closed (no identity shown)', stale.cards.length === 0, { shown: stale.cards });

  // 10: genuine miss.
  const miss = await search(page, 'Zyqorvane Underwriters');
  step('genuine miss: honest no-match, no candidates, no continuation', miss.cards.length === 0 && miss.noMatch && miss.nav.length === 0, { headings: miss.headings });

  // 11-13: viewports, on the multi-window page 2 (Previous + Next both present).
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/ask?q=${FROZEN}&page=2`); await page.waitForSelector('[data-specialist-results]');
    const v = await probe(page);
    await page.screenshot({ path: `docs/qa/th-search-r1-019f/browser-${label}-${width}.png`, fullPage: false });
    step(`${width}px: no horizontal overflow, candidates and both window links present`, !v.overflowX && v.cards.length === 10 && v.nav.includes('Previous') && v.nav.includes('Next'), { innerWidth: v.innerWidth, overflowX: v.overflowX, nav: v.nav });
  }
} finally { await browser.close(); }

fs.writeFileSync(OUT, JSON.stringify({ label, base: BASE, ranAt: new Date().toISOString(), failures, steps }, null, 2) + '\n');
console.log(`${steps.length - failures}/${steps.length} passed`);
process.exit(failures ? 1 : 0);
