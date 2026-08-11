# Stage B.1 — Research Session Continuity (Insurance)

Mirrors the shared network contract. See LenderTrustHub `docs/STAGE-B1-RESEARCH-SESSION.md` for the full contract.

## Insurance behavior

- Destination pages: URL params first, then origin-local session gap-fill.
- Landing with route geography + params **writes/updates** `ath:research-session:v1`.
- `/destinations` hub: soft client redirect to `/destinations/{state}` when session has state and URL does not.
- Continue-journey links use merged context (params + session) so buy-intent users still reach Lender with place context.

## Origin note

Insurance and Lender do **not** share `localStorage`. Continuity across domains still requires Stage A′ query params on outbound links. Session is for return visits on **this** origin.
