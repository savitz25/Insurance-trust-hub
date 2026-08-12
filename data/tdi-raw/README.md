# Texas TDI raw data (gitignored except this README)

Place open-data exports here. Do **not** commit multi-MB CSVs.

## Download

Portal: https://data.texas.gov/dataset/Insurance-agencies-and-businesses-approved-to-mana/3yqc-fcdt

```powershell
# Option A — ops download script
npm run tdi:import -- --download

# Option B — direct CSV
# https://data.texas.gov/api/views/3yqc-fcdt/rows.csv?accessType=DOWNLOAD
# Save as: data/tdi-raw/agencies.csv
```

Fixture for parser QA (committed): `fixtures/tdi-agencies-sample.csv` under `scripts/tdi/fixtures/`.
