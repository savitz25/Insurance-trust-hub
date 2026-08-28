# FL-INS-002 — OIR source audit

Retrieved 2026-08-28 from the official Florida Office of Insurance Regulation **Active Company Search**.

## Acquisition

| Field | Value |
| --- | --- |
| Authority | Florida Office of Insurance Regulation |
| Dataset | `florida_oir_active_company_search` |
| URL | https://companysearch.floir.gov/ |
| Method | Official form POST, **Viewing/Download Format = XML File**, empty name, **by company type** |
| Class | **AVAILABLE_NOW** (deterministic export, not scrape-by-hand) |
| Combined SHA-256 | `147c46d11008d64a71bf99dc1f8d40eb0f989ba84837d3cb36df36d2965c4b55` |
| XML files | 52 types with rows + 4 types officially **0 records** |
| Address rows | 16,693 |
| Company grain | Florida Company Code (3,972 companies) |

The search UI offers Table / Company Name Only / XML / Text / Excel. XML is parsed here. Empty-name + type is the official bulk path. Four types return the official sentence: “Your search for companies with (TYPE) as company type returned 0 records.”

## Identifiers on the record

`name`, `addType`, `street`, `city`, `state`, `zipcode`, `country`, `phone`, `fein`, **`FLCompCode`**, **`NAICCode`**, `compType`.

**Not present:** DFS Appointing Entity Number, NAIC group code, website, explicit withdrawn/rehab/receivership status.

## Coverage limits

Active search only. AGIC (NAIC 13698) is documented on the page as excluded (suspended). Receivership liquidations are generally absent. Presence ≠ enforcement.

Refresh: re-download XML by type from the same form.
