import assert from 'node:assert/strict';
import { test } from 'node:test';

const base = process.env.INSURANCE_TEST_BASE_URL ?? 'http://127.0.0.1:3123';

test('nonindexable specialty pages return server HTML with matching canonical/robots and stay out of sitemap', async () => {
  for (const [path, h1] of [
    ['/hubs/aca', 'ACA Marketplace Research'],
    ['/hubs/medicare', 'Medicare Insurance Research'],
  ]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200, `${path} HTTP status`);
    const html = await response.text();
    assert.match(html, new RegExp(`<h1[^>]*>${h1}</h1>`), `${path} server HTML h1`);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://www\\.insurancetrusthub\\.com${path.replaceAll('/', '\\/')}"`));
    assert.match(html, /<meta name="robots" content="noindex, follow"/);
  }

  const [sitemapResponse, robotsResponse] = await Promise.all([
    fetch(`${base}/sitemap.xml`),
    fetch(`${base}/robots.txt`),
  ]);
  assert.equal(sitemapResponse.status, 200, 'sitemap HTTP status');
  assert.equal(robotsResponse.status, 200, 'robots HTTP status');
  const sitemap = await sitemapResponse.text();
  const robots = await robotsResponse.text();
  assert.doesNotMatch(sitemap, /https:\/\/www\.insurancetrusthub\.com\/hubs\/(aca|medicare)(?:<|\/)/);
  assert.doesNotMatch(robots, /Disallow:\s*\/hubs\/(aca|medicare)/i);
});
