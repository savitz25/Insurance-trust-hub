// Isolated browser fixture: real control/storage; auth and cloud are MOCKED.
// No credentials, external calls, application route, or database writes.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = process.cwd();
const baseline = process.argv.includes('--baseline');
const entry = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SaveProviderButton } from './components/my-insurance/save-provider-button';
import * as storage from './lib/my-insurance/storage';
import { Toaster } from 'sonner';
window.b3 = {
  cloud: [], events: [], storage, slug: 'b3-fixture',
  context: { loading: false, user: null, workspaceStorage: { syncStatus: 'local_only' },
    isProviderSaved: () => false, markProviderSaved: slug => window.b3.events.push(slug) },
  render(slug = this.slug) {
    this.slug = slug;
    root.render(<main><h1>insurance isolated Save QA</h1><SaveProviderButton providerSlug={slug} providerName={slug} /><Toaster /></main>);
  },
  auth(user, loading = false) {
    this.context = { ...this.context, user: user ? {id:user} : null, loading };

    this.render();
  }
};
const root = createRoot(document.getElementById('root'));
window.b3.render();
`;
const mocks = {
  'next/link': "import React from 'react'; export default function Link(props) { return React.createElement('a',props); }",
  '@/components/my-insurance/my-insurance-provider': 'export const useMyInsuranceOptional = () => window.b3.context;',
  './my-insurance-provider': 'export const useMyInsuranceOptional = () => window.b3.context;',
  '@/actions/my-insurance': `export async function saveProviderAction(input) {
    window.b3.cloud.push(input);
    if (window.b3.delayCloud) await new Promise(done => window.b3.finishCloud = done);
    return window.b3.failCloud ? {ok:false,error:'fixture failure'} : {ok:true};
  }
  export async function removeProviderAction() { return {ok:true}; }`,
  '@/lib/analytics/ga-events': 'export const trackMyLendingSave = input => window.b3.events.push(input);',
};
const result = await build({
  stdin: { contents: entry, resolveDir: root, loader: 'tsx' },
  bundle: true, write: false, format: 'esm', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"development"', 'process.env': '{}' },
  plugins: [{ name:'isolated-adapters', setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => mocks[args.path] ? { path: args.path, namespace:'mock' } : null);
    builder.onLoad({ filter: /.*/, namespace:'mock' }, args => ({ contents:mocks[args.path],loader:'js',resolveDir:root }));
    if (baseline) builder.onLoad({ filter: /save-provider-button\.tsx$/ }, () => ({
      contents: execFileSync('git',['show','860345d85adcc2616efe5768acf5d941c7f8cf92:components/my-insurance/save-provider-button.tsx'],{encoding:'utf8'}),
      loader:'tsx', resolveDir:resolve(root,'components/my-insurance')
    }));
  }}],
});
const server = createServer((req,res) => {
  if(req.url === '/app.js') {res.setHeader('Content-Type','text/javascript');res.end(result.outputFiles[0].text);return;}
  res.setHeader('Content-Type','text/html');
  res.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>B3 insurance fixture</title><style>body{font:16px sans-serif;margin:16px}button{padding:12px;max-width:100%}svg{width:16px;height:16px}button:focus-visible{outline:3px solid blue}[role=alert]{max-width:256px;overflow-wrap:anywhere}</style><div id="root"></div><script type="module" src="/app.js"></script></html>');
});
server.listen(4312,'127.0.0.1',()=>console.log('B3 insurance: http://127.0.0.1:4312; auth/cloud MOCKED; baseline='+baseline));
