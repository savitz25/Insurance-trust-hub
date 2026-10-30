# INS-NFC-ROLLOUT-PACKET-006

Draft application switch for the shared NFC ordering contract. This commit is not an activation. It is not merged, and it does not create the database function.

The retained proof is `lib/dfs/ins-ordering-computed-field-proof-005.json` from `8f51c7c941c8825a2e24b7601992953056408fdb`. That proof result is PASS. Its API, security, page, and cost figures stay in that file. Do not repeat the disposable PostgreSQL 17.6 / PostgREST v14.18 run unless a later review names a specific defect. Those timings are disposable and are not Supabase latency. `supabasePerformanceValidated` stays false.

The proof file still records `hubReadStillOrdersByNameThenId` because that was true at the proof commit. This later commit is the paired application switch. Production `main` still orders Florida hub pages by `name`, then `id`, until this branch is merged. Merging is not authorized by this packet.

## Contract

Per-county PostgREST reads call `applyFloridaHubOrder`, which orders by `provider_name_nfc` ascending, then `id` ascending. Multi-county pages call `mergeFloridaHubPage` with no comparator, and that default is `compareFloridaHubOrderByNfc`: NFC, then `Intl.Collator('en-US', { usage: 'sort', sensitivity: 'variant' })`, then id.

`compareFloridaHubOrder` stays the raw-name negative control. It is not the production merge. Stored and displayed company names stay on `providers.name`. `select('*')` does not ask for the computed field. The read still requires `verified`, `states_licensed` contains `FL`, and one `floridaHubIdPredicate`. It does not read `publication_*` columns and does not send a multi-county `or()`.

## GO sequence

1. Computed-field GO. Apply only `supabase/migrations/20261030160000_provider_name_nfc.sql` in one transaction that sets `insurance.provider_name_nfc_go` to `allow`. That file creates `public.provider_name_nfc(public.providers)` with `pg_catalog.normalize` and `SECURITY INVOKER`, revokes execute from `PUBLIC`, grants execute to `anon`, `authenticated`, and `service_role`, and sends `NOTIFY pgrst, 'reload schema'`. Without that session value the file raises and creates nothing. No index, generated column, view, collation change, or application edit belongs in that GO. `lib/dfs/ins-ordering-integration-004.not-applied.sql` remains DO NOT APPLY and is not a second function definition. The paired rollback is `supabase/rollbacks/20261030160000_provider_name_nfc.sql`. It is outside `supabase/migrations` and needs its own Founder GO.
2. Independent verification on the target. Confirm the function is in the exposed schema, `SECURITY INVOKER`, `PUBLIC` execute revoked, and the three granted roles can execute it. Confirm an anon order works, unverified rows stay hidden, and `select=*` omits the field.
3. Application switch. Merge this draft only after the release precondition below is true. Both sides are already paired here. Do not merge it onto a branch whose preview is still built: `ignoreCommand` skips only `ins-nfc-rollout-006`. Do not merge this stack into main because GitHub reports the pull request mergeable. The dependency remains #119, then #121, then #122.
4. Performance acceptance. Measure the real Supabase anon query after the switch. Disposable medians are not acceptance. Anon plans in the proof still sorted. Do not add an expression index for this read, and do not mark the function `LEAKPROOF`.
5. Rollback. Before the application switch, `DROP FUNCTION public.provider_name_nfc(public.providers)` is enough. After the application switch, revert the application before DROP FUNCTION. Dropping the function while the hub orders by it fails the read. There is no fallback to `order=name`.

## Release precondition

`lib/dfs/ins-nfc-release-precondition.json` is the committed gate, and `nfcReleasePreconditionAllowsSwitch` returns false for it. The application switch stays unapproved until the computed field exists on the target, Supabase Security has reviewed its privileges, and target PostgREST ordering has succeeded. Those three facts, `applicationSwitchApproved`, HTTP status 200, and a non-empty `securityReviewRef` must all be true together. A PR description is not runtime certification. A skipped Vercel preview is not runtime certification. GitHub mergeable is not approval. The disposable proof is not target certification. Those four flags stay false. This packet does not flip the gate.

## Disposable page measurement

The 167,000-row measurement is local and disposable. It is not Supabase acceptance, and `supabasePerformanceValidated` stays false. Thresholds were fixed before the timed requests: the statement-timeout budget is 3000 ms; the NFC first page and the NFC deep page must each stay under 3000 ms; a significant regression is a deep-page median delta above 500 ms or an NFC deep median above 1000 ms. The fixture is 167000 verified Miami-Dade rows plus one unverified row. The deep page uses offset 166900 and limit 100. The median of five anon `select=*` requests was raw page 80.222 ms, NFC page 155.082 ms, raw deep 191.083 ms, and NFC deep 310.496 ms. The deep delta was 119.413 ms. That is inside the 3000 ms budget, and the significant-regression flag is false. Anon `EXPLAIN ANALYZE` still sorts, the NFC sort key contains NORMALIZE, and no expression index was created. Evidence is `lib/dfs/ins-provider-name-nfc-migration-008.json`.

## Schema cache

On disposable PostgREST v14.18, a loaded schema cache still sent `providers.provider_name_nfc` to PostgreSQL. Before the function existed, order and explicit select failed with SQLSTATE 42703. After creation and before `NOTIFY`, both requests returned HTTP 200, so this build did not wait for a schema reload before ordering. `NOTIFY pgrst, 'reload schema'` was received, and a second schema cache load was logged. The versioned migration still sends that notification. After the rollback, order failed again with 42703.

## Missing function

A PostgREST error for a missing `provider_name_nfc` field sets the client error and leaves `data` null. `readFloridaCountyChunk` throws `Florida hub inventory rows unavailable`. The hub catch then throws `Florida hub inventory unavailable` and does not call `emptyInventory`. The read does not retry with `name` order.

## Preview

`vercel.json` `ignoreCommand` is `[ "$VERCEL_GIT_COMMIT_REF" = "ins-nfc-rollout-006" ]`. Exit 0 skips the Vercel build. Any other ref exits 1 and the build proceeds. GitHub Actions `insurance-search` still runs tests and does not deploy. This branch must not receive a Vercel preview, because the hub pages are force-dynamic and would send `order=provider_name_nfc` to the linked database.

## Read-only target checklist

These items are NOT RUN against Production. This packet does not query Production.

- Exposed schema. The function argument is unnamed, so PostgREST treats `provider_name_nfc` as a providers field and not as an RPC. On PostgREST v14.18 the OpenAPI document omitted the field while explicit select and order still resolved it. `select=*` omitted it.
- Permissions. `PUBLIC` execute is revoked. `anon`, `authenticated`, and `service_role` have `EXECUTE`. An ungranted role that orders by the field receives SQLSTATE 42501. The permission error must not include hidden row names.
- RLS behavior. `providers` has RLS enabled and FORCE RLS off. Do not enable FORCE RLS in this change. The anon and authenticated policy is `verified = true`. `service_role` bypasses RLS. The function is `SECURITY INVOKER` (`prosecdef` false).
- Actual Supabase query performance. NOT RUN. Record it only in the performance-acceptance GO. Do not cite the disposable id/name deep median of 63.414 ms, or the select-star NFC deep HTTP time of 108.917 ms, as that acceptance.

## Kept separate

PR #119 publication columns, the publication writer, backfill, `VALIDATE`, the publication index, and the publication-column application switch stay separate Founder GOs. The computed field does not read or write those columns.

Insurance Security Packet 1 and Packet 2 are not altered. No table-privilege revoke is part of this switch.
