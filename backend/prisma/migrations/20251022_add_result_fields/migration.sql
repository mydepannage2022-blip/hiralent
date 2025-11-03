-- Migration: add result, ended_at, error columns to code_submissions

ALTER TABLE code_submissions
  ADD COLUMN IF NOT EXISTS result jsonb,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS error text;
