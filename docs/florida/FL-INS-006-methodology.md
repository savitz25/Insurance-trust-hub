# FL-INS-006 — methodology (consumer-readable)

Florida research currently includes the official sources listed below. Missing information is not a clean record.

**DFS credentials.** Agency and individual licenses from Florida DFS bulk files. License class (TYCL) is the official class, not a line of authority.

**Appointments.** Agency `appointed_by` and person `APPOINTED_TO` use DFS appointing-entity numbers. Those numbers are not NAIC company codes. We do not currently have an official file that joins them.

**OIR / NAIC identity.** Legal insurers are identified by NAIC company code. Florida Company Code is stored only when the same official OIR record also has NAIC.

**MIR.** June 2026 statewide residential extract: policies in force, written premium, and exposure as reported. OIR does not audit the data before publication. Trade-secret companies are omitted. Rank in that file is not a quality rank.

**FSLSO eligibility.** Surplus-lines eligibility is not the same as being an admitted insurer.

**CMS Marketplace.** Registration evidence is federal Marketplace evidence, not a Florida license.

**Regulatory evidence.** Twelve open Florida liquidations are stored internally and not attached by name. Exam and order PDFs are catalogued but not attached without identifiers.

**CHOICES.** Sample premiums for defined examples and counties. Not a quote.

**IRFS.** Public filing search from 2001, about 2,500 results per search. Not a complete filing count.

**Citizens.** Florida’s residual-market insurer. A current official dated policy count has not been captured; we do not reuse old unofficial numbers.

**NFIP.** Public agency list cards. “Listed in FEMA/NFIP Agency Registry” is not certification. NPN is not on the public cards, so we do not attach them to profiles.

**Source clocks.** Each layer keeps its own clock. Clocks are not combined into an undated headline. Florida DFS credential rows currently have no `source_observed_at` timestamp in production (`source_observed_at_absent`). OIR Active Company Search was retrieved 2026-08-28. MIR is the June 2026 statewide residential extract (as of 2026-06-30). Citizens remains `DATA_PENDING_CURRENT_OFFICIAL_SOURCE`.
