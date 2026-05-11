-- POS receipt numbering: replace COUNT(*) with a counter table.
--
-- Old design (20260323070000_scale_hardening): inside pos_checkout we acquire
-- a transaction-scoped advisory lock per (tenant, YYYYMM), then run
-- `SELECT COUNT(*) + 1 FROM documents WHERE doc_type='receipt' AND ...`.
-- Correct but linear in the table size, so per-tenant POS throughput degrades
-- as the receipts table grows (audit roadmap §9.2).
--
-- New design: a dedicated `pos_receipt_counters` table keyed by
-- (tenant_id, year_month). Each checkout does an atomic UPSERT with
-- `last_number = pos_receipt_counters.last_number + 1`, returning the
-- newly-incremented value. O(1) per call, no advisory lock needed
-- (PG's row-level lock from UPDATE is sufficient).
--
-- Backfill: seed the counter with `MAX(suffix)` for every (tenant, ym) that
-- has at least one receipt today, so the first new receipt after migration
-- continues the existing series rather than restarting at 1.

CREATE TABLE IF NOT EXISTS pos_receipt_counters (
  tenant_id   uuid    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year_month  text    NOT NULL CHECK (year_month ~ '^[0-9]{6}$'),
  last_number integer NOT NULL DEFAULT 0 CHECK (last_number >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, year_month)
);

COMMENT ON TABLE pos_receipt_counters IS
  'Per-(tenant, YYYYMM) monotonic counter for POS receipt numbering. Replaces the COUNT(*) approach in pos_checkout; see migration 20260512000000.';

ALTER TABLE pos_receipt_counters ENABLE ROW LEVEL SECURITY;

-- service-role only; pos_checkout runs SECURITY DEFINER so RLS does not
-- block it. Direct read/write by anon/auth is denied by default-no-policy.

-- Backfill: derive last_number from existing documents.
-- doc_number format is 'RCP-<YYYYMM>-<NNN>'; substring(... from '-(\d+)$')
-- extracts the trailing integer.
INSERT INTO pos_receipt_counters (tenant_id, year_month, last_number)
SELECT
  d.tenant_id,
  substring(d.doc_number from 'RCP-(\d{6})-') AS year_month,
  MAX(CAST(substring(d.doc_number from '-(\d+)$') AS integer)) AS last_number
FROM documents d
WHERE d.doc_type = 'receipt'
  AND d.doc_number ~ '^RCP-\d{6}-\d+$'
GROUP BY d.tenant_id, substring(d.doc_number from 'RCP-(\d{6})-')
ON CONFLICT (tenant_id, year_month) DO NOTHING;

-- Replace pos_checkout to use the counter table.
CREATE OR REPLACE FUNCTION pos_checkout(
  p_tenant_id uuid,
  p_reservation_id uuid DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_register_session_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT 'cash',
  p_amount integer DEFAULT 0,
  p_received_amount integer DEFAULT NULL,
  p_items_json jsonb DEFAULT '[]'::jsonb,
  p_tax_rate integer DEFAULT 10,
  p_note text DEFAULT NULL,
  p_create_receipt boolean DEFAULT true,
  p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment_id uuid;
  v_document_id uuid;
  v_change integer;
  v_subtotal integer;
  v_tax integer;
  v_total integer;
  v_doc_number text;
  v_year_month text;
  v_next_number integer;
  v_reservation record;
BEGIN
  -- 金額計算
  v_total := p_amount;
  v_tax := ROUND(v_total * p_tax_rate::numeric / (100 + p_tax_rate));
  v_subtotal := v_total - v_tax;
  v_change := COALESCE(p_received_amount, v_total) - v_total;
  IF v_change < 0 THEN v_change := 0; END IF;

  -- 1. payment レコード作成
  INSERT INTO public.payments (
    tenant_id, store_id, reservation_id, customer_id, register_session_id,
    payment_method, amount, received_amount, change_amount, status, note,
    paid_at, created_by
  ) VALUES (
    p_tenant_id, p_store_id, p_reservation_id, p_customer_id, p_register_session_id,
    p_payment_method, v_total, p_received_amount, v_change, 'completed', p_note,
    now(), p_user_id
  )
  RETURNING id INTO v_payment_id;

  -- 2. 領収書（receipt）作成
  IF p_create_receipt THEN
    v_year_month := to_char(now(), 'YYYYMM');

    -- Atomic UPSERT increments last_number row-exclusively; no advisory
    -- lock needed because the row-level lock from UPDATE already
    -- serializes concurrent checkouts for the same (tenant, year_month).
    INSERT INTO public.pos_receipt_counters (tenant_id, year_month, last_number)
    VALUES (p_tenant_id, v_year_month, 1)
    ON CONFLICT (tenant_id, year_month)
    DO UPDATE
      SET last_number = public.pos_receipt_counters.last_number + 1,
          updated_at  = now()
    RETURNING last_number INTO v_next_number;

    v_doc_number := 'RCP-' || v_year_month || '-' || LPAD(v_next_number::text, 3, '0');

    INSERT INTO public.documents (
      tenant_id, customer_id, doc_type, doc_number, issued_at, status,
      subtotal, tax, total, tax_rate, items_json, note,
      is_invoice_compliant, show_seal, show_logo, payment_date
    ) VALUES (
      p_tenant_id, p_customer_id, 'receipt', v_doc_number, CURRENT_DATE, 'paid',
      v_subtotal, v_tax, v_total, p_tax_rate, p_items_json, p_note,
      false, false, true, CURRENT_DATE
    )
    RETURNING id INTO v_document_id;

    -- payment に document_id を紐付け
    UPDATE public.payments SET document_id = v_document_id WHERE id = v_payment_id;
  END IF;

  -- 3. 予約ステータス更新（予約がある場合）
  IF p_reservation_id IS NOT NULL THEN
    SELECT * INTO v_reservation FROM public.reservations
    WHERE id = p_reservation_id AND tenant_id = p_tenant_id;

    IF FOUND THEN
      UPDATE public.reservations
      SET payment_status = 'paid',
          payment_id = v_payment_id,
          status = CASE WHEN status = 'in_progress' THEN 'completed' ELSE status END,
          updated_at = now()
      WHERE id = p_reservation_id;
    END IF;
  END IF;

  -- 4. register_session の集計更新（セッションがある場合）
  IF p_register_session_id IS NOT NULL THEN
    UPDATE public.register_sessions
    SET total_sales = COALESCE(total_sales, 0) + v_total,
        total_transactions = COALESCE(total_transactions, 0) + 1,
        updated_at = now()
    WHERE id = p_register_session_id AND tenant_id = p_tenant_id;
  END IF;

  -- 結果を返す
  RETURN json_build_object(
    'payment_id', v_payment_id,
    'document_id', v_document_id,
    'amount', v_total,
    'change', v_change,
    'doc_number', v_doc_number,
    'status', 'completed'
  );
END;
$$;
