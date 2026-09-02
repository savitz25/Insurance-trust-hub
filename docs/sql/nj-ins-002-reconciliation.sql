-- NJ-INS-002 reconciliation (InsuranceTrustHub only). Do not print credentials.

select 'market_intelligence_observations' as relation, count(*) as n
from market_intelligence_observations
where source_dataset = 'NJ_DOBI_MARKET_INTELLIGENCE'
union all
select 'insurance_source_coverage', count(*)
from insurance_source_coverage
where source_dataset = 'NJ_DOBI_MARKET_INTELLIGENCE'
union all
select 'insurance_monitoring_events', count(*)
from insurance_monitoring_events
where source_dataset = 'NJ_DOBI_MARKET_INTELLIGENCE';

select metric_family, count(*)
from market_intelligence_observations
where source_dataset = 'NJ_DOBI_MARKET_INTELLIGENCE'
group by 1
order by 1;

select count(*) as historical_alerts
from insurance_monitoring_events
where source_dataset = 'NJ_DOBI_MARKET_INTELLIGENCE'
  and alerted = true
  and baseline_only = false;

select count(*) as public_ready
from market_intelligence_observations
where source_dataset = 'NJ_DOBI_MARKET_INTELLIGENCE'
  and publication_allowed = true;
