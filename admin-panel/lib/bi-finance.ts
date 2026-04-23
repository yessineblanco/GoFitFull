import { createAdminClient } from "./supabase/admin";

interface RawBIFinanceDailyRow {
  metric_date: string;
  coach_id: string;
  currency: string;
  gross_pack_sales: number | string | null;
  pack_sales_count: number | null;
  average_order_value: number | string | null;
  wallet_earnings_amount: number | string | null;
  platform_fee_amount: number | string | null;
  platform_fee_count: number | null;
  refund_ledger_amount: number | string | null;
  refund_ledger_count: number | null;
  payout_amount: number | string | null;
  payout_count: number | null;
}

interface RawPackSaleRow {
  purchased_at: string;
  coach_id: string;
  session_packs:
    | {
        currency: string;
        price: number | string | null;
      }
    | {
        currency: string;
        price: number | string | null;
      }[]
    | null;
}

interface RawWalletLiabilityRow {
  coach_id: string;
  currency: string;
  balance: number | string | null;
}

export interface BIFinanceDailyRow {
  metricDate: string;
  coachId: string;
  currency: string;
  grossPackSales: number;
  packSalesCount: number;
  averageOrderValue: number;
  walletEarningsAmount: number;
  platformFeeAmount: number;
  platformFeeCount: number;
  refundLedgerAmount: number;
  refundLedgerCount: number;
  payoutAmount: number;
  payoutCount: number;
}

export interface BIFinanceLiabilitySnapshot {
  coachId: string;
  currency: string;
  currentPayoutLiability: number;
}

export interface BIFinanceSummaryRow {
  currency: string;
  grossPackSales: number;
  packSalesCount: number;
  averageOrderValue: number;
  walletEarningsAmount: number;
  platformFeeAmount: number;
  platformFeeCount: number;
  refundLedgerAmount: number;
  refundLedgerCount: number;
  payoutAmount: number;
  payoutCount: number;
  currentPayoutLiability: number;
  coachesWithLiability: number;
}

export interface BIFinanceOverview {
  dailyRows: BIFinanceDailyRow[];
  summaryByCurrency: BIFinanceSummaryRow[];
  currentLiability: BIFinanceLiabilitySnapshot[];
}

export interface BIFinanceFilters {
  coachId?: string;
  endDate?: Date | string;
  packId?: string;
  startDate?: Date | string;
}

function formatDateFilter(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function mapDailyRow(row: RawBIFinanceDailyRow): BIFinanceDailyRow {
  return {
    metricDate: row.metric_date,
    coachId: row.coach_id,
    currency: row.currency,
    grossPackSales: toNumber(row.gross_pack_sales),
    packSalesCount: row.pack_sales_count || 0,
    averageOrderValue: toNumber(row.average_order_value),
    walletEarningsAmount: toNumber(row.wallet_earnings_amount),
    platformFeeAmount: toNumber(row.platform_fee_amount),
    platformFeeCount: row.platform_fee_count || 0,
    refundLedgerAmount: toNumber(row.refund_ledger_amount),
    refundLedgerCount: row.refund_ledger_count || 0,
    payoutAmount: toNumber(row.payout_amount),
    payoutCount: row.payout_count || 0,
  };
}

function summarizeByCurrency(
  dailyRows: BIFinanceDailyRow[],
  liabilityRows: BIFinanceLiabilitySnapshot[]
) {
  const summary = new Map<string, BIFinanceSummaryRow>();

  dailyRows.forEach((row) => {
    const existing = summary.get(row.currency) || {
      currency: row.currency,
      grossPackSales: 0,
      packSalesCount: 0,
      averageOrderValue: 0,
      walletEarningsAmount: 0,
      platformFeeAmount: 0,
      platformFeeCount: 0,
      refundLedgerAmount: 0,
      refundLedgerCount: 0,
      payoutAmount: 0,
      payoutCount: 0,
      currentPayoutLiability: 0,
      coachesWithLiability: 0,
    };

    existing.grossPackSales += row.grossPackSales;
    existing.packSalesCount += row.packSalesCount;
    existing.walletEarningsAmount += row.walletEarningsAmount;
    existing.platformFeeAmount += row.platformFeeAmount;
    existing.platformFeeCount += row.platformFeeCount;
    existing.refundLedgerAmount += row.refundLedgerAmount;
    existing.refundLedgerCount += row.refundLedgerCount;
    existing.payoutAmount += row.payoutAmount;
    existing.payoutCount += row.payoutCount;
    summary.set(row.currency, existing);
  });

  liabilityRows.forEach((row) => {
    const existing = summary.get(row.currency) || {
      currency: row.currency,
      grossPackSales: 0,
      packSalesCount: 0,
      averageOrderValue: 0,
      walletEarningsAmount: 0,
      platformFeeAmount: 0,
      platformFeeCount: 0,
      refundLedgerAmount: 0,
      refundLedgerCount: 0,
      payoutAmount: 0,
      payoutCount: 0,
      currentPayoutLiability: 0,
      coachesWithLiability: 0,
    };

    existing.currentPayoutLiability += row.currentPayoutLiability;
    existing.coachesWithLiability += 1;
    summary.set(row.currency, existing);
  });

  return Array.from(summary.values()).map((row) => ({
    ...row,
    averageOrderValue:
      row.packSalesCount > 0
        ? Number((row.grossPackSales / row.packSalesCount).toFixed(2))
        : 0,
  }));
}

function summarizePackSalesDailyRows(rows: RawPackSaleRow[]): BIFinanceDailyRow[] {
  const grouped = new Map<string, BIFinanceDailyRow>();

  rows.forEach((row) => {
    const sessionPack = Array.isArray(row.session_packs)
      ? row.session_packs[0]
      : row.session_packs;

    if (!sessionPack) {
      return;
    }

    const metricDate = row.purchased_at.slice(0, 10);
    const currency = sessionPack.currency;
    const key = `${metricDate}|${row.coach_id}|${currency}`;
    const existing = grouped.get(key) || {
      metricDate,
      coachId: row.coach_id,
      currency,
      grossPackSales: 0,
      packSalesCount: 0,
      averageOrderValue: 0,
      walletEarningsAmount: 0,
      platformFeeAmount: 0,
      platformFeeCount: 0,
      refundLedgerAmount: 0,
      refundLedgerCount: 0,
      payoutAmount: 0,
      payoutCount: 0,
    };

    existing.grossPackSales += toNumber(sessionPack.price);
    existing.packSalesCount += 1;
    grouped.set(key, existing);
  });

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      averageOrderValue:
        row.packSalesCount > 0
          ? Number((row.grossPackSales / row.packSalesCount).toFixed(2))
          : 0,
    }))
    .sort((a, b) => {
      if (a.metricDate !== b.metricDate) {
        return a.metricDate.localeCompare(b.metricDate);
      }

      return a.coachId.localeCompare(b.coachId);
    });
}

