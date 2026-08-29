/**
 * Intelligent parent mapping + breadcrumb defaults for InsuranceTrustHub.
 * Prefer explicit `from` when safe; else logical parent by route type.
 */

export type NavCrumb = {
  href?: string;
  label: string;
};

export type BackTarget = {
  href: string;
  /** Full label: "Back to Tools" */
  label: string;
  /** Mobile: "Tools" */
  shortLabel: string;
};

export type ContextNavModel = {
  back: BackTarget;
  crumbs: NavCrumb[];
};

/** Internal paths allowed for ?from= / return context */
const FROM_ALLOWLIST: Array<{ test: (p: string) => boolean; label: string; shortLabel: string }> = [
  { test: (p) => p === '/tools' || p.startsWith('/tools/'), label: 'Back to Tools', shortLabel: 'Tools' },
  {
    test: (p) => p === '/medicare' || p.startsWith('/medicare/'),
    label: 'Back to Medicare research',
    shortLabel: 'Medicare',
  },
  {
    test: (p) => p === '/carriers' || p.startsWith('/carriers/'),
    label: 'Back to Carriers',
    shortLabel: 'Carriers',
  },
  {
    test: (p) => p === '/insurers' || p.startsWith('/insurers/'),
    label: 'Back to legal insurers',
    shortLabel: 'Insurers',
  },
  {
    test: (p) => p === '/data/counties' || p.startsWith('/data/counties/'),
    label: 'Back to County dashboards',
    shortLabel: 'Counties',
  },
  {
    test: (p) => p === '/data/plan-complaint-index',
    label: 'Back to Plan Complaint Index',
    shortLabel: 'Complaints',
  },
  { test: (p) => p.startsWith('/data/'), label: 'Back to Medicare data', shortLabel: 'Data' },
  { test: (p) => p === '/directory' || p.startsWith('/directory'), label: 'Back to Agents', shortLabel: 'Agents' },
  { test: (p) => p.startsWith('/providers/'), label: 'Back to Agents', shortLabel: 'Agents' },
  { test: (p) => p.startsWith('/hubs'), label: 'Back to Agents', shortLabel: 'Hubs' },
  { test: (p) => p.startsWith('/resources'), label: 'Back to Guides', shortLabel: 'Guides' },
  { test: (p) => p.startsWith('/calculators'), label: 'Back to Calculators', shortLabel: 'Calculators' },
  { test: (p) => p === '/', label: 'Back to Home', shortLabel: 'Home' },
];

function normalizePath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let p = raw.trim();
  try {
    if (p.startsWith('http://') || p.startsWith('https://')) {
      const u = new URL(p);
      p = u.pathname;
    }
  } catch {
    return null;
  }
  // Strip monorepo rewrite prefix if present
  if (p.startsWith('/insurance/')) p = p.slice('/insurance'.length) || '/';
  if (!p.startsWith('/')) return null;
  // Drop query/hash
  p = p.split('?')[0].split('#')[0];
  // Block external-looking or empty
  if (p.includes('//') || p.length > 200) return null;
  return p || '/';
}

function labelForFromPath(path: string): { label: string; shortLabel: string } | null {
  for (const rule of FROM_ALLOWLIST) {
    if (rule.test(path)) return { label: rule.label, shortLabel: rule.shortLabel };
  }
  return null;
}

function isSafeFrom(from: string, currentPath: string): boolean {
  if (from === currentPath) return false;
  return Boolean(labelForFromPath(from));
}

type RouteRule = {
  match: (path: string) => boolean;
  resolve: (path: string, currentLabel?: string) => ContextNavModel;
};

