# Ohio ODI raw exports (gitignored)

Place official **business entity / agency** CSVs here:

```text
data/ohio-raw/agencies.csv
```

Do not commit bulk files.

Acquisition: see `docs/OHIO-ODI-INVENTORY.md`  
Preferred tool: ODI Agent/Agency Mailing Lists (not DataOhio summary counts).

The official CSV **does not include a license-type column**. Class is the report filter (`licenseTypeIds`). Import **one file per Licensing Type** (Major Lines, Title, Surety Bail Bond, …) or recover class by joining per-type reports on `NATIONALPROVIDERNUMBER`. Never infer class from the business name.
