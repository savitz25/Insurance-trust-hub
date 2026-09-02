-- NJ-INS-001 reconciliation (InsuranceTrustHub only). Do not print credentials.

select 'insurance_source_coverage' as relation, count(*) as n from insurance_source_coverage where source_dataset = 'NJ_DOBI_INSURANCE_EVIDENCE'
union all
select 'insurance_source_occurrences', count(*) from insurance_source_occurrences where source_dataset = 'NJ_DOBI_INSURANCE_EVIDENCE'
union all
select 'insurance_regulatory_documents', count(*) from insurance_regulatory_documents
union all
select 'insurance_regulatory_event_parties', count(*) from insurance_regulatory_event_parties where source_dataset = 'NJ_DOBI_INSURANCE_EVIDENCE'
union all
select 'regulatory_evidence', count(*) from regulatory_evidence where source_dataset = 'NJ_DOBI_INSURANCE_EVIDENCE';

select content_hash, count(*) from insurance_regulatory_documents group by 1 having count(*) > 1;
select source_dataset, occurrence_fingerprint, count(*) from insurance_source_occurrences group by 1, 2 having count(*) > 1;

select match_status, count(*)
from insurance_regulatory_event_parties
where source_dataset = 'NJ_DOBI_INSURANCE_EVIDENCE'
group by 1;

select count(*) as person_public_candidates
from insurance_regulatory_event_parties
where source_dataset = 'NJ_DOBI_INSURANCE_EVIDENCE'
  and public_eligibility <> 'internal_only'
  and party_type like 'INDIVIDUAL%';
