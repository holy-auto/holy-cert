-- Add 'draft' value to certificate_status_enum
-- 'draft' is used throughout the codebase but was missing from the enum definition
ALTER TYPE certificate_status_enum ADD VALUE IF NOT EXISTS 'draft';
