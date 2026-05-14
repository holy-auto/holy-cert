-- Demo tenant read-only enforcement.
--
-- The "Ledra Motors（デモ）" tenant (UUID below) is publicly reachable via the
-- /demo marketing page, which hands out shared credentials so prospects can
-- click through the actual admin UI with pre-seeded sample data. We do not
-- want anonymous prospects mutating that data — both for data hygiene and to
-- avoid the demo state drifting away from the deterministic seed defined in
-- scripts/setup-demo-tenant.ts.
--
-- Approach: a RESTRICTIVE RLS policy on each user-facing tenant-scoped table.
-- RESTRICTIVE policies AND with the existing PERMISSIVE policies, so even
-- when the regular tenant_id-based policy would allow the write, this policy
-- can still deny it. The check is on tenant_id != DEMO so demo rows are
-- read-only while every other tenant is unaffected.
--
-- service_role bypasses RLS entirely (BYPASSRLS), so the setup scripts that
-- seed the demo tenant continue to work without changes.

DO $$
DECLARE
  demo_tenant_id constant uuid := '00000000-0000-0000-0000-de0000000010';
  target_table   text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['certificates', 'vehicles', 'customers']
  LOOP
    -- INSERT: block rows whose tenant_id is the demo tenant.
    EXECUTE format(
      'CREATE POLICY demo_tenant_readonly_insert ON %I '
      || 'AS RESTRICTIVE FOR INSERT '
      || 'WITH CHECK (tenant_id <> %L::uuid)',
      target_table, demo_tenant_id
    );

    -- UPDATE: block both the pre-image (USING) and post-image (WITH CHECK),
    -- so you can neither modify a demo row nor move a row INTO the demo tenant.
    EXECUTE format(
      'CREATE POLICY demo_tenant_readonly_update ON %I '
      || 'AS RESTRICTIVE FOR UPDATE '
      || 'USING (tenant_id <> %L::uuid) '
      || 'WITH CHECK (tenant_id <> %L::uuid)',
      target_table, demo_tenant_id, demo_tenant_id
    );

    -- DELETE: block deletion of demo rows.
    EXECUTE format(
      'CREATE POLICY demo_tenant_readonly_delete ON %I '
      || 'AS RESTRICTIVE FOR DELETE '
      || 'USING (tenant_id <> %L::uuid)',
      target_table, demo_tenant_id
    );
  END LOOP;
END
$$;

COMMENT ON POLICY demo_tenant_readonly_insert ON certificates IS
  'Read-only enforcement for the public demo tenant. See src/lib/demo.ts.';
COMMENT ON POLICY demo_tenant_readonly_update ON certificates IS
  'Read-only enforcement for the public demo tenant. See src/lib/demo.ts.';
COMMENT ON POLICY demo_tenant_readonly_delete ON certificates IS
  'Read-only enforcement for the public demo tenant. See src/lib/demo.ts.';
