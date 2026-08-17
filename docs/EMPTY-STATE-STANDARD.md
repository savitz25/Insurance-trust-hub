# Empty-state standard (Ask Trust Hub network)

Network rule for **zero verified research listings**. Apply on Insurance first. Move, Lender, Contractor, and Ask should reuse the same pattern — do not invent a one-off message per state.

## Rule

Whenever search or filters return **no verified research listings**:

1. **Never invent** people, agencies, movers, lenders, or contractors. No placeholder cards with fake names.
2. **Name the geography or filter** the user chose (“New Jersey”, “ZIP 07030”, “Health specialty”).
3. **Explain why it’s empty** in plain language:
   - **A — Outside inventory coverage:** we do not have a live official extract for that place yet.
   - **B — Filters narrower than data:** inventory exists, but specialty / type / name filters excluded every row.
4. **Growth-oriented, no fake timelines.** “We’re expanding from official sources.” Not “1,000 agents next Tuesday” unless that is actually scheduled and true.
5. **Always offer next steps:** official lookup (DOI / DBPR / FMCSA / NMLS as appropriate), research tools that still work, request / claim listing where the product has it, related guides if any.
6. **Close with the honesty line:** “We won’t invent listings to fill this page.”

No lead-gen match forms. No paid-placement language.

## Shared copy skeleton

**Headline**  
No verified {entities} match {place or filters} yet

**Body**  
We only publish research listings backed by official sources. Coverage is growing state by state / market by market. This view stays empty until that data is live and checked — we won’t invent results.

**Variant A (outside coverage)**  
Verified {entities} in {place} aren’t listed here yet. We’re expanding from official licensing data and only publish after license checks.

**Variant B (filters)**  
No verified listings match these filters. Try clearing specialty, widening filters, or opening the state / county hub.

**Next steps**  
Official lookup · Research tools · Request a listing (if the hub has it) · Guides if any

**Footer**  
Research only · Not an endorsement · We don’t invent listings

## Insurance implementation

| Surface | Variant |
| --- | --- |
| Directory ZIP with no mapped inventory / no live state extract | A |
| Directory ZIP or state that has inventory, but specialty/type/name emptied the set | B |
| Hub with `verifiedTotal === 0` | A |
| Hub with inventory but `?loa=` emptied the current page | B |

Code: `lib/research/empty-inventory.ts` + `components/research/empty-coverage-panel.tsx`.

## Other hubs (reuse later)

| Hub | Entities | Official lookup | Claim / request |
| --- | --- | --- | --- |
| Insurance | agencies | State DOI / NAIC / in-product license verification | `/claim-listing` |
| Move | movers | FMCSA SAFER / Verify DOT | Suggest company |
| Lender | lenders | NMLS Consumer Access | (if product adds a claim path) |
| Contractor | contractors | State DBPR / CSLB / equivalent | (if product adds a claim path) |
| Ask | (route to the right hub) | Same as destination hub | Same as destination hub |

Do not change Move production structure in the Insurance-only rollout of this rule.
