# Massachusetts DOI raw lists (gitignored)

Place official Mass.gov downloads here. Do not commit the files.

Expected agency / business-entity lists (Wave 1 promote):

```text
data/ma-raw/<accident-and-health-agencies>.xlsx
data/ma-raw/<life-agencies>.xlsx
data/ma-raw/<property-and-casualty-agencies>.xlsx
```

Source: https://www.mass.gov/lists/massachusetts-licensed-individuals-and-business-entities

`Mass_licensed_companies.csv` is the licensed-companies / pharmacy-manager dump. The pipeline parses it and **refuses to promote carriers as agencies**. See `docs/MASSACHUSETTS-DOI-INVENTORY.md`.
