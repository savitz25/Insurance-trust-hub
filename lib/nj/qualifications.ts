/**
 * Map NJ organization license lines → LOA capabilities / specialties.
 * Reuses TX classifier patterns (generic LOA keywords). Never invent Medicare-certified.
 */

export {
  classifyTdiQualification as classifyNjQualification,
  classifyTdiStrings as classifyNjStrings,
  tdiCapabilitiesToSpecialties as njCapabilitiesToSpecialties,
  tdiCapabilitiesToInsuranceTypes as njCapabilitiesToInsuranceTypes,
} from '@/lib/tdi/qualifications';
