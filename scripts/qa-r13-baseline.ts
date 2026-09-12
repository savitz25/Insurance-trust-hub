import { writeFileSync } from "node:fs";
import {
  executeInsuranceAsk,
  publicAskPayload,
} from "../lib/insurance-ask/execute";
import { getPublishedByNaic } from "../lib/national/legal-insurer-pilot";
process.loadEnvFile(".env.local");
const insurer = getPublishedByNaic("10064");
const questions = [
  "Find NPN 10391484",
  "Find insurer NAIC code 10064",
  "10391484",
  "Find NPN 999999999999",
  "Research Gulfstream Insurance Agency LLC",
  `Research ${insurer?.canonical_legal_name ?? "ALLIED WORLD ASSURANCE COMPANY US INC"}`,
  "Research State Farm",
  "Research Gulfstream Insurance Agency LLC in Florida",
  "insurance agency near me",
  "insurance agency in Boca Raton Florida",
  "insurance agencies in ZIP 33441",
  "homeowners insurance agency in ZIP 33441",
  "insurance agencies credentialed in Florida",
  "life insurance agencies credentialed in Texas",
  "agencies located in Florida",
  "insurer domiciled in Florida",
  "is NPN 10391484 appointed with State Farm?",
  "licensed insurance agencies in Colorado",
];
async function main() {
  const out: {
    ticket: string;
    at: string;
    baseline: string;
    deployment: string;
    insurer: typeof insurer;
    observations: Record<string, unknown>[];
  } = {
    ticket: "TH-SEARCH-R1-013",
    at: new Date().toISOString(),
    baseline: "8051be7d5169929e42155cab81effa94178e8aad",
    deployment: "dpl_CPcFskYZgjdf8YfXJzupT19iQxFG",
    insurer,
    observations: [],
  };
  for (const q of questions) {
    const obs: Record<string, unknown> = { q };
    for (const surface of ["local-base", "production-api"]) {
      const start = Date.now();
      try {
        const data =
          surface === "local-base"
            ? publicAskPayload(await executeInsuranceAsk(q))
            : await (
                await fetch(
                  "https://www.insurancetrusthub.com/api/ask?" +
                    new URLSearchParams({ q }),
                  { signal: AbortSignal.timeout(30000) },
                )
              ).json();
        obs[surface] = {
          ms: Date.now() - start,
          ...data,
          results: data.results?.slice(0, 5),
        };
      } catch (e) {
        obs[surface] = { ms: Date.now() - start, error: String(e) };
      }
    }
    out.observations.push(obs);
    writeFileSync(
      "docs/qa/th-search-r1-013/baseline.json",
      JSON.stringify(out, null, 2),
    );
    console.log(q);
  }
}
main();
