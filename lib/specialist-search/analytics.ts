import type { SpecialistSearchIntent } from './contract';

export type InsuranceSearchAnalytics = {
  hub: 'insurance';
  intent: SpecialistSearchIntent;
  entityClass?: string;
  state?: string;
  hasIdentifier: boolean;
  identifierType?: string;
  hasLoa: boolean;
  hasAppointmentFilter: boolean;
  evidenceFamily?: string;
  coverageState: string;
  directoryHandoff: boolean;
};

export function resultCountBucket(count: number) {
  if (count === 0) return '0';
  if (count <= 5) return '1-5';
  if (count <= 20) return '6-20';
  return '21+';
}
