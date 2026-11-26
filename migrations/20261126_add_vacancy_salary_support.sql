-- Draft migration: employer-confirmed vacancy salary and immigration-support fields.
-- Safe to run repeatedly. This migration does not invent wages or verify sponsorship.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS salary_min NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS salary_max NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS salary_period VARCHAR(20),
  ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(3) NOT NULL DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS salary_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lmia_status VARCHAR(40) NOT NULL DEFAULT 'Not verified',
  ADD COLUMN IF NOT EXISTS work_permit_support VARCHAR(40) NOT NULL DEFAULT 'Not verified';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'jobs_salary_values_valid'
      AND conrelid = 'jobs'::regclass
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_salary_values_valid
      CHECK (
        (salary_min IS NULL OR salary_min >= 0)
        AND (salary_max IS NULL OR salary_max >= 0)
        AND (salary_min IS NULL OR salary_max IS NULL OR salary_max >= salary_min)
        AND (salary_period IS NULL OR salary_period IN ('hourly', 'weekly', 'monthly', 'annual'))
        AND (salary_confirmed = FALSE OR (salary_min IS NOT NULL AND salary_period IS NOT NULL))
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'jobs_lmia_status_valid'
      AND conrelid = 'jobs'::regclass
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_lmia_status_valid
      CHECK (lmia_status IN (
        'Not verified',
        'LMIA required',
        'LMIA application in progress',
        'LMIA approved',
        'LMIA not required',
        'Not applicable'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'jobs_work_permit_support_valid'
      AND conrelid = 'jobs'::regclass
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_work_permit_support_valid
      CHECK (work_permit_support IN (
        'Not verified',
        'Employer may support',
        'Employer support confirmed',
        'No support offered',
        'Not applicable'
      ));
  END IF;
END $$;
