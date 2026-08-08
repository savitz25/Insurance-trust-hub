/** Discover providers schema across env Supabase projects. */
import fs from 'fs';

function loadEnvFile(filePath) {
  const urls = [];
  const keys = [];
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (m[1] === 'NEXT_PUBLIC_SUPABASE_URL' || m[1] === 'SUPABASE_URL') urls.push(v);
    if (m[1] === 'SUPABASE_SERVICE_ROLE_KEY' || m[1] === 'SOURCE_SUPABASE_SERVICE_ROLE_KEY')
      keys.push({ name: m[1], v });
  }
  return { urls: [...new Set(urls)], keys };
}

const envPath =
  process.env.OPS_ENV_FILE ||
  'C:/Users/Michael.Savitsky/move-trust-hub-temp/.env.local';
const { urls, keys } = loadEnvFile(envPath);
console.log(
  'urls',
  urls.map((u) => new URL(u).hostname),
  'keys',
  keys.map((k) => k.name + ':' + k.v.slice(0, 10))
);

for (const url of urls) {
  for (const key of keys) {
    const ref = new URL(url).hostname.split('.')[0];
    // select * limit 1
    const r = await fetch(`${url}/rest/v1/providers?select=*&limit=1`, {
      headers: {
        apikey: key.v,
        Authorization: `Bearer ${key.v}`,
        Prefer: 'count=exact',
      },
    });
    const text = await r.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 180);
    }
    const cols =
      Array.isArray(body) && body[0] ? Object.keys(body[0]).sort() : null;
    console.log('\n', ref, key.name, 'status', r.status, 'range', r.headers.get('content-range'));
    if (cols) console.log('  columns', cols.join(', '));
    else console.log('  body', typeof body === 'string' ? body : JSON.stringify(body).slice(0, 250));
  }
}
