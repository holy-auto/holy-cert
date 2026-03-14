-- Migration: Add optional filter parameters to insurer_search_certificates
-- This migration replaces the existing function with one that accepts
-- optional p_status, p_date_from, p_date_to parameters for DB-side filtering.
--
-- IMPORTANT: Before running, verify the existing function body matches your
-- production version. The core query logic (marked with YOUR EXISTING QUERY)
-- must be replaced with the actual SELECT from your current function.
--
-- To apply: Run this SQL in Supabase SQL Editor or via supabase db push.

-- Drop the old function signature so we can add new parameters
DROP FUNCTION IF EXISTS public.insurer_search_certificates(text, integer, integer, text, text);

CREATE OR REPLACE FUNCTION public.insurer_search_certificates(
  p_query      text,
  p_limit      integer DEFAULT 50,
  p_offset     integer DEFAULT 0,
  p_ip         text    DEFAULT NULL,
  p_user_agent text    DEFAULT NULL,
  -- New filter parameters (all optional, NULL = no filter)
  p_status     text      DEFAULT NULL,
  p_date_from  timestamp DEFAULT NULL,
  p_date_to    timestamp DEFAULT NULL
)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- ============================================================
  -- IMPORTANT: Replace the query below with your existing
  -- insurer_search_certificates logic. Add the WHERE clauses
  -- shown below to enable DB-side filtering.
  -- ============================================================

  RETURN QUERY
  WITH base AS (
    -- YOUR EXISTING QUERY HERE
    -- Example structure (adapt to your actual query):
    SELECT
      c.public_id,
      c.status,
      c.customer_name,
      c.created_at,
      c.tenant_id,
      c.vehicle_info_json->>'model' AS vehicle_model,
      c.vehicle_info_json->>'plate' AS vehicle_plate
    FROM certificates c
    WHERE
      (p_query = '' OR c.customer_name ILIKE '%' || p_query || '%'
                    OR c.public_id::text ILIKE '%' || p_query || '%')
  )
  SELECT row_to_json(b)
  FROM base b
  WHERE
    -- New: DB-side status filter
    (p_status IS NULL OR lower(b.status) = lower(p_status))
    -- New: DB-side date range filters
    AND (p_date_from IS NULL OR b.created_at >= p_date_from)
    AND (p_date_to   IS NULL OR b.created_at <= (p_date_to + interval '1 day' - interval '1 millisecond'))
  ORDER BY b.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute to authenticated users (match existing permissions)
GRANT EXECUTE ON FUNCTION public.insurer_search_certificates(text, integer, integer, text, text, text, timestamp, timestamp)
  TO authenticated;
