# FL-INS-003 — bridge methodology

1. Inventory official fields (no reinterpretation of unlabeled numbers).
2. Accept only same-record or unique official two-step keys.
3. Names may be compared for **diagnostics**; they never write `APPOINTER_RESOLVES_TO`.
4. Independent clocks: DFS appointer, DFS appointment, OIR active company, NAIC LOC.
5. Do not shortcut `agency → legal insurer`. Traversal would remain agency → appointed_by → appointer → resolves_to → legal insurer **after** a CONFIRMED bridge exists.
6. Do not rewrite person `APPOINTED_TO`.
7. Coverage is not success. Zero bridges is the correct result when the crosswalk is not public.

This run: DFS+NAIC **0**, DFS+FL code **0**, DFS+FEIN **0** (appointer FEIN absent from bulk appointments). OIR FEIN exists on 3,503 companies with 140 FEIN collisions — unusable as a unique two-step even if DFS had FEIN.