export async function getBIFinanceDailyRows(
  filters: BIFinanceFilters = {}
): Promise<BIFinanceDailyRow[]> {
  const adminClient = createAdminClient();

  if (filters.packId) {
    let packSalesQuery = adminClient
      .from("purchased_packs")
      .select("purchased_at, coach_id, session_packs!inner(currency, price)")
      .eq("pack_id", filters.packId)
      .order("purchased_at", { ascending: true });

    if (filters.startDate) {
      packSalesQuery = packSalesQuery.gte("purchased_at", `${formatDateFilter(filters.startDate)}T00:00:00.000Z`);
    }

    if (filters.endDate) {
      packSalesQuery = packSalesQuery.lte("purchased_at", `${formatDateFilter(filters.endDate)}T23:59:59.999Z`);
    }

    if (filters.coachId) {
      packSalesQuery = packSalesQuery.eq("coach_id", filters.coachId);
    }

    const { data, error } = await packSalesQuery;

    if (error) {
      throw new Error(`Failed to fetch BI finance pack sales rows: ${error.message}`);
    }

    return summarizePackSalesDailyRows((data || []) as RawPackSaleRow[]);
  }

  let query = adminClient
    .from("bi_finance_daily")
    .select("*")
    .order("metric_date", { ascending: true })
    .order("coach_id", { ascending: true });

  if (filters.startDate) {
    query = query.gte("metric_date", formatDateFilter(filters.startDate));
  }

  if (filters.endDate) {
    query = query.lte("metric_date", formatDateFilter(filters.endDate));
  }

  if (filters.coachId) {
    query = query.eq("coach_id", filters.coachId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch BI finance daily rows: ${error.message}`);
  }

  return ((data || []) as RawBIFinanceDailyRow[]).map(mapDailyRow);
}

export async function getCurrentCoachPayoutLiability(
  coachId?: string
): Promise<BIFinanceLiabilitySnapshot[]> {
  const adminClient = createAdminClient();
  let query = adminClient
    .from("wallets")
    .select("coach_id, currency, balance")
    .gt("balance", 0)
    .order("currency", { ascending: true })
    .order("coach_id", { ascending: true });

  if (coachId) {
    query = query.eq("coach_id", coachId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch current payout liability: ${error.message}`);
  }

  return ((data || []) as RawWalletLiabilityRow[]).map((row) => ({
    coachId: row.coach_id,
    currency: row.currency,
    currentPayoutLiability: toNumber(row.balance),
  }));
}

export async function getBIFinanceOverview(
  filters: BIFinanceFilters = {}
): Promise<BIFinanceOverview> {
  const [dailyRows, currentLiability] = await Promise.all([
    getBIFinanceDailyRows(filters),
    filters.packId ? Promise.resolve([]) : getCurrentCoachPayoutLiability(filters.coachId),
  ]);

  return {
    dailyRows,
    summaryByCurrency: summarizeByCurrency(dailyRows, currentLiability),
    currentLiability,
  };
}
