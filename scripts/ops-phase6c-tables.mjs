import fs from 'fs';

function load() {
  const raw = fs.readFileSync(
    process.env.OPS_ENV_FILE ||
      'C:/Users/Michael.Savitsky/move-trust-hub-temp/.env.local',
    'utf8'
  );
  const urls = [];
  const keys = [];
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (m[1] === 'NEXT_PUBLIC_SUPABASE_URL') urls.push(v);
    if (m[1] === 'SUPABASE_SERVICE_ROLE_KEY') keys.push(v);
  }
  return { urls, keys };
}

const { urls, keys } = load();
const pairs = [];
for (let i = 0; i < Math.max(urls.length, keys.length); i++) {
  if (urls[i] && keys[i]) pairs.push([urls[i], keys[i]]);
}

for (const [url, key] of pairs) {
  const ref = new URL(url).hostname.split('.')[0];
  for (const table of ['providers', 'companies', 'lenders', 'reviews']) {
    const r = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'count=exact',
      },
    });
    const t = await r.text();
    console.log(
      ref,
      table,
      r.status,
      r.headers.get('content-range'),
      t.slice(0, 100).replace(/\s+/g, ' ')
    );
  }
}
