import {GET as specialistGet,POST as specialistPost} from '../app/api/specialist-execution/v2/route';
import {Footer} from '../components/footer';
import { applyDirectoryZipScope } from "../lib/providers/directory-scope";
import { GET as askGet } from "../app/api/ask/route";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AskInsuranceResultView } from "../components/ask-insurance-result";
import {
  executeInsuranceAsk,
  executeInsuranceRequest,
  publicAskPayload,
  withInsuranceSource,
} from "../lib/insurance-ask/execute";
import { executeSpecialistV2 } from "../lib/specialist-execution/v2";
import { fixtureSource, ids, insurerFixture } from "./fixtures/insurance-r13";
import {
  planInsuranceRequest,
  readInsuranceRequest,
} from "../lib/insurance-ask/request";
import {
  matchSourceName,
  escapeNamePattern,
} from "../lib/insurance-ask/name-match";
import { askCacheKey } from "../lib/insurance-ask/cache";
import { OFFICIAL_RECOVERY, recoveryFor } from "../lib/insurance-ask/recovery";
import assert from "node:assert/strict";
import { interpretInsuranceAskQuery as parse } from "../lib/insurance-ask/interpret";
let pass = 0,
  fail = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass++;
    console.log("PASS", name);
  } catch (e) {
    fail++;
    console.error("FAIL", name, String(e));
  }
}
check("known insurer source abbreviation stays a name", () => {
  const q = parse("Research CITIZENS PROP INS CORP").query;
  assert.equal(q.nameQuery, "CITIZENS PROP INS CORP");
  assert.notEqual(q.entityClass, "agency");
});
check("agency name plus state retains name", () =>
  assert.equal(
    parse("Research Gulfstream Insurance Agency LLC in Florida").query
      .nameQuery,
    "Gulfstream Insurance Agency LLC",
  ),
);
check("brand does not assume agency", () =>
  assert.equal(parse("Research State Farm").query.entityClass, undefined),
);
check("near me has executable ZIP refinement", () =>
  assert.equal(parse("insurance agency near me").query.refinement, "zip"),
);
check("Boca requested location remains visible", () =>
  assert.match(
    JSON.stringify(parse("insurance agency in Boca Raton Florida").query),
    /Boca Raton/i,
  ),
);
check("homeowners context retained as unresolved directory criterion", () =>
  assert.match(
    JSON.stringify(parse("homeowners insurance agency in ZIP 33441").query),
    /homeowners/i,
  ),
);
check("appointed with invokes evidence", () => {
  const q = parse("is NPN 10391484 appointed with State Farm?").query;
  assert.equal(q.evidenceFamily, "appointment");
  assert.equal(q.appointerName, "State Farm");
});
check("address preserves its semantic jurisdiction", () =>
  assert.deepEqual(parse("agencies located in Florida").query.jurisdiction, {
    state: "FL",
    meaning: "recorded_address_state",
  }),
);
check("NOT_ACQUIRED preserves class and state", () => {
  const q = parse("licensed insurance agencies in Colorado").query;
  assert.equal(q.entityClass, "agency");
  assert.equal(q.jurisdiction?.state, "CO");
});
check("overlong cannot truncate to valid identity", () =>
  assert.equal(
    parse("Find NPN 10391484 " + "x".repeat(180)).query.mode,
    "fail_closed",
  ),
);
check("NPN exact preserved without class assumption", () => {
  const q = parse("Find NPN 10391484").query;
  assert.equal(q.identifier?.value, "10391484");
  assert.equal(q.entityClass, undefined);
});
check("NAIC exact stays insurer", () =>
  assert.equal(
    parse("Find insurer NAIC code 10064").query.entityClass,
    "insurer",
  ),
);

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    pass++;
    console.log("PASS", name);
  } catch (e) {
    fail++;
    console.error("FAIL", name, String(e));
  }
}
async function main() {
  await test('structured HTTP validates full input and duplicate parameters',async()=>{for(const url of ['https://example.com/api?q='+encodeURIComponent('NPN 10391484 '+'x'.repeat(180)),'https://example.com/api?q=NPN+10391484&q=NAIC+10064'])assert.equal((await specialistGet(new Request(url))).status,400);assert.equal((await specialistPost(new Request('https://example.com/api',{method:'POST',body:'null',headers:{'Content-Type':'application/json'}}))).status,400)});
  await test('direct Wave-1 publication status is not a credential status',async()=>{const r=await executeSpecialistV2({queryType:'cohort',entityClass:'legal_insurer'});assert.ok(r.body.rows.length);assert.ok(r.body.rows.every(x=>x.credentialStatus===null&&x.credentialJurisdiction===null))});

  check('actual footer markup cannot nest links and remount first search',()=>{const html=renderToStaticMarkup(createElement(Footer));let open=0;for(const token of html.matchAll(/<a\b[^>]*>|<\/a>/g)){if(token[0].startsWith('</'))open--;else {assert.equal(open,0,'Nested anchor breaks hydration');open++;}}assert.equal(open,0);assert.match(html,/Insurance Trust Hub home/)});

  const source = fixtureSource();
  await withInsuranceSource(
    source.db,
    async () => {
      await test("exact NPN uses equality and source class, no profile", async () => {
        const r = await executeInsuranceAsk("Find NPN 10391484");
        assert.equal(r.results[0]?.entityId, ids.agency);
        assert.equal(r.results[0]?.href, null);
        assert.equal(r.results[0]?.npn, "10391484");
        assert.ok(
          source.calls.some((c) =>
            c.filters.some(
              (f) => f[0] === "eq" && f[1] === "npn" && f[2] === "10391484",
            ),
          ),
        );
      });
      await test("spaced NPN full value", async () =>
        assert.equal(
          (await executeInsuranceAsk("NPN 1039 1484")).results[0]?.entityId,
          ids.agency,
        ));
      await test("exact miss no broadening and official action", async () => {
        const n = source.calls.length,
          r = await executeInsuranceAsk("NPN 9999999999");
        assert.equal(r.terminalState, "NO_MATCH");
        assert.equal(r.results.length, 0);
        assert.ok(r.recoveryActions?.some((a) => a.type === "OFFICIAL_SOURCE"));
        assert.ok(
          source.calls
            .slice(n)
            .every((c) => c.filters.some((f) => f[1] === "npn")),
        );
      });
      await test("exact NAIC uses legal insurer fixture only", async () => {
        const n = source.calls.length,
          r = await executeInsuranceAsk("Find insurer NAIC code 10064");
        assert.equal(r.results[0]?.entityClass, "insurer");
        assert.equal(r.results[0]?.naicCode, "10064");
        assert.equal(r.results[0]?.credentialStatus, null);
        assert.equal(r.results[0]?.credentialJurisdiction, null);
        assert.equal(source.calls.length, n);
      });
      await test("NAIC miss cannot use agency name", async () => {
        const r = await executeInsuranceAsk("NAIC 99999");
        assert.equal(r.results.length, 0);
        assert.equal(r.terminalState, "NO_MATCH");
      });
      await test("explicit agency class and source legal name evidence", async () => {
        const r = await executeInsuranceAsk(
          "Research Acme Insurance Agency LLC",
        );
        assert.ok(r.results.every((c) => c.entityClass === "agency"));
        assert.equal(
          r.results[0]?.matchEvidence?.method,
          "normalized_exact_name",
        );
        assert.equal(
          r.results[0]?.matchEvidence?.value,
          "ACME INSURANCE AGENCY LLC",
        );
        assert.match(r.results[0]?.whyMatched ?? "", /legal_name/);
      });
      await test("bare source agency name cannot become directory", async () => {
        const r = await executeInsuranceAsk("Acme Insurance Agency LLC");
        assert.equal(r.parsed.query.nameQuery, "Acme Insurance Agency LLC");
        assert.ok(r.results.every((x) => x.matchEvidence));
      });
      await test("explicit legal insurer remains insurer", async () => {
        const r = await executeInsuranceAsk("Research Acme Insurance Company");
        assert.equal(r.results.length, 1);
        assert.equal(r.results[0]?.entityClass, "insurer");
      });
      await test("ambiguous brand retains distinct classes and selection", async () => {
        const r = await executeInsuranceAsk("Research Acme Insurance");
        assert.equal(r.terminalState, "NEEDS_CLARIFICATION");
        assert.ok(r.results.some((c) => c.entityClass === "agency"));
        assert.ok(r.results.some((c) => c.entityClass === "insurer"));
        assert.ok(r.results.every((c) => c.selectionHref));
        assert.ok(r.results.length <= 10);
      });
      await test("selected candidate revalidated original task and conditions", async () => {
        const r = await executeInsuranceAsk(
          "Research Acme Insurance Agency licensed in Florida",
          1,
          20,
          { selected: ids.agency },
        );
        assert.equal(r.results[0]?.entityId, ids.agency);
        assert.equal(r.parsed.query.requestedTask, "credential");
        assert.equal(r.parsed.query.conditions?.[0]?.value, "FL");
        assert.equal(r.results[0]?.credentialJurisdiction, "FL");
      });
      await test("tampered candidate not attached", async () => {
        const r = await executeInsuranceAsk(
          "Research Acme Insurance Company",
          1,
          20,
          { selected: ids.agency },
        );
        assert.equal(r.results.length, 0);
        assert.equal(r.terminalState, "NEEDS_CLARIFICATION");
      });
      await test("person name never becomes agency search", async () => {
        const n = source.calls.length,
          r = await executeInsuranceAsk("Research John Smith insurance agent");
        assert.equal(r.results.length, 0);
        assert.equal(r.parsed.query.entityClass, "person");
        assert.equal(source.calls.length, n);
      });
      await test("public person exact identity has no profile", async () => {
        const r = await executeInsuranceAsk("NPN 7654321");
        assert.equal(r.results[0]?.entityClass, "person");
        assert.equal(r.results[0]?.href, null);
      });
      await test("usable ZIP refinement keeps product and original city", async () => {
        const r = await executeInsuranceAsk(
          "homeowners insurance agency in Boca Raton Florida",
          1,
          20,
          { zip: "33441" },
        );
        assert.equal(r.parsed.query.mode, "directory");
        assert.equal(r.parsed.query.directoryZip, "33441");
        assert.match(
          r.parsed.query.directoryContext?.requestedLocation ?? "",
          /Boca/,
        );
        assert.ok(
          r.parsed.query.directoryContext?.requestedInsuranceContext.includes(
            "homeowners",
          ),
        );
        assert.ok(r.parsed.query.directoryContext?.unresolvedConditions.length);
        assert.equal(r.parsed.query.linesOfAuthority, undefined);
      });
      await test("directory is never canonical graph rows", async () => {
        const n = source.calls.length,
          r = await executeInsuranceAsk("insurance agencies in ZIP 33441");
        assert.equal(source.calls.length, n);
        assert.equal(r.results.length, 0);
        assert.equal(r.terminalState, "DIRECTORY_HANDOFF");
        assert.match(r.provenance.grain, /Directory/);
        assert.equal(r.counts.length, 0);
      });
      await test("credential FL applied before pagination independently of office", async () => {
        const r = await executeInsuranceAsk(
          "insurance agencies credentialed in Florida",
        );
        assert.deepEqual(
          r.results.map((c) => c.entityId),
          [ids.agency],
        );
        assert.equal(r.results[0]?.credentialJurisdiction, "FL");
      });
      await test("address request cannot become FL credential cohort", async () => {
        const n = source.calls.length,
          r = await executeInsuranceAsk("agencies located in Florida");
        assert.equal(r.results.length, 0);
        assert.equal(source.calls.length, n);
        assert.equal(
          r.parsed.query.jurisdiction?.meaning,
          "recorded_address_state",
        );
        assert.equal(r.coverageState, "UNSUPPORTED");
      });
      await test("domicile remains distinct and unsupported", async () => {
        const r = await executeInsuranceAsk("insurer domiciled in Florida");
        assert.equal(r.parsed.query.domicile, "FL");
        assert.equal(r.coverageState, "UNSUPPORTED");
        assert.equal(r.results.length, 0);
      });
      await test("LOA is not appointment or service area", async () => {
        const r = await executeInsuranceAsk(
          "life insurance agencies credentialed in Texas",
        );
        assert.equal(r.results[0]?.entityId, ids.other);
        assert.match(r.results[0]?.whyMatched ?? "", /not an appointment/);
        assert.notEqual(r.results[0]?.evidenceFamily, "appointment");
      });
      await test("appointment requires actual source relationship, not LOA", async () => {
        const r = await executeInsuranceAsk(
          "is NPN 10391484 appointed with Acme Appointing Company?",
        );
        assert.equal(r.terminalState, "EVIDENCE_UNAVAILABLE");
        assert.ok(r.results.every((x) => x.evidenceFamily !== "appointment"));
        assert.match(r.limitations.join(" "), /not.*unauthorized/);
        assert.ok(
          source.calls.some(
            (c) =>
              c.table === "national_relationships" &&
              c.filters.some((f) => f[1] === "to_entity_id"),
          ),
        );
      });
      await test("appointment missing target clarifies", async () => {
        const n = source.calls.length,
          r = await executeInsuranceAsk("Is NPN 10391484 appointed?");
        assert.equal(r.terminalState, "NEEDS_CLARIFICATION");
        assert.equal(source.calls.length, n);
      });
      await test("service territory no substitution", async () => {
        const n = source.calls.length,
          r = await executeInsuranceAsk("agencies serving Florida");
        assert.equal(r.results.length, 0);
        assert.equal(source.calls.length, n);
        assert.match(r.parsed.query.failReason ?? "", /service territory/);
      });
      await test("NOT_ACQUIRED retains state class and relevant action", async () => {
        const r = await executeInsuranceAsk(
          "licensed insurance agencies in Colorado",
        );
        assert.equal(r.coverageState, "NOT_ACQUIRED");
        assert.equal(r.parsed.query.entityClass, "agency");
        assert.equal(r.parsed.query.jurisdiction?.state, "CO");
        assert.equal(r.recoveryActions?.[0]?.destination, "/colorado");
        assert.equal(r.counts.length, 0);
      });
      await test("native URL/API boundary same typed plan", async () => {
        const input = {
          q: "insurance agencies credentialed in Florida",
          state: "TX",
        };
        const r = await executeInsuranceRequest(input);
        const api = publicAskPayload(
          await executeInsuranceRequest(new URLSearchParams(input)),
        );
        assert.deepEqual(
          JSON.parse(JSON.stringify(api.query)),
          JSON.parse(JSON.stringify(r.parsed.query)),
        );
        assert.equal(r.results[0]?.entityId, ids.other);
      });
      await test("actual API route parity and invalid request status", async () => {
        const response = await askGet(
          new Request(
            "https://www.insurancetrusthub.com/api/ask?q=NPN+10391484",
          ),
        );
        const data = await response.json();
        assert.equal(data.results[0]?.npn, "10391484");
        const bad = await askGet(
          new Request(
            "https://www.insurancetrusthub.com/api/ask?q=NPN+10391484&q=NAIC+10064",
          ),
        );
        assert.equal(bad.status, 400);
      });
      await test("real renderer offers ZIP form and honest directory boundary", async () => {
        const r = await executeInsuranceAsk(
          "homeowners insurance agency in Boca Raton Florida",
        );
        const html = renderToStaticMarkup(
          createElement(AskInsuranceResultView, { result: r }),
        );
        assert.match(html, /name="zip"/);
        assert.match(html, /Apply ZIP/);
        assert.match(html, /Boca Raton/);
        assert.match(html, /homeowners/);
        assert.doesNotMatch(html, /licensed in ZIP|serves ZIP/);
      });
      await test("real renderer candidate action carries original task", async () => {
        const r = await executeInsuranceAsk("Research Acme Insurance");
        const html = renderToStaticMarkup(
          createElement(AskInsuranceResultView, { result: r }),
        );
        assert.match(html, /Select this identity and continue/);
        assert.match(html, /selected=/);
        assert.match(html, /Research\+Acme\+Insurance/);
      });
      await test('structured candidates expose safe revalidated continuation',async()=>{const r=await executeSpecialistV2({query:'Research Acme Insurance'});assert.equal(r.body.resultState,'AMBIGUOUS_IDENTITIES');assert.ok(r.body.rows.every(x=>x.selectionUrl?.startsWith('/ask?')&&x.matchEvidence));assert.ok(r.body.destinations.some(x=>x.type==='IDENTITY_SELECTION'))});
    await test("structured natural identity equals native", async () => {
        const a = await executeInsuranceAsk("NPN 10391484"),
          b = await executeSpecialistV2({ query: "NPN 10391484" });
        assert.equal(b.body.rows[0]?.npn, a.results[0]?.npn);
        assert.equal(b.body.rows[0]?.entityClass, "agency");
      });
      await test("structured near-me cannot become source zero", async () => {
        const r = await executeSpecialistV2({
          query: "insurance agency near me",
        });
        assert.notEqual(r.body.resultState, "ZERO_MATCHING_ROWS");
        assert.equal(
          r.body.queryInterpretation.terminalState,
          "NEEDS_CLARIFICATION",
        );
      });
      await test("structured directory retains handoff and context", async () => {
        const r = await executeSpecialistV2({
          query: "homeowners insurance agencies in ZIP 33441",
        });
        assert.equal(r.body.rows.length, 0);
        assert.ok(
          r.body.destinations.some(
            (d) =>
              d.type === "DIRECTORY_RESEARCH" && d.url.includes("homeowners"),
          ),
        );
      });
      await test("overlong full request never calls source", async () => {
        const n = source.calls.length,
          r = await executeInsuranceRequest({
            q: "NPN 10391484 " + "x".repeat(180),
          });
        assert.equal(r.terminalState, "INVALID_INPUT");
        assert.equal(source.calls.length, n);
      });
      await test("duplicates and fractional page rejected", async () => {
        assert.equal(
          (await executeInsuranceRequest({ q: ["NPN 10391484", "NAIC 10064"] }))
            .terminalState,
          "INVALID_INPUT",
        );
        assert.equal(
          (await executeInsuranceRequest({ q: "NPN 10391484", page: "1.5" }))
            .terminalState,
          "INVALID_INPUT",
        );
      });
    },
    insurerFixture,
  );
  await test("NPN across classes remains distinct", async () => {
    const f = fixtureSource({ sharedNpn: true });
    await withInsuranceSource(
      f.db,
      async () => {
        const r = await executeInsuranceAsk("NPN 10391484");
        assert.equal(r.results.length, 2);
        assert.equal(r.terminalState, "NEEDS_CLARIFICATION");
        assert.ok(r.results.every((x) => x.selectionHref));
        assert.notEqual(r.results[0]?.entityClass, r.results[1]?.entityClass);
        assert.ok(r.results.every((x) => x.href === null));
      },
      insurerFixture,
    );
  });
  await test("Marketplace requires resolved identity and does not assume person", async () => {
    const f = fixtureSource({ sharedNpn: true });
    await withInsuranceSource(
      f.db,
      async () => {
        const r = await executeInsuranceAsk("NPN 10391484 Marketplace 2026");
        assert.equal(r.terminalState, "NEEDS_CLARIFICATION");
        assert.ok(
          !f.calls.some((c) => c.table === "cms_marketplace_observations"),
        );
        const miss = await executeInsuranceAsk(
          "NPN 9999999999 Marketplace 2026",
        );
        assert.equal(miss.terminalState, "NO_MATCH");
      },
      insurerFixture,
    );
  });
  await test("Marketplace observations preserve source class, not state credential status", async () => {
    const f = fixtureSource();
    f.tables.cms_marketplace_observations = [
      {
        id: "overlay-one",
        npn: "10391484",
        evidence_type: "registration",
        plan_year: "2026",
        status: "Complete",
        source_dataset: "fixture-CMS",
        source_observed_at: "2026-01-03",
        identity_attachment: "exact_npn",
      },
      {
        id: "overlay-two",
        npn: "10391484",
        evidence_type: "termination",
        plan_year: "2026",
        status: "Terminated",
        source_dataset: "fixture-CMS",
        source_observed_at: "2026-01-04",
        identity_attachment: "exact_npn",
      },
    ];
    await withInsuranceSource(
      f.db,
      async () => {
        const r = await executeInsuranceAsk("NPN 10391484 Marketplace 2026");
        assert.ok(
          r.results.every(
            (x) =>
              x.entityClass === "agency" &&
              x.entityId === ids.agency &&
              x.credentialStatus === null,
          ),
        );
        assert.notEqual(r.terminalState, "NEEDS_CLARIFICATION");
        assert.match(r.counts[0]?.label ?? "", /Marketplace observations/);
        assert.match(r.limitations.join(" "), /federal overlay/);
      },
      insurerFixture,
    );
  });
  await test("LOA issuer dataset must establish requested jurisdiction", async () => {
    const f = fixtureSource();
    const row = f.tables.national_entities[1]!;
    row.license_credentials = [
      { id: "tx-no-life", jurisdiction: "TX", loa0: [] },
    ];
    row.loa0 = [
      { official_text: "Life", credential_id: "some-other-state" },
    ];
    await withInsuranceSource(
      f.db,
      async () => {
        const r = await executeInsuranceAsk(
          "life insurance agencies credentialed in Texas",
        );
        assert.equal(r.results.length, 0);
        assert.ok(
          f.calls.some((c) =>
            c.filters.some(
              (x) => x[1] === "loa0.source_dataset",
            ),
          ),
        );
      },
      insurerFixture,
    );
  });
  await test("directory exact address predicate precedes limit; credential geography is irrelevant", async () => {
    const f = fixtureSource();
    f.tables.providers = [
      {
        id: "outside",
        contact: { address: { zip: "33442" } },
        states_licensed: ["FL"],
      },
      {
        id: "inside",
        contact: { address: { zip: "33441" } },
        states_licensed: ["TX"],
      },
    ];
    const query = f.db.from("providers").select("*");
    const r = await applyDirectoryZipScope(query, "33441").limit(1);
    assert.equal((r.data?.[0] as { id: string })?.id, "inside");
    assert.ok(
      f.calls[0]?.filters.some((x) => x[1] === "contact->address->>zip"),
    );
    assert.throws(() => applyDirectoryZipScope(query, "334%"));
  });
  await test("source outage is error, never zero", async () => {
    const f = fixtureSource({ outage: true });
    await assert.rejects(
      () =>
        withInsuranceSource(
          f.db,
          () => executeInsuranceAsk("NPN 10391484"),
          insurerFixture,
        ),
      /source unavailable/,
    );
  });
  check("safe pattern and no generic match", () => {
    assert.equal(
      matchSourceName("insurance agency", "Acme Insurance Agency"),
      null,
    );
    assert.equal(escapeNamePattern("A%_B"), String.raw`A\%\_B`);
  });
  check("cache distinguishes dimensions", () => {
    const parts = ["agency", "FL", "credential", "Life", "33441", 1];
    for (let i = 0; i < parts.length; i++) {
      const next = [...parts];
      next[i] = "different";
      assert.notEqual(askCacheKey(parts), askCacheKey(next));
    }
  });
  check("static official recovery allowlist", () => {
    for (const x of Object.values(OFFICIAL_RECOVERY)) {
      const u = new URL(x.url);
      assert.equal(u.protocol, "https:");
      assert.ok(
        [
          "licenseesearch.fldfs.com",
          "www.tdi.texas.gov",
          "idoi.illinois.gov",
          "content.naic.org",
        ].includes(u.hostname),
      );
      assert.ok(x.checkedAt);
      assert.ok(!u.search);
    }
    assert.equal(
      recoveryFor({
        mode: "fail_closed",
        page: 1,
        entityClass: "agency",
        jurisdiction: { state: "IL", meaning: "credential_jurisdiction" },
      })[0]?.destination,
      "/illinois",
    );
  });
  check("unsupported filter/selection cannot bypass request validation", () => {
    assert.ok(readInsuranceRequest({ q: "x", entity: "carrier" }).error);
    assert.equal(
      planInsuranceRequest("insurance agency near me", 1, { zip: "123" }).query
        .terminalState,
      "INVALID_INPUT",
    );
  });
  console.log({ pass, fail });
  if (fail) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
