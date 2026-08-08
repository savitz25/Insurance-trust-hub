/**
 * ImprovMX inbound setup helpers for insurancetrusthub.com
 *
 * Usage:
 *   node scripts/improvmx-dns.mjs verify          # public DNS only (no secrets)
 *   node scripts/improvmx-dns.mjs apply-vercel    # needs VERCEL_TOKEN
 *   node scripts/improvmx-dns.mjs apply-improvmx  # needs IMPROVMX_API_KEY
 *   node scripts/improvmx-dns.mjs apply-all       # both
 *
 * Env:
 *   VERCEL_TOKEN          — Vercel personal token
 *   VERCEL_TEAM_ID        — optional team id
 *   IMPROVMX_API_KEY      — from https://app.improvmx.com (Account → API)
 *   OPERATOR_INBOX        — default info@movetrusthub.com
 */

const DOMAIN = 'insurancetrusthub.com';
const OPERATOR =
  process.env.OPERATOR_INBOX?.trim() || 'info@movetrusthub.com';

const IMPROVMX_MX = [
  { priority: 10, value: 'mx1.improvmx.com.' },
  { priority: 20, value: 'mx2.improvmx.com.' },
];

/** Apex SPF for inbound forward only. Resend outbound stays on send. subdomain. */
const IMPROVMX_SPF = 'v=spf1 include:spf.improvmx.com ~all';

const cmd = process.argv[2] || 'verify';

async function dnsGoogle(name, type) {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`DNS HTTP ${res.status}`);
  return res.json();
}

async function verify() {
  console.log(`\n=== Public DNS verify: ${DOMAIN} ===\n`);
  const mx = await dnsGoogle(DOMAIN, 'MX');
  const txt = await dnsGoogle(DOMAIN, 'TXT');
  const answers = mx.Answer || [];
  const mxHosts = answers
    .map((a) => {
      const parts = String(a.data || '').trim().split(/\s+/);
      return {
        priority: Number(parts[0]),
        host: (parts[1] || '').replace(/\.$/, '').toLowerCase(),
      };
    })
    .filter((m) => m.host);

  console.log('MX records:');
  if (!mxHosts.length) {
    console.log('  (none) — inbound mail cannot be delivered');
  } else {
    for (const m of mxHosts) console.log(`  ${m.priority} ${m.host}`);
  }

  const expected = new Set(IMPROVMX_MX.map((m) => m.value.replace(/\.$/, '').toLowerCase()));
  const have = new Set(mxHosts.map((m) => m.host));
  const mxOk =
    expected.size === have.size && [...expected].every((h) => have.has(h));

  const txts = (txt.Answer || []).map((a) =>
    String(a.data || '')
      .replace(/^"|"$/g, '')
      .replace(/" "/g, '')
  );
  console.log('\nTXT records:');
  for (const t of txts) console.log(`  ${t.slice(0, 120)}`);

  const spf = txts.find((t) => t.toLowerCase().startsWith('v=spf1'));
  const spfOk = Boolean(spf && /include:spf\.improvmx\.com/i.test(spf));
  const multiSpf = txts.filter((t) => t.toLowerCase().startsWith('v=spf1')).length > 1;

  console.log('\nChecks:');
  console.log(`  [ ${mxOk ? 'OK' : 'FAIL'} ] MX = mx1 + mx2 improvmx.com only`);
  console.log(`  [ ${spfOk ? 'OK' : 'FAIL'} ] SPF includes spf.improvmx.com`);
  console.log(`  [ ${!multiSpf ? 'OK' : 'FAIL'} ] Single SPF TXT at apex (not multiple)`);

  const pass = mxOk && spfOk && !multiSpf;
  console.log(
    pass
      ? '\nPASS — DNS ready for ImprovMX. Confirm domain Active in app.improvmx.com and send external tests.'
      : '\nFAIL — Add MX/SPF in Vercel DNS (Domains → insurancetrusthub.com → Add DNS Preset → ImprovMX), then re-run verify.'
  );
  console.log(`\nIntended forwards → ${OPERATOR}`);
  console.log(`  hello@${DOMAIN}`);
  console.log(`  contact@${DOMAIN} (optional explicit)`);
  console.log(`  *@${DOMAIN} (catch-all)`);
  return pass;
}

