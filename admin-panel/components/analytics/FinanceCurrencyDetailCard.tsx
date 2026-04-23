import { Coins } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BIFinanceSummaryRow } from "@/lib/bi-finance";

interface FinanceCurrencyDetailCardProps {
  packScopeName?: string | null;
  rows: BIFinanceSummaryRow[];
}

function formatCurrencyAmount(
  value: number,
  currency: string,
  maximumFractionDigits = 0
) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(maximumFractionDigits)}`;
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function FinanceCurrencyDetailCard({
  packScopeName,
  rows,
}: FinanceCurrencyDetailCardProps) {
  const isPackScoped = Boolean(packScopeName);
  const sortedRows = [...rows].sort((a, b) => b.grossPackSales - a.grossPackSales);
  const totalPackSalesCount = sortedRows.reduce((sum, row) => sum + row.packSalesCount, 0);
  const totalPayoutCount = sortedRows.reduce((sum, row) => sum + row.payoutCount, 0);
  const currenciesWithLiability = sortedRows.filter((row) => row.currentPayoutLiability > 0).length;

  return (
    <Card className="relative overflow-hidden border-white/40 bg-gradient-to-br from-background/95 via-background to-muted/35">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Finance Detail
              </Badge>
              <Badge variant="outline" className="bg-background/60">
                By currency
              </Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Coins className="h-4 w-4" />
                {isPackScoped ? "Package Sales By Currency" : "Finance By Currency"}
              </CardTitle>
              <CardDescription>
                {isPackScoped
                  ? `Gross pack sales for ${packScopeName} by currency. Package-scoped ledger and liability rows are intentionally not shown.`
                  : "Gross pack sales, ledger signals, payouts, and payout liability by currency. Net revenue is intentionally not shown here yet."}
              </CardDescription>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Currencies
              </p>
              <p className="mt-1 text-sm font-semibold">{sortedRows.length}</p>
              <p className="text-xs text-muted-foreground">Tracked in current window</p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Pack Sales
              </p>
              <p className="mt-1 text-sm font-semibold">{formatNumber(totalPackSalesCount)}</p>
              <p className="text-xs text-muted-foreground">Orders across all currencies</p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {isPackScoped ? "Package Scope" : "Liability Currencies"}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {isPackScoped ? packScopeName : currenciesWithLiability}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPackScoped
                  ? "Package filter applies to pack sales only"
                  : `${formatNumber(totalPayoutCount)} payout row${totalPayoutCount === 1 ? "" : "s"} in range`}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {sortedRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No finance summary rows available in the selected window.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-border/70">
                  <th className="py-3 pr-3 text-left font-medium">Currency</th>
                  <th className="px-3 py-3 text-left font-medium">Gross Sales</th>
                  <th className="px-3 py-3 text-left font-medium">Orders / AOV</th>
                  {!isPackScoped ? (
                    <>
                      <th className="px-3 py-3 text-left font-medium">Platform Fees</th>
                      <th className="px-3 py-3 text-left font-medium">Refund Ledger</th>
                      <th className="px-3 py-3 text-left font-medium">Payouts</th>
                      <th className="py-3 pl-3 text-left font-medium">Liability</th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr
                    key={row.currency}
                    className="border-b border-border/40 transition-colors hover:bg-muted/20"
                  >
                    <td className="py-3 pr-3 align-top">
                      <div className="font-medium">{row.currency}</div>
                      <p className="text-xs text-muted-foreground">
                        {row.coachesWithLiability} coach
                        {row.coachesWithLiability === 1 ? "" : "es"} with liability
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="font-medium">
                        {formatCurrencyAmount(row.grossPackSales, row.currency)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Wallet earnings {formatCurrencyAmount(row.walletEarningsAmount, row.currency)}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="font-medium">
                        {formatNumber(row.packSalesCount)} order
                        {row.packSalesCount === 1 ? "" : "s"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        AOV {formatCurrencyAmount(row.averageOrderValue, row.currency, 2)}
                      </p>
                    </td>
                    {!isPackScoped ? (
                      <>
                        <td className="px-3 py-3 align-top">
                          <div className="font-medium">
                            {formatCurrencyAmount(row.platformFeeAmount, row.currency, 2)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(row.platformFeeCount)} fee row
                            {row.platformFeeCount === 1 ? "" : "s"}
                          </p>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="font-medium">
                            {formatCurrencyAmount(row.refundLedgerAmount, row.currency, 2)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(row.refundLedgerCount)} refund row
                            {row.refundLedgerCount === 1 ? "" : "s"}
                          </p>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="font-medium">
                            {formatCurrencyAmount(row.payoutAmount, row.currency, 2)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(row.payoutCount)} payout row
                            {row.payoutCount === 1 ? "" : "s"}
                          </p>
                        </td>
                        <td className="py-3 pl-3 align-top">
                          <div className="font-medium">
                            {formatCurrencyAmount(row.currentPayoutLiability, row.currency, 2)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Current unpaid wallet balance snapshot
                          </p>
                        </td>
                      </>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isPackScoped ? (
          <p className="text-xs text-muted-foreground">
            Package filtering currently scopes gross pack sales, orders, and AOV only.
            Ledger rows and payout liability stay unscoped until finance facts carry pack
            attribution.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
