# FL-INS-007 — UI contract

Route: `/florida`  
Snapshot: `insurance-fl-state-intel-v1`  
Loader: `lib/national/load-fl-state-intel.ts` → `buildFloridaStateView`  
Page: `app/florida/page.tsx` + `components/florida/florida-state-page.tsx`

No headline counts are hard-coded in JSX. Every card exposes its grain in visible copy. Cards are not summed.

## Positioning

Title: Florida Insurance Research, Licensing & Market Data

Not used: Best / Top / Most Trusted / Safest.

## Modules

A Overview · B Agency credentials · C Individual credentials · D Appointments · E OIR · F Residential market · G PIF · H Written premium · I Exposure · J Surplus lines · K CMS context · L Citizens · M CHOICES · N IRFS · O NFIP · P Regulatory & Enforcement History · Q Methodology · R Source clocks · S Limitations.

## Chart safety

Allowed: class/namespace distribution, PIF composition, premium composition, OIR NAIC coverage, surplus attached vs unresolved, appointment status.

Forbidden: best/top/trust/safety/risk rankings.

## MIR rank field

Stored `policies_in_force_total` is unused. Displayed PIF is personal + commercial only.