const ROUTE_RULES: RouteRule[] = [
  {
    match: (p) => p === '/data/plan-complaint-index',
    resolve: () => ({
      back: { href: '/tools', label: 'Back to Tools', shortLabel: 'Tools' },
      crumbs: [
        { href: '/', label: 'Home' },
        { href: '/tools', label: 'Tools' },
        { href: '/data/plan-complaint-index', label: 'Medicare data' },
        { label: 'Plan Complaint Index' },
      ],
    }),
  },
  {
    match: (p) => p === '/data/counties',
    resolve: () => ({
      back: { href: '/tools', label: 'Back to Tools', shortLabel: 'Tools' },
      crumbs: [
        { href: '/', label: 'Home' },
        { href: '/tools', label: 'Tools' },
        { href: '/data/plan-complaint-index', label: 'Medicare data' },
        { label: 'County dashboards' },
      ],
    }),
  },
  {
    match: (p) => p.startsWith('/data/counties/'),
    resolve: (path, currentLabel) => {
      const slug = path.replace('/data/counties/', '');
      const name =
        currentLabel ||
        slug
          .replace(/-fl$/, '')
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join('-')
          .replace(/-/g, ' ');
      return {
        back: { href: '/data/counties', label: 'Back to County dashboards', shortLabel: 'Counties' },
        crumbs: [
          { href: '/', label: 'Home' },
          { href: '/data/plan-complaint-index', label: 'Medicare data' },
          { href: '/data/counties', label: 'County dashboards' },
          { label: name },
        ],
      };
    },
  },
  {
    match: (p) => p.startsWith('/tools/') && p !== '/tools',
    resolve: (path, currentLabel) => {
      const toolLabels: Record<string, string> = {
        '/tools/medicare-provider-lookup': 'Medicare provider lookup',
        '/tools/cost-estimator': 'Cost & Coverage Planner',
        '/tools/medicare-plan-finder': 'Medicare research guide',
        '/tools/needs-assessment': 'Coverage Compass',
        '/tools/coverage-compass': 'Coverage Compass',
        '/tools/license-verification': 'License verification',
        '/tools/quote-comparison': 'Quote comparison',
        '/tools/aca-eligibility-checker': 'ACA eligibility',
      };
      const label = currentLabel || toolLabels[path] || 'Tool';
      return {
        back: { href: '/tools', label: 'Back to Tools', shortLabel: 'Tools' },
        crumbs: [
          { href: '/', label: 'Home' },
          { href: '/tools', label: 'Tools' },
          { label },
        ],
      };
    },
  },
  {
    match: (p) => p === '/tools',
    resolve: () => ({
      back: { href: '/', label: 'Back to Home', shortLabel: 'Home' },
      crumbs: [{ href: '/', label: 'Home' }, { label: 'Tools' }],
    }),
  },
  {
    match: (p) => p.startsWith('/providers/'),
    resolve: (_path, currentLabel) => ({
      back: { href: '/directory', label: 'Back to Agents', shortLabel: 'Agents' },
      crumbs: [
        { href: '/', label: 'Home' },
        { href: '/directory', label: 'Agents' },
        { label: currentLabel || 'Provider' },
      ],
    }),
  },
  {
    match: (p) => p === '/directory',
    resolve: () => ({
      back: { href: '/', label: 'Back to Home', shortLabel: 'Home' },
      crumbs: [{ href: '/', label: 'Home' }, { label: 'Agents directory' }],
    }),
  },
  {
    match: (p) => p.startsWith('/hubs/'),
    resolve: (path, currentLabel) => {
      const parts = path.split('/').filter(Boolean); // hubs, state?, slug?
      const crumbs: NavCrumb[] = [
        { href: '/', label: 'Home' },
        { href: '/hubs', label: 'Health hubs' },
      ];
      if (parts[1] === 'browse') {
        crumbs.push({ href: '/hubs/browse', label: 'Browse' });
        if (parts[2]) crumbs.push({ label: currentLabel || parts[2] });
        else crumbs[crumbs.length - 1] = { label: 'Browse hubs' };
      } else if (parts[1] && !['medicare', 'aca', 'health-insurance', 'south-florida'].includes(parts[1])) {
        crumbs.push({ href: `/hubs/${parts[1]}`, label: parts[1].toUpperCase() });
        if (parts[2]) crumbs.push({ label: currentLabel || parts[2] });
      } else if (parts[1]) {
        crumbs.push({ label: currentLabel || parts[1].replace(/-/g, ' ') });
      }
      return {
        back: { href: '/hubs', label: 'Back to Health hubs', shortLabel: 'Hubs' },
        crumbs,
      };
    },
  },
  {
    match: (p) => p === '/hubs',
    resolve: () => ({
      back: { href: '/', label: 'Back to Home', shortLabel: 'Home' },
      crumbs: [{ href: '/', label: 'Home' }, { label: 'Health hubs' }],
    }),
  },
  {
    match: (p) => p === '/insurers',
    resolve: () => ({
      back: { href: '/', label: 'Back to Home', shortLabel: 'Home' },
      crumbs: [{ href: '/', label: 'Home' }, { label: 'Legal insurers' }],
    }),
  },
  {
    match: (p) => p.startsWith('/insurers/'),
    resolve: (_path, currentLabel) => ({
      back: { href: '/insurers', label: 'Back to legal insurers', shortLabel: 'Insurers' },
      crumbs: [
        { href: '/', label: 'Home' },
        { href: '/insurers', label: 'Legal insurers' },
        { label: currentLabel || 'Legal insurer' },
      ],
    }),
  },
  {
    match: (p) => p.startsWith('/resources/'),
    resolve: (_p, currentLabel) => ({
      back: { href: '/resources', label: 'Back to Guides', shortLabel: 'Guides' },
      crumbs: [
        { href: '/', label: 'Home' },
        { href: '/resources', label: 'Guides' },
        { label: currentLabel || 'Guide' },
      ],
    }),
  },
  {
    match: (p) => p.startsWith('/calculators/'),
    resolve: (path, currentLabel) => {
      const labels: Record<string, string> = {
        '/calculators/aca-subsidy': 'ACA Coverage & Savings Planner',
        '/calculators/premium-estimator': 'Premium estimator',
        '/calculators/medicare-gap': 'Medicare gap analyzer',
      };
      return {
        back: { href: '/calculators', label: 'Back to Calculators', shortLabel: 'Calculators' },
        crumbs: [
          { href: '/', label: 'Home' },
          { href: '/calculators', label: 'Calculators' },
          { label: currentLabel || labels[path] || 'Calculator' },
        ],
      };
    },
  },
];

