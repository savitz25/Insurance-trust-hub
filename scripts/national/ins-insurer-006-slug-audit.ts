import { writeFileSync } from 'fs';
import { join } from 'path';
import { PUBLISHED_INSURERS, SLUG_AUDIT } from '../../lib/national/legal-insurer-pilot';

const rows = PUBLISHED_INSURERS.map((x) => ({
  slug: x.slug,
  baseSlug: x.baseSlug,
  usedNaicDisambiguation: x.usedNaicDisambiguation,
  naic_cocode: x.naic_cocode,
  canonical_legal_name: x.canonical_legal_name,
}));
const out = { audit: SLUG_AUDIT, insurers: rows };
writeFileSync(join(process.cwd(), 'data/reports/ins-insurer-006-slug-audit.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.audit, null, 2));
for (const r of rows) console.log(r.slug, r.naic_cocode);
