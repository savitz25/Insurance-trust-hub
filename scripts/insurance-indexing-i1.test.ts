import assert from 'node:assert/strict';
import { test } from 'node:test';
import sitemap from '../app/sitemap';
import acaPage, { metadata as acaMetadata } from '../app/hubs/aca/page';
import medicarePage, { metadata as medicareMetadata } from '../app/hubs/medicare/page';
import robots from '../app/robots';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';

Object.assign(globalThis, { React });

test('empty ACA and Medicare topics stay noindex and are excluded from the sitemap', async () => {
  const paths = new Set((await sitemap()).map(({ url }) => new URL(url).pathname));
  const robotsRules = robots().rules;
  const disallowed = robotsRules.flatMap((rule) => rule.disallow ?? []);
  assert.equal(disallowed.some((path) => ['/hubs/aca', '/hubs/medicare'].includes(path)), false);

  for (const [path, metadata, page] of [
    ['/hubs/aca', acaMetadata, acaPage],
    ['/hubs/medicare', medicareMetadata, medicarePage],
  ] as const) {
    assert.equal(metadata.robots && typeof metadata.robots === 'object' && 'index' in metadata.robots && metadata.robots.index, false);
    assert.equal(metadata.alternates?.canonical, `https://www.insurancetrusthub.com${path}`);
    assert.equal(paths.has(path), false);

    const router = { push() {} } as never;
    const html = renderToStaticMarkup(
      createElement(AppRouterContext.Provider, { value: router }, createElement(page))
    );
    assert.match(html, /<h1\b[^>]*>[^<]+<\/h1>/);
    assert.ok(html.length > 500, `${path} should render its educational content on the server`);
  }
});
