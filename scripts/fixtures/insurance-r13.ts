import type { AdminDb } from "../../lib/insurance-ask/execute";
import type { PublishedInsurer } from "../../lib/national/legal-insurer-pilot";
type Row = Record<string, unknown>;
export const ids = {
  agency: "00000000-0000-4000-8000-000000000001",
  other: "00000000-0000-4000-8000-000000000002",
  person: "00000000-0000-4000-8000-000000000003",
  insurer: "00000000-0000-4000-8000-000000000004",
  carrier: "00000000-0000-4000-8000-000000000005",
};
const cred = (id: string, state: string) => ({
  id: "c-" + id,
  entity_id: id,
  entity_kind: "agency",
  loa0: [{ official_text: "Life", source_dataset: "fixture-loa" }],
  jurisdiction: state,
  regulatory_status: "Active",
  license_number: "LIC-" + state,
  license_class: "AGENCY LICENSE",
  source_dataset: "fixture-credentials",
  source_observed_at: "2026-01-02",
});
export const insurerFixture = [
  {
    entity_id: ids.insurer,
    canonical_legal_name: "ACME INSURANCE COMPANY",
    naic_cocode: "10064",
    examination_count: 1,
    examination_families: ["financial"],
    regulator: ["fixture"],
    jurisdiction: ["FL"],
    report_dates: ["2026-01-01"],
    official_source_urls: [],
    document_hashes: [],
    public_safe_status: "PUBLIC_READY",
    slug: "acme-insurance-company",
    baseSlug: "acme-insurance-company",
    usedNaicDisambiguation: false,
  },
] satisfies PublishedInsurer[];
function values(row: unknown, path: string[]): unknown[] {
  if (Array.isArray(row)) return row.flatMap((x) => values(x, path));
  if (!path.length) return [row];
  return row && typeof row === "object"
    ? values((row as Row)[path[0]!], path.slice(1))
    : [];
}
function like(value: unknown, pattern: string): boolean {
  let regex = "^";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]!;
    if (c === "\\" && i + 1 < pattern.length)
      regex += pattern[++i]!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    else if (c === "%") regex += ".*";
    else if (c === "_") regex += ".";
    else regex += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(regex + "$", "i").test(String(value ?? ""));
}
export function fixtureSource(
  options: { outage?: boolean; sharedNpn?: boolean } = {},
) {
  const calls: Array<{
    table: string;
    filters: Array<[string, string, unknown]>;
    limit?: number;
    range?: number[];
  }> = [];
  const entities: Row[] = [
    {
      id: ids.agency,
      entity_kind: "agency",
      npn: "10391484",
      display_name: "Acme Insurance Agency",
      legal_name: "ACME INSURANCE AGENCY LLC",
      license_credentials: [cred(ids.agency, "FL")],
      loa_observations: [{ official_text: "Life" }],
      loa0: [{official_text:"Life",source_dataset:"florida_dfs"}],
      office_state: "TX",
    },
    {
      id: ids.other,
      entity_kind: "agency",
      npn: "20168263",
      display_name: "Acme Insurance Agency West",
      legal_name: "ACME INSURANCE AGENCY WEST LLC",
      license_credentials: [cred(ids.other, "TX")],
      loa_observations: [{ official_text: "Life" }],
      loa0: [{official_text:"Life",source_dataset:"texas_tdi"}],
      office_state: "FL",
    },
    {
      id: ids.person,
      entity_kind: "person",
      npn: options.sharedNpn ? "10391484" : "7654321",
      display_name: "Synthetic Person",
      legal_name: "Synthetic Person",
    },
    {
      id: ids.carrier,
      entity_kind: "carrier",
      display_name: "Acme Appointing Company",
      legal_name: "Acme Appointing Company",
    },
  ];
  const tables: Record<string, Row[]> = {
    national_entities: entities,
    license_credentials: [cred(ids.agency, "FL"), cred(ids.other, "TX")],
    national_relationships: [],
    cms_marketplace_observations: [],
  };
  class Query {
    filters: Array<[string, string, unknown]> = [];
    orders: string[] = [];
    start = 0;
    size = 1000;
    head = false;
    constructor(public table: string) {}
    select(_columns: string, opts?: { head?: boolean }) {
      this.head = Boolean(opts?.head);
      return this;
    }
    eq(k: string, v: unknown) {
      this.filters.push(["eq", k, v]);
      return this;
    }
    ilike(k: string, v: string) {
      this.filters.push(["ilike", k, v]);
      return this;
    }
    in(k: string, v: unknown[]) {
      this.filters.push(["in", k, v]);
      return this;
    }
    not(k: string, op: string, v: unknown) {
      this.filters.push(["not", k, [op, v]]);
      return this;
    }
    order(k: string) {
      this.orders.push(k);
      return this;
    }
    range(a: number, b: number) {
      this.start = a;
      this.size = b - a + 1;
      return this;
    }
    limit(n: number) {
      this.size = n;
      return this;
    }
    async result() {
      calls.push({
        table: this.table,
        filters: this.filters,
        limit: this.size,
        range: [this.start, this.start + this.size - 1],
      });
      if (options.outage)
        return {
          data: null,
          count: null,
          error: { message: "synthetic source unavailable" },
        };
      let rows = (tables[this.table] ?? []).filter((row) =>
        this.filters.every(([op, k, v]) =>
          values(row, k.replace(/->>?/g, ".").split(".")).some((actual) =>
            op === "eq"
              ? actual === v
              : op === "ilike"
                ? like(actual, String(v))
                : op === "in"
                  ? (v as unknown[]).includes(actual)
                  : actual != null,
          ),
        ),
      );
      for (const k of [...this.orders].reverse())
        rows = rows.sort((a, b) =>
          String(a[k] ?? "").localeCompare(String(b[k] ?? "")),
        );
      return {
        data: this.head ? null : rows.slice(this.start, this.start + this.size),
        count: rows.length,
        error: null,
      };
    }
    then(
      yes: Parameters<Promise<unknown>["then"]>[0],
      no: Parameters<Promise<unknown>["then"]>[1],
    ) {
      return this.result().then(yes, no);
    }
  }
  return {
    db: { from: (table: string) => new Query(table) } as unknown as AdminDb,
    calls,
    tables,
  };
}
