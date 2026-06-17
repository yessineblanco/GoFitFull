import assert from "node:assert/strict";
import test from "node:test";

import {
  summarizeBIFinanceByCurrency,
  summarizeBIFinancePackSalesDailyRows,
} from "./bi-finance.ts";

test("finance summary aggregates daily rows and current liabilities by currency", () => {
  assert.deepEqual(
    summarizeBIFinanceByCurrency(
      [
        {
          metricDate: "2026-06-01",
          coachId: "coach-1",
          currency: "USD",
          grossPackSales: 100,
          packSalesCount: 2,
          averageOrderValue: 50,
          walletEarningsAmount: 80,
          platformFeeAmount: 20,
          platformFeeCount: 2,
          refundLedgerAmount: 5,
          refundLedgerCount: 1,
          payoutAmount: 30,
          payoutCount: 1,
        },
        {
          metricDate: "2026-06-02",
          coachId: "coach-2",
          currency: "USD",
          grossPackSales: 50,
          packSalesCount: 1,
          averageOrderValue: 50,
          walletEarningsAmount: 40,
          platformFeeAmount: 10,
          platformFeeCount: 1,
          refundLedgerAmount: 0,
          refundLedgerCount: 0,
          payoutAmount: 0,
          payoutCount: 0,
        },
      ],
      [
        {
          coachId: "coach-1",
          currency: "USD",
          currentPayoutLiability: 25,
        },
        {
          coachId: "coach-3",
          currency: "EUR",
          currentPayoutLiability: 70,
        },
      ]
    ),
    [
      {
        currency: "USD",
        grossPackSales: 150,
        packSalesCount: 3,
        averageOrderValue: 50,
        walletEarningsAmount: 120,
        platformFeeAmount: 30,
        platformFeeCount: 3,
        refundLedgerAmount: 5,
        refundLedgerCount: 1,
        payoutAmount: 30,
        payoutCount: 1,
        currentPayoutLiability: 25,
        coachesWithLiability: 1,
      },
      {
        currency: "EUR",
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
        currentPayoutLiability: 70,
        coachesWithLiability: 1,
      },
    ]
  );
});

test("pack sales summary groups by purchase date, coach, and currency", () => {
  assert.deepEqual(
    summarizeBIFinancePackSalesDailyRows([
      {
        purchased_at: "2026-06-02T10:00:00.000Z",
        coach_id: "coach-2",
        session_packs: { currency: "USD", price: "20.5" },
      },
      {
        purchased_at: "2026-06-01T10:00:00.000Z",
        coach_id: "coach-1",
        session_packs: [{ currency: "EUR", price: 15 }],
      },
      {
        purchased_at: "2026-06-02T12:00:00.000Z",
        coach_id: "coach-2",
        session_packs: { currency: "USD", price: "not-a-number" },
      },
      {
        purchased_at: "2026-06-03T12:00:00.000Z",
        coach_id: "coach-3",
        session_packs: null,
      },
    ]),
    [
      {
        metricDate: "2026-06-01",
        coachId: "coach-1",
        currency: "EUR",
        grossPackSales: 15,
        packSalesCount: 1,
        averageOrderValue: 15,
        walletEarningsAmount: 0,
        platformFeeAmount: 0,
        platformFeeCount: 0,
        refundLedgerAmount: 0,
        refundLedgerCount: 0,
        payoutAmount: 0,
        payoutCount: 0,
      },
      {
        metricDate: "2026-06-02",
        coachId: "coach-2",
        currency: "USD",
        grossPackSales: 20.5,
        packSalesCount: 2,
        averageOrderValue: 10.25,
        walletEarningsAmount: 0,
        platformFeeAmount: 0,
        platformFeeCount: 0,
        refundLedgerAmount: 0,
        refundLedgerCount: 0,
        payoutAmount: 0,
        payoutCount: 0,
      },
    ]
  );
});
