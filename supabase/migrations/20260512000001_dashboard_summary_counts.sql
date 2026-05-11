-- Single-RPC dashboard summary aggregation.
--
-- Before: `/api/admin/dashboard-summary` fanned out 16 parallel
-- `count: 'exact', head: true` SELECTs against the Supabase REST API.
-- Each is cheap on the DB side (planner uses head-only count) but the
-- round-trip overhead is 16x and shows up at p95/p99.
--
-- After: one RPC computes every count in a single transaction using
-- COUNT(*) FILTER (...) idioms, which the planner can fold into a few
-- index scans per source table. The route still allows JS-side cache
-- (60s in Redis) so the RPC cost is paid at most once per tenant per
-- minute under load.
--
-- Return shape is a JSON object so the TS callers can decode it without
-- a fragile column-position contract.
--
-- Reference: docs/architecture-roadmap.md §9.1

CREATE OR REPLACE FUNCTION dashboard_summary_counts(p_tenant_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now            timestamptz := now();
  v_today          date := v_now::date;
  v_month_start    timestamptz := date_trunc('month', v_now);
  v_next7          date := v_today + INTERVAL '7 days';
  v_next30         date := v_today + INTERVAL '30 days';
  v_week_start     date;
  v_week_end       date;

  v_cert_total       int;
  v_cert_active      int;
  v_cert_void        int;
  v_cert_draft       int;
  v_cert_month       int;
  v_cert_exp7        int;
  v_cert_exp30       int;
  v_cust_total       int;
  v_cust_month       int;
  v_inv_total        int;
  v_res_today        int;
  v_res_week         int;
  v_res_pending      int;
  v_orders_active    int;
  v_orders_done      int;
BEGIN
  -- Week range (Monday → Sunday) matching the existing JS computation.
  v_week_start := v_today - ((EXTRACT(ISODOW FROM v_today)::int - 1) || ' days')::interval;
  v_week_end   := v_week_start + INTERVAL '6 days';

  -- ── Certificates ──
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'active'),
    count(*) FILTER (WHERE status = 'void'),
    count(*) FILTER (WHERE status = 'draft'),
    count(*) FILTER (WHERE created_at >= v_month_start),
    count(*) FILTER (WHERE status = 'active' AND expiry_date BETWEEN v_today AND v_next7),
    count(*) FILTER (WHERE status = 'active' AND expiry_date BETWEEN v_today AND v_next30)
  INTO v_cert_total, v_cert_active, v_cert_void, v_cert_draft,
       v_cert_month, v_cert_exp7, v_cert_exp30
  FROM public.certificates
  WHERE tenant_id = p_tenant_id;

  -- ── Customers ──
  SELECT
    count(*),
    count(*) FILTER (WHERE created_at >= v_month_start)
  INTO v_cust_total, v_cust_month
  FROM public.customers
  WHERE tenant_id = p_tenant_id;

  -- ── Invoices (doc_type = 'invoice' in documents) ──
  SELECT count(*) INTO v_inv_total
  FROM public.documents
  WHERE tenant_id = p_tenant_id
    AND doc_type = 'invoice';

  -- ── Reservations ──
  SELECT
    count(*) FILTER (WHERE scheduled_date = v_today AND status <> 'cancelled'),
    count(*) FILTER (WHERE scheduled_date BETWEEN v_week_start AND v_week_end AND status <> 'cancelled'),
    count(*) FILTER (WHERE status = 'confirmed')
  INTO v_res_today, v_res_week, v_res_pending
  FROM public.reservations
  WHERE tenant_id = p_tenant_id;

  -- ── Orders (job_orders is many-to-many; either side counts) ──
  SELECT
    count(*) FILTER (
      WHERE status = ANY (ARRAY['pending', 'accepted', 'in_progress', 'approval_pending', 'payment_pending'])
    ),
    count(*) FILTER (WHERE status = 'completed' AND updated_at >= v_month_start)
  INTO v_orders_active, v_orders_done
  FROM public.job_orders
  WHERE from_tenant_id = p_tenant_id OR to_tenant_id = p_tenant_id;

  RETURN json_build_object(
    'certificates', json_build_object(
      'total', v_cert_total,
      'active', v_cert_active,
      'void', v_cert_void,
      'draft', v_cert_draft,
      'thisMonth', v_cert_month
    ),
    'expiring', json_build_object(
      'next7days', v_cert_exp7,
      'next30days', v_cert_exp30
    ),
    'customers', json_build_object(
      'total', v_cust_total,
      'thisMonth', v_cust_month
    ),
    'invoices_total', v_inv_total,
    'reservations', json_build_object(
      'today', v_res_today,
      'thisWeek', v_res_week,
      'pending', v_res_pending
    ),
    'orders', json_build_object(
      'active', v_orders_active,
      'completedThisMonth', v_orders_done
    )
  );
END;
$$;

COMMENT ON FUNCTION dashboard_summary_counts(uuid) IS
  'Single-call dashboard aggregation for /api/admin/dashboard-summary. Replaces 16 head-only count queries with one transaction. See architecture-roadmap §9.1.';
