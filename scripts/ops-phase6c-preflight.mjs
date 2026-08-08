/**
 * Phase 6C preflight + candidate inventory (read-only unless --write later).
 * Loads credentials from env or from a path:
 *   OPS_ENV_FILE=... node scripts/ops-phase6c-preflight.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  const urls = [];
  const keys = [];
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (m[1] === 'NEXT_PUBLIC_SUPABASE_URL' || m[1] === 'SUPABASE_URL') {
      urls.push(v);
      env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || v;
    } else if (m[1] === 'SUPABASE_SERVICE_ROLE_KEY') {
      keys.push(v);
      env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || v;
    } else {
      env[m[1]] = v;
    }
  }
  env._urls = urls;
  env._keys = keys;
  return env;
}

function projectRef(url) {
  try {
    return new URL(url).hostname.split('.')[0];
  } catch {
    return url;
  }
}

async function probeProviders(url, key) {
  const r = await fetch(
    `${url}/rest/v1/providers?select=id,slug,name,verified,states_licensed,cities,license_info,contact&limit=8`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'count=exact',
      },
    }
  );
  const range = r.headers.get('content-range');
  const text = await r.text();
  let rows = [];
  try {
    rows = JSON.parse(text);
  } catch {
    return { status: r.status, range, error: text.slice(0, 200) };
  }
  if (!Array.isArray(rows)) {
    return {
      status: r.status,
      range,
      error: typeof rows === 'object' ? JSON.stringify(rows).slice(0, 240) : String(rows).slice(0, 240),
    };
  }
  return {
    status: r.status,
    range,
    count: rows.length,
    sample: rows.slice(0, 5).map((x) => ({
      slug: x.slug,
      name: x.name,
      verified: x.verified,
      states: x.states_licensed,
      city: x.cities?.[0],
      hasLicense: Boolean(x.license_info?.licenses?.[0]?.license_number),
      license: x.license_info?.licenses?.[0]?.license_number ?? null,
      hasSource: Boolean(x.license_info?.licenses?.[0]?.source),
      hasCheckedAt: Boolean(x.license_info?.licenses?.[0]?.checkedAt),
      website: x.contact?.website ?? null,
    })),
  };
}

async function main() {
  const candidates = [
    process.env.OPS_ENV_FILE,
    path.join(ROOT, '.env.local'),
    path.join(ROOT, '.env'),
    path.join(ROOT, '..', 'move-trust-hub-temp', '.env.local'),
  ].filter(Boolean);

  let env = { ...process.env };
  let loadedFrom = null;
  for (const f of candidates) {
    if (fs.existsSync(f)) {
      const parsed = loadEnvFile(f);
      env = { ...env, ...parsed, _urls: parsed._urls, _keys: parsed._keys };
      loadedFrom = f;
      break;
    }
  }

  console.log('=== Phase 6C preflight ===');
  console.log('env_file:', loadedFrom || '(process env only)');
  console.log('ADMIN_SECRET:', env.ADMIN_SECRET ? 'SET' : 'MISSING');
  console.log('GOOGLE_PLACES_API_KEY:', env.GOOGLE_PLACES_API_KEY ? 'SET' : 'MISSING');

  const urls = env._urls?.length
    ? env._urls
    : env.NEXT_PUBLIC_SUPABASE_URL
      ? [env.NEXT_PUBLIC_SUPABASE_URL]
      : [];
  const keys = env._keys?.length
    ? env._keys
    : env.SUPABASE_SERVICE_ROLE_KEY
      ? [env.SUPABASE_SERVICE_ROLE_KEY]
      : [];

  if (!urls.length || !keys.length) {
    console.log('STOP: Supabase URL/service role missing — cannot run live backfill.');
    process.exit(2);
  }

  const n = Math.max(urls.length, keys.length);
  let insuranceProject = null;
  for (let i = 0; i < n; i++) {
    const url = urls[Math.min(i, urls.length - 1)];
    const key = keys[Math.min(i, keys.length - 1)];
    // also try cross pairs for first two
    const probes = [{ url, key }];
    if (urls.length > 1 && keys.length > 1 && i === 0) {
      probes.push({ url: urls[0], key: keys[1] });
      probes.push({ url: urls[1], key: keys[0] });
      probes.push({ url: urls[1], key: keys[1] });
    }
    for (const p of probes) {
      const ref = projectRef(p.url);
      const result = await probeProviders(p.url, p.key);
      console.log('\nproject', ref, 'status', result.status, 'range', result.range);
      if (result.error) {
        console.log('  error', result.error);
        continue;
      }
      console.log('  sample', JSON.stringify(result.sample, null, 2));
      // Heuristic: insurance providers have states_licensed / license_info
      if (
        result.status === 200 &&
        Array.isArray(result.sample) &&
        result.sample.some((s) => s.slug && (s.states || s.hasLicense !== undefined))
      ) {
        // Prefer project that looks like seed insurance agencies
        const looksInsurance = result.sample.some(
          (s) =>
            /insurance|agency|broker/i.test(s.name || '') ||
            (s.states && s.states.length)
        );
        if (looksInsurance && !insuranceProject) {
          insuranceProject = { url: p.url, key: p.key, ref, result };
        }
      }
    }
    break; // probes above already cross-tried
  }

  // explicit cross probe all combinations once
  if (!insuranceProject) {
    for (const url of urls) {
      for (const key of keys) {
        const ref = projectRef(url);
        const result = await probeProviders(url, key);
        if (result.status === 200 && result.sample?.length) {
          const looksInsurance = result.sample.some((s) =>
            /insurance|agency|broker/i.test(s.name || '')
          );
          console.log('\ncombo', ref, 'status', result.status, 'looksInsurance', looksInsurance);
          if (looksInsurance) {
            insuranceProject = { url, key, ref, result };
            break;
          }
        }
      }
      if (insuranceProject) break;
    }
  }

  if (!insuranceProject) {
    console.log('\nSTOP: No accessible insurance providers table found with service role.');
    process.exit(3);
  }

  console.log('\n=== Selected project', insuranceProject.ref, '===');

  // Pull FL candidates for first batch
  const flUrl = `${insuranceProject.url}/rest/v1/providers?select=id,slug,name,verified,states_licensed,cities,license_info,contact&states_licensed=cs.{FL}&order=name&limit=30`;
  const flRes = await fetch(flUrl, {
    headers: {
      apikey: insuranceProject.key,
      Authorization: `Bearer ${insuranceProject.key}`,
      Prefer: 'count=exact',
    },
  });
  const flText = await flRes.text();
  let fl = [];
  try {
    fl = JSON.parse(flText);
  } catch {
    console.log('FL query failed', flRes.status, flText.slice(0, 200));
    process.exit(4);
  }

  console.log('FL providers count (page):', fl.length, 'range', flRes.headers.get('content-range'));

  const queue = fl.map((row) => {
    const lic = row.license_info?.licenses?.[0];
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      city: row.cities?.[0] ?? row.contact?.address?.city ?? '',
      state: 'FL',
      website: row.contact?.website ?? null,
      phone: row.contact?.phone ?? null,
      verified: row.verified,
      licenseNumber: lic?.license_number ?? null,
      source: lic?.source ?? null,
      checkedAt: lic?.checkedAt ?? null,
      identityMatchAccepted: lic?.identityMatchAccepted ?? false,
    };
  });

  // Prefer website + unique name for first batch shortlist
  const shortlist = queue
    .filter((q) => q.website && q.name)
    .slice(0, 15);

  console.log('\n=== First-batch shortlist (max 15 with website) ===');
  for (const q of shortlist) {
    console.log(
      `- ${q.name} | ${q.city} | lic=${q.licenseNumber || 'none'} | src=${q.source || 'none'} | web=${q.website}`
    );
  }

  const outPath = path.join(ROOT, 'ops', 'phase6c-fl-shortlist.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        projectRef: insuranceProject.ref,
        shortlist,
        note: 'Do not promote without official DOI/DFS confirmation of each license number.',
      },
      null,
      2
    )
  );
  console.log('\nWrote', outPath);
  console.log('Preflight OK — proceed to official license verification before writes.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
