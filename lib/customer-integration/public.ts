export type Business = {
  contractVersion: 1 | 2;
  hub: "insurance";
  nativeProfileId: string;
  managed: true;
  source: "BUSINESS_SUPPLIED";
  freshness: { label: string; lastConfirmedAt: string };
  fields: Record<string, string>;
  services: string[];
  serviceAreas: string[];
  languages: string[];
  hours: unknown[];
};
export type Replies = {
  contractVersion: 1 | 2;
  hub: "insurance";
  nativeProfileId: string;
  replies: Array<{
    id: string;
    body: string;
    source: "BUSINESS_RESPONSE";
    publishedAt: string;
  }>;
};
const FIELDS = new Set([
  "description",
  "website",
  "public_phone",
  "public_email",
  "contact_context",
]);
export function safeWebsite(v: string | undefined) {
  try {
    if (!v || v.startsWith("//")) return null;
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:"
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}
export function parseBusiness(v: unknown, id: string): Business | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>,
    f = r.fields as Record<string, unknown> | undefined;
  if (
    ![1, 2].includes(Number(r.contractVersion)) ||
    r.hub !== "insurance" ||
    r.nativeProfileId !== id ||
    r.managed !== true ||
    r.source !== "BUSINESS_SUPPLIED" ||
    !f ||
    Object.keys(f).some((k) => !FIELDS.has(k)) ||
    Object.values(f).some(
      (x) =>
        typeof x !== "string" || (typeof x === "string" && x.length > 3000),
    ) ||
    !Array.isArray(r.services) ||
    !Array.isArray(r.serviceAreas) ||
    !Array.isArray(r.languages) ||
    !Array.isArray(r.hours)
  )
    return null;
  const fields = { ...f };
  if (typeof fields.website === "string" && !safeWebsite(fields.website))
    delete fields.website;
  return { ...r, fields } as unknown as Business;
}
export function parseReplies(v: unknown, id: string): Replies | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (
    ![1, 2].includes(Number(r.contractVersion)) ||
    r.hub !== "insurance" ||
    r.nativeProfileId !== id ||
    !Array.isArray(r.replies) ||
    r.replies.length > 25
  )
    return null;
  for (const item of r.replies) {
    if (!item || typeof item !== "object") return null;
    const x = item as Record<string, unknown>;
    if (
      x.source !== "BUSINESS_RESPONSE" ||
      typeof x.body !== "string" ||
      x.body.length > 3000 ||
      /<\/?[a-z][\s\S]*>/i.test(x.body)
    )
      return null;
  }
  return r as unknown as Replies;
}
async function read(path: string, fetcher: typeof fetch) {
  try {
    const origin = (
      process.env.ATH_CUSTOMER_ORIGIN || "https://www.asktrusthub.com"
    ).replace(/\/+$/, "");
    const r = await fetcher(origin + path, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
      headers: { accept: "application/json" },
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
export async function fetchCustomerLayer(
  id: string,
  fetcher: typeof fetch = fetch,
) {
  const [p, r] = await Promise.all([
    read(`/api/public/profiles/insurance/${encodeURIComponent(id)}`, fetcher),
    read(
      `/api/public/profiles/insurance/${encodeURIComponent(id)}/replies`,
      fetcher,
    ),
  ]);
  return { profile: parseBusiness(p, id), replies: parseReplies(r, id) };
}
