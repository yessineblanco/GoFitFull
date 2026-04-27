-- Canonical daily finance view for advanced admin BI.
-- This keeps gross pack sales separate from wallet-ledger signals so BI can
-- surface partial finance metrics without pretending net revenue is reconciled.

CREATE OR REPLACE VIEW public.bi_finance_daily
WITH (security_invoker = true)
AS
WITH pack_sales_daily AS (
  SELECT
    DATE(pp.purchased_at) AS metric_date,
    pp.coach_id,
    sp.currency,
    COUNT(*)::INTEGER AS pack_sales_count,
    COALESCE(SUM(sp.price), 0)::NUMERIC(12, 2) AS gross_pack_sales
  FROM public.purchased_packs pp
  JOIN public.session_packs sp ON sp.id = pp.pack_id
  GROUP BY DATE(pp.purchased_at), pp.coach_id, sp.currency
),
ledger_daily AS (
  SELECT
    DATE(t.created_at) AS metric_date,
    w.coach_id,
    w.currency,
    COALESCE(SUM(CASE WHEN t.type = 'earning' THEN t.amount ELSE 0 END), 0)::NUMERIC(12, 2) AS wallet_earnings_amount,
    COALESCE(SUM(CASE WHEN t.type = 'platform_fee' THEN t.amount ELSE 0 END), 0)::NUMERIC(12, 2) AS platform_fee_amount,
    COUNT(*) FILTER (WHERE t.type = 'platform_fee')::INTEGER AS platform_fee_count,
    COALESCE(SUM(CASE WHEN t.type = 'refund' THEN t.amount ELSE 0 END), 0)::NUMERIC(12, 2) AS refund_ledger_amount,
    COUNT(*) FILTER (WHERE t.type = 'refund')::INTEGER AS refund_ledger_count,
    COALESCE(SUM(CASE WHEN t.type = 'payout' THEN t.amount ELSE 0 END), 0)::NUMERIC(12, 2) AS payout_amount,
    COUNT(*) FILTER (WHERE t.type = 'payout')::INTEGER AS payout_count
  FROM public.transactions t
  JOIN public.wallets w ON w.id = t.wallet_id
  GROUP BY DATE(t.created_at), w.coach_id, w.currency
),
all_keys AS (
  SELECT metric_date, coach_id, currency FROM pack_sales_daily
  UNION
  SELECT metric_date, coach_id, currency FROM ledger_daily
)
SELECT
  k.metric_date,
  k.coach_id,
  k.currency,
  COALESCE(ps.gross_pack_sales, 0)::NUMERIC(12, 2) AS gross_pack_sales,
  COALESCE(ps.pack_sales_count, 0)::INTEGER AS pack_sales_count,
  COALESCE(
    ROUND(
      COALESCE(ps.gross_pack_sales, 0) / NULLIF(COALESCE(ps.pack_sales_count, 0), 0),
      2
    ),
    0
  )::NUMERIC(12, 2) AS average_order_value,
  COALESCE(ld.wallet_earnings_amount, 0)::NUMERIC(12, 2) AS wallet_earnings_amount,
  COALESCE(ld.platform_fee_amount, 0)::NUMERIC(12, 2) AS platform_fee_amount,
  COALESCE(ld.platform_fee_count, 0)::INTEGER AS platform_fee_count,
  COALESCE(ld.refund_ledger_amount, 0)::NUMERIC(12, 2) AS refund_ledger_amount,
  COALESCE(ld.refund_ledger_count, 0)::INTEGER AS refund_ledger_count,
  COALESCE(ld.payout_amount, 0)::NUMERIC(12, 2) AS payout_amount,
  COALESCE(ld.payout_count, 0)::INTEGER AS payout_count
FROM all_keys k
LEFT JOIN pack_sales_daily ps
  ON ps.metric_date = k.metric_date
  AND ps.coach_id = k.coach_id
  AND ps.currency = k.currency
LEFT JOIN ledger_daily ld
  ON ld.metric_date = k.metric_date
  AND ld.coach_id = k.coach_id
  AND ld.currency = k.currency;

GRANT SELECT ON public.bi_finance_daily TO authenticated;