/**
 * Resolve back + breadcrumbs for a pathname.
 * @param from - optional `?from=` internal path (preferred when safe)
 */
export function resolveContextNav(
  pathname: string,
  options?: {
    from?: string | null;
    currentLabel?: string;
    /** Override default back when parent mapping is insufficient */
    backOverride?: BackTarget;
  }
): ContextNavModel {
  const path = normalizePath(pathname) || '/';
  const from = normalizePath(options?.from ?? null);

  let model: ContextNavModel | null = null;
  for (const rule of ROUTE_RULES) {
    if (rule.match(path)) {
      model = rule.resolve(path, options?.currentLabel);
      break;
    }
  }

  if (!model) {
    model = {
      back: { href: '/', label: 'Back to Home', shortLabel: 'Home' },
      crumbs: [{ href: '/', label: 'Home' }, { label: options?.currentLabel || 'Page' }],
    };
  }

  if (options?.backOverride) {
    model = { ...model, back: options.backOverride };
  } else if (from && isSafeFrom(from, path)) {
    const labels = labelForFromPath(from);
    if (labels) {
      model = {
        ...model,
        back: { href: from, label: labels.label, shortLabel: labels.shortLabel },
      };
    }
  }

  return model;
}

/** Append `?from=` (or `&from=`) for cross-tool continuity. */
export function withReturnContext(href: string, currentPath: string): string {
  const from = normalizePath(currentPath);
  if (!from || from === '/') return href;
  try {
    const base = href.startsWith('http') ? new URL(href) : new URL(href, 'https://www.insurancetrusthub.com');
    if (!base.pathname.startsWith('/')) return href;
    base.searchParams.set('from', from);
    if (href.startsWith('http')) return base.toString();
    return `${base.pathname}${base.search}${base.hash}`;
  } catch {
    const sep = href.includes('?') ? '&' : '?';
    return `${href}${sep}from=${encodeURIComponent(from)}`;
  }
}