function vercelHeaders() {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) throw new Error('VERCEL_TOKEN is not set');
  const h = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  return h;
}

function teamQuery() {
  const team = process.env.VERCEL_TEAM_ID?.trim();
  return team ? `?teamId=${encodeURIComponent(team)}` : '';
}

async function listVercelRecords() {
  const url = `https://api.vercel.com/v4/domains/${DOMAIN}/records${teamQuery()}`;
  const res = await fetch(url, { headers: vercelHeaders() });
  const body = await res.text();
  if (!res.ok) throw new Error(`Vercel list records ${res.status}: ${body.slice(0, 300)}`);
  const json = JSON.parse(body);
  return json.records || json || [];
}

async function createVercelRecord(record) {
  const url = `https://api.vercel.com/v2/domains/${DOMAIN}/records${teamQuery()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: vercelHeaders(),
    body: JSON.stringify(record),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Vercel create ${JSON.stringify(record)} → ${res.status}: ${body.slice(0, 400)}`);
  return JSON.parse(body);
}

async function deleteVercelRecord(id) {
  const url = `https://api.vercel.com/v2/domains/${DOMAIN}/records/${id}${teamQuery()}`;
  const res = await fetch(url, { method: 'DELETE', headers: vercelHeaders() });
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Vercel delete ${id} → ${res.status}: ${body.slice(0, 300)}`);
  }
}

async function applyVercel() {
  console.log(`\n=== Apply ImprovMX records on Vercel DNS: ${DOMAIN} ===\n`);
  const records = await listVercelRecords();
  const list = Array.isArray(records) ? records : [];

  // Remove non-ImprovMX MX at apex
  for (const r of list) {
    const type = (r.type || '').toUpperCase();
    const name = (r.name || r.slug || '') === '' || r.name === '@' || r.name === DOMAIN;
    if (type === 'MX' && name) {
      const val = String(r.value || r.exchange || '').toLowerCase().replace(/\.$/, '');
      if (!val.includes('improvmx.com')) {
        console.log(`Deleting conflicting MX: ${val} (id ${r.id})`);
        await deleteVercelRecord(r.id);
      } else {
        console.log(`Keeping MX: ${val}`);
      }
    }
  }

  const refreshed = await listVercelRecords();
  const haveMx = new Set(
    (Array.isArray(refreshed) ? refreshed : [])
      .filter((r) => (r.type || '').toUpperCase() === 'MX')
      .map((r) => String(r.value || r.exchange || '').toLowerCase().replace(/\.$/, ''))
  );

  for (const mx of IMPROVMX_MX) {
    const host = mx.value.replace(/\.$/, '').toLowerCase();
    if (haveMx.has(host)) {
      console.log(`MX already present: ${host}`);
      continue;
    }
    console.log(`Creating MX ${mx.priority} ${host}`);
    await createVercelRecord({
      type: 'MX',
      name: '',
      value: host,
      mxPriority: mx.priority,
      ttl: 60,
    });
  }

  // SPF: single apex SPF with Improvmx. Do not touch google-site-verification TXT.
  const after = await listVercelRecords();
  const apexTxt = (Array.isArray(after) ? after : []).filter(
    (r) =>
      (r.type || '').toUpperCase() === 'TXT' &&
      (r.name === '' || r.name === '@' || !r.name)
  );
  const spfRecords = apexTxt.filter((r) =>
    String(r.value || '')
      .toLowerCase()
      .includes('v=spf1')
  );

  if (spfRecords.length === 0) {
    console.log(`Creating SPF: ${IMPROVMX_SPF}`);
    await createVercelRecord({
      type: 'TXT',
      name: '',
      value: IMPROVMX_SPF,
      ttl: 60,
    });
  } else if (spfRecords.length === 1) {
    const val = String(spfRecords[0].value || '');
    if (/include:spf\.improvmx\.com/i.test(val)) {
      console.log(`SPF already includes Improvmx: ${val}`);
    } else {
      console.log(
        `WARNING: Existing apex SPF does not include Improvmx:\n  ${val}\n` +
          `Merge manually to a single record, e.g. include both mechanisms, or replace with:\n  ${IMPROVMX_SPF}\n` +
          `(Resend outbound uses send.${DOMAIN} SPF — apex can be Improvmx-only.)`
      );
    }
  } else {
    console.log(
      `WARNING: Multiple SPF TXT records at apex (${spfRecords.length}). Merge into one.`
    );
  }

  console.log('\nVercel apply finished. Wait 1–15 min, then: node scripts/improvmx-dns.mjs verify');
}

async function improvmxFetch(path, init = {}) {
  const key = process.env.IMPROVMX_API_KEY?.trim();
  if (!key) throw new Error('IMPROVMX_API_KEY is not set');
  const auth = Buffer.from(`api:${key}`).toString('base64');
  const res = await fetch(`https://api.improvmx.com/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`ImprovMX ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return json;
}

