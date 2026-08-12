-- Fix: apply unique index after dedupe (for projects that partially applied 6B).
-- Safe to run alone in SQL Editor if you hit ERROR 23505 on idx_dfs_appointments_dedupe.

-- Normalize keys
UPDATE dfs_appointments SET appointing_entity_number = COALESCE(appointing_entity_number, '');
UPDATE dfs_appointments SET appointment_type = COALESCE(appointment_type, '');
UPDATE dfs_appointments
SET appointing_entity_name = COALESCE(NULLIF(TRIM(appointing_entity_name), ''), carrier_name, '')
WHERE appointing_entity_name IS NULL OR TRIM(COALESCE(appointing_entity_name, '')) = '';
UPDATE dfs_appointments
SET carrier_name = COALESCE(NULLIF(TRIM(carrier_name), ''), appointing_entity_name, '')
WHERE carrier_name IS NULL OR TRIM(COALESCE(carrier_name, '')) = '';

-- Drop any half-created unique index
DROP INDEX IF EXISTS idx_dfs_appointments_dedupe;

-- Delete exact duplicates on the unique key we will create
DELETE FROM dfs_appointments a
USING dfs_appointments b
WHERE a.producer_id IS NOT NULL
  AND b.producer_id IS NOT NULL
  AND a.producer_id = b.producer_id
  AND COALESCE(a.appointing_entity_number, '') = COALESCE(b.appointing_entity_number, '')
  AND COALESCE(a.appointment_type, '') = COALESCE(b.appointment_type, '')
  AND UPPER(TRIM(COALESCE(NULLIF(a.carrier_name, ''), a.appointing_entity_name, '')))
    = UPPER(TRIM(COALESCE(NULLIF(b.carrier_name, ''), b.appointing_entity_name, '')))
  AND a.ctid < b.ctid;

-- Prefer keep ACTIVE: delete non-active when an ACTIVE twin exists (same key)
DELETE FROM dfs_appointments a
USING dfs_appointments b
WHERE a.producer_id IS NOT NULL
  AND b.producer_id IS NOT NULL
  AND a.id <> b.id
  AND a.producer_id = b.producer_id
  AND COALESCE(a.appointing_entity_number, '') = COALESCE(b.appointing_entity_number, '')
  AND COALESCE(a.appointment_type, '') = COALESCE(b.appointment_type, '')
  AND UPPER(TRIM(COALESCE(NULLIF(a.carrier_name, ''), a.appointing_entity_name, '')))
    = UPPER(TRIM(COALESCE(NULLIF(b.carrier_name, ''), b.appointing_entity_name, '')))
  AND COALESCE(b.appointment_status, '') ~* 'active'
  AND COALESCE(a.appointment_status, '') !~* 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_dfs_appointments_dedupe
  ON dfs_appointments (
    producer_id,
    COALESCE(appointing_entity_number, ''),
    COALESCE(appointment_type, ''),
    UPPER(TRIM(COALESCE(NULLIF(carrier_name, ''), appointing_entity_name, '')))
  )
  WHERE producer_id IS NOT NULL;
