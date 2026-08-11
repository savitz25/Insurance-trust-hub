# Stage A′ — Contextual Journey Handoffs (Insurance)

See lender twin: `lender-trust-hub/docs/STAGE-A-JOURNEY-HANDOFFS.md`

## Landing behavior
- Destination state/city pages parse `src`, `journey`, `state`, `county`, `intent`
- Orientation banner when context present
- `ContinueTrustJourney` routes buyers to Lender county/state with params preserved
- Public links are crawlable absolute URLs (not auth handoff)

## Example inbound
```
/destinations/florida?src=move&journey=relocate&state=FL&intent=rent
```