async function applyImprovMX() {
  console.log(`\n=== Configure ImprovMX domain + aliases: ${DOMAIN} ===\n`);

  // List domains
  let domains;
  try {
    domains = await improvmxFetch('/domains');
  } catch (e) {
    console.error(e.message);
    throw e;
  }

  const list = domains.domains || domains.data || [];
  const found = (Array.isArray(list) ? list : []).find(
    (d) => (d.domain || d.name || '').toLowerCase() === DOMAIN
  );

  if (!found) {
    console.log(`Adding domain ${DOMAIN}…`);
    try {
      await improvmxFetch('/domains', {
        method: 'POST',
        body: JSON.stringify({ domain: DOMAIN, notification_email: OPERATOR }),
      });
    } catch (e) {
      console.error('Add domain failed (add manually in app.improvmx.com if needed):', e.message);
    }
  } else {
    console.log(`Domain already in ImprovMX: ${DOMAIN} (active=${found.active ?? found.state ?? '?'})`);
  }

  // Aliases: hello, contact, catch-all *
  const aliasesWanted = [
    { alias: 'hello', forward: OPERATOR },
    { alias: 'contact', forward: OPERATOR },
    { alias: '*', forward: OPERATOR },
  ];

  let existing = [];
  try {
    const a = await improvmxFetch(`/domains/${DOMAIN}/aliases`);
    existing = a.aliases || a.data || [];
  } catch (e) {
    console.warn('List aliases failed:', e.message);
  }

  const byAlias = new Map(
    (Array.isArray(existing) ? existing : []).map((row) => [
      String(row.alias || row.source || '').toLowerCase(),
      row,
    ])
  );

  for (const want of aliasesWanted) {
    const cur = byAlias.get(want.alias.toLowerCase());
    if (cur) {
      console.log(`Alias exists: ${want.alias}@${DOMAIN} → ${cur.forward || cur.destination || '?'}`);
      continue;
    }
    console.log(`Creating alias ${want.alias}@${DOMAIN} → ${want.forward}`);
    try {
      await improvmxFetch(`/domains/${DOMAIN}/aliases`, {
        method: 'POST',
        body: JSON.stringify({
          alias: want.alias,
          forward: want.forward,
        }),
      });
    } catch (e) {
      console.error(`  failed: ${e.message}`);
    }
  }

  console.log(
    '\nImprovMX apply finished. Dashboard should show Active after MX/SPF verify. Remove blank alias rows in UI if any.'
  );
}

async function main() {
  try {
    if (cmd === 'verify') {
      const ok = await verify();
      process.exit(ok ? 0 : 1);
    }
    if (cmd === 'apply-vercel') {
      await applyVercel();
      await verify();
      return;
    }
    if (cmd === 'apply-improvmx') {
      await applyImprovMX();
      return;
    }
    if (cmd === 'apply-all') {
      await applyImprovMX();
      await applyVercel();
      await verify();
      return;
    }
    console.error('Unknown command. Use: verify | apply-vercel | apply-improvmx | apply-all');
    process.exit(2);
  } catch (e) {
    console.error('\nError:', e.message || e);
    process.exit(1);
  }
}

main();
