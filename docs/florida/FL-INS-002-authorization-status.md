# FL-INS-002 — authorization / status

This source is **Active Company Search**. Every acquired company is stored as:

`ACTIVE_IN_OIR_COMPANY_SEARCH`

That is a **currentness observation**, not an enforcement event.

Inactive, withdrawn, runoff, suspended, rehabilitation, receivership, and liquidation are **not enumerated in this file**. AGIC is excluded on the search page as suspended. DFS Receiver lists 12 open liquidations that are generally absent here.

Keep separate:

1. NAIC identity currentness (national LOC)
2. Florida authorization currentness (this OIR clock)
3. Regulatory-event currentness (CRN / exam / receiver — not ingested)

Domestic vs foreign in this extract uses **HOME address state = FL** (587) vs other (3,385). That is address provenance, not a charter-domicile statute field.
