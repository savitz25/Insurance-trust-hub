import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const directory = dirname(fileURLToPath(import.meta.url));
const jsx = (type, props) => ({ type, props });
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(kind, { failure = false, deferred = false, guest = false } = {}) {
  let index = 0, user = guest ? null : { id: 'synthetic-A' }, resolveSave;
  const state = [], writes = [], notices = [];
  const save = async payload => {
    writes.push(payload);
    if (deferred) return new Promise(resolve => { resolveSave = resolve; });
    return failure ? { ok: false, error: 'Synthetic failure' } : { ok: true, basketId: 'synthetic' };
  };
  const mocks = {
    react: { useState(initial) { const i = index++; if (!(i in state)) state[i] = initial; return [state[i], v => { state[i] = v; }]; } },
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': { default: 'Link' },
    'next/navigation': { useRouter: () => ({ push() {}, refresh() {} }) },
    'lucide-react': { BookmarkPlus: 'Icon', Check: 'Icon', Loader2: 'Icon' },
    '@/components/ui/button': { Button: 'Button' },
    '@/components/my-insurance/my-insurance-provider': { useMyInsuranceOptional: () => ({ user, loading: false }) },
    '@/actions/my-insurance': { saveDrugBasketAction: save, saveCalculatorResultAction: save },
    '@/lib/my-insurance/storage': { addToolSnapshot: () => ({}), getLastSaveError: () => null },
    '@/lib/my-insurance/guest-storage': { stashPendingSaveAction() {}, stashPostLoginRedirect() {} },
    '@/lib/my-insurance/drug-basket-local': { saveLocalAccountDrugBasket() {} },
    '@/lib/my-insurance/constants': { MY_INSURANCE_PATH: '/my-insurance', DRUG_BASKET_PATH: '/tools/prescription-drug-list' },
    sonner: { toast: Object.fromEntries(['success', 'error', 'message'].map(k => [k, message => notices.push({ kind: k, message })])) },
    '@/lib/utils': { cn: () => '' },
  };
  const context = { exports: {}, console, require: name => { assert.ok(name in mocks, name); return mocks[name]; } };
  const file = kind === 'basket' ? 'save-drug-basket-button.tsx' : 'save-calculator-button.tsx';
  vm.runInNewContext(ts.transpileModule(readFileSync(resolve(directory, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const component = context.exports[kind === 'basket' ? 'SaveDrugBasketButton' : 'SaveCalculatorButton'];
  const render = props => { index = 0; const tree = component(props); return kind === 'basket' ? tree.props.children[0] : tree; };
  return { writes, notices, render, switchUser: () => { user = { id: 'synthetic-B' }; }, finish: () => resolveSave({ ok: true, basketId: 'synthetic' }), async click(props) { render(props).props.onClick(); await tick(); } };
}
const basket = { basketName: 'Synthetic basket', items: [{ name: 'Synthetic medicine', strength: 'synthetic', dosage: 'synthetic' }] };
const calculator = { calculatorId: 'aca', title: 'Synthetic calculation', snapshot: { inputs: { amount: 1 }, outputs: { result: 2 } } };
const edited = (kind, props) => kind === 'basket'
  ? { ...props, items: [{ ...props.items[0], dosage: 'edited synthetic' }] }
  : { ...props, snapshot: { ...props.snapshot, inputs: { amount: 3 }, outputs: { result: 6 } } };

for (const [kind, props] of [['basket', basket], ['calculator', calculator]]) {
  test(`${kind}: changed content can be saved and equivalent rerenders stay saved`, async () => {
    const f = fixture(kind); await f.click(props);
    assert.equal(f.render(JSON.parse(JSON.stringify(props))).props.disabled, true);
    const changed = edited(kind, props);
    assert.equal(Boolean(f.render(changed).props.disabled), false);
    await f.click(changed); assert.equal(f.writes.length, 2);
    assert.equal(f.render(changed).props.disabled, true);
  });
  test(`${kind}: rename and account switch invalidate the previous Saved state`, async () => {
    const f = fixture(kind); await f.click(props);
    const renamed = kind === 'basket' ? { ...props, basketName: 'Renamed' } : { ...props, title: 'Renamed' };
    assert.equal(Boolean(f.render(renamed).props.disabled), false);
    f.switchUser(); assert.equal(Boolean(f.render(props).props.disabled), false);
  });
  test(`${kind}: in-flight completion cannot mark edited input saved`, async () => {
    const f = fixture(kind, { deferred: true }); await f.click(props);
    const changed = edited(kind, props); f.render(changed);
    f.finish(); await tick();
    assert.equal(Boolean(f.render(changed).props.disabled), false);
    assert.equal(f.writes.length, 1);
  });
  test(`${kind}: failed cloud action does not show Saved`, async () => {
    const f = fixture(kind, { failure: true }); await f.click(props);
    assert.equal(Boolean(f.render(props).props.disabled), false);
    assert.equal(f.notices.some(n => n.kind === 'success'), false);
  });
}
test('guest calculator permits saving edited device results', async () => {
  const f = fixture('calculator', { guest: true }); await f.click(calculator);
  assert.equal(f.render(calculator).props.disabled, true);
  assert.equal(Boolean(f.render(edited('calculator', calculator)).props.disabled), false);
  assert.equal(f.writes.length, 0);
});
test('account entry links to canonical Ask and retains the specialist workspace', () => {
  const source = readFileSync(resolve(directory, '../../app/my-trusthub/page.tsx'), 'utf8');
  assert.match(source, /href="https:\/\/www\.asktrusthub\.com\/my"/);
  assert.match(source, /href=\{MY_INSURANCE_PATH\}/);
  assert.match(source, /Sync to My TrustHub is off/);
});
