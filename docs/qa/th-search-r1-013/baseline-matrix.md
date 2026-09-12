# Current baseline matrix

Baseline and canonical Production: `8051be7d5169929e42155cab81effa94178e8aad`; observed 2026-09-12T19:03:27.342Z. No historical failures invented.

| Query | Classification | Observation |
| --- | --- | --- |
| Find NPN 10391484 | GOOD | Exact organization NPN/source class retained; no public graph profile. |
| Find insurer NAIC code 10064 | GOOD | Exact Wave-1 NAIC identity/profile. |
| 10391484 | EXPECTED_SAFE_LIMITATION | Bare digits require identifier family. |
| Find NPN 999999999999 | BAD | Exact miss remains exact, but lacks a useful official verification action. |
| Research Gulfstream Insurance Agency LLC | BAD | Correct candidate exists; explanation uses cohort classification instead of actual name field, no task-preserving selection. |
| Research CITIZENS PROP INS CORP | UGLY | Published legal insurer name defaults to unrelated 82,071-agency cohort. |
| Research State Farm | BAD | Brand defaults to agency; 64 rows, no cross-class clarification/selection. |
| Research Gulfstream Insurance Agency LLC in Florida | UGLY | Explicit agency name disappears when state is supplied; Florida cohort returned. |
| insurance agency near me | BAD | ZIP needed but no input; alternatives substitute fixed ZIP/Florida. |
| insurance agency in Boca Raton Florida | BAD | Boca Raton lost from effective handoff; no usable ZIP refinement. |
| insurance agencies in ZIP 33441 | GOOD | Explicit directory handoff exists; must retain boundary and verify destination. |
| homeowners insurance agency in ZIP 33441 | BAD | Directory mode loses homeowners condition; no unresolved product disclosure. |
| insurance agencies credentialed in Florida | GOOD | Source-native Florida agency credential cohort. |
| life insurance agencies credentialed in Texas | GOOD | Source-native Texas Life LOA cohort; protect with predicate tests. |
| agencies located in Florida | BAD | Correctly refuses address substitution but drops requested state from typed query and offers only credential alternative. |
| insurer domiciled in Florida | BAD | Correctly refuses unsupported domicile cohort but reports KNOWN coverage. |
| is NPN 10391484 appointed with State Farm? | UGLY | Appointed with wording is missed; exact identity returned without appointment requirement. |
| licensed insurance agencies in Colorado | BAD | NOT_ACQUIRED correct; class/jurisdiction not retained and fixed unrelated NPN recovery. |

The classifications above are the initial customer-surface observations. Deeper source/browser verification then found two connected defects under initially GOOD controls: the directory destination did not apply ZIP equality, and the Texas Life cohort could use a Life observation from a different issuer jurisdiction. The source matrix records that later evidence and the repaired predicates; the initial observation is not silently rewritten.
