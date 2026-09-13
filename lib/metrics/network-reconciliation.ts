export type NetworkReconciliation = {
  states: Record<string, {status:string; scope:string; specialistComplete:null; sourceArtifact:string; sourceAsOf:string|null; snapshotAsOf:string|null; retrievedAt:string|null; sourceGeneratedAt:string|null; capabilities:Record<string,{status:string; count:number|null; sourceStatus:string; sourceField:string}>; identityImpact:Record<string,unknown>}>;
  measures: import('./insurance-network-metrics-v1').InsuranceNetworkMetric[];
  identity: {agencies:number; legalInsurers:number; agencyDeltaFromStateEvidence:number; insurerDeltaFromStateEvidence:number; unexplainedDelta:number};
  aggregationPolicy:string;
};
