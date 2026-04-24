import { format, startOfDay, subDays } from "date-fns";

import { getBIClientHealthOverview } from "./bi-client-health";
import { getBICoachOpsOverview } from "./bi-coach-ops";
import { getBIFinanceOverview } from "./bi-finance";
import { getBIUserLifecycleOverview } from "./bi-user-lifecycle";

const ADVANCED_BI_SNAPSHOT_RANGES = {
  "7d": {
    days: 7,
    label: "7D",
  },
  "30d": {
    days: 30,
    label: "30D",
  },
  "90d": {
    days: 90,
    label: "90D",
  },
} as const;

export const ADVANCED_BI_SNAPSHOT_RANGE_KEYS = Object.keys(
  ADVANCED_BI_SNAPSHOT_RANGES
) as Array<keyof typeof ADVANCED_BI_SNAPSHOT_RANGES>;

export type AdvancedBISnapshotRangeKey =
  (typeof ADVANCED_BI_SNAPSHOT_RANGE_KEYS)[number];

export interface AdvancedBISnapshotScope {
  coachId?: string | null;
  coachName?: string | null;
  packId?: string | null;
  packName?: string | null;
  rangeKey: AdvancedBISnapshotRangeKey;
  viewName?: string | null;
}

export interface AdvancedBISnapshotNotificationPayload {
  href: string;
  message: string;
  title: string;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
  }
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatOrderCount(value: number) {
  return `${formatCompactNumber(value)} ${value === 1 ? "order" : "orders"}`;
}

function buildFinanceSummary(
  rows: Awaited<ReturnType<typeof getBIFinanceOverview>>["summaryByCurrency"]
) {
  if (rows.length === 0) {
    return "Sales none";
  }

  const orderedRows = [...rows].sort((left, right) => {
    if (right.grossPackSales !== left.grossPackSales) {
      return right.grossPackSales - left.grossPackSales;
    }

    return right.packSalesCount - left.packSalesCount;
  });
  const visibleRows = orderedRows.slice(0, 2).map((row) => {
    return `${row.currency} ${formatCompactCurrency(
      row.grossPackSales,
      row.currency
    )} / ${formatOrderCount(row.packSalesCount)}`;
  });

  if (orderedRows.length > visibleRows.length) {
    visibleRows.push(`+${orderedRows.length - visibleRows.length} more`);
  }

  return `Sales ${visibleRows.join(", ")}`;
}

function buildSnapshotHref({ coachId, packId, rangeKey }: AdvancedBISnapshotScope) {
  const params = new URLSearchParams({
    range: rangeKey,
  });

  if (coachId) {
    params.set("coach", coachId);
  }

  if (packId) {
    params.set("pack", packId);
  }

  return `/dashboard?${params.toString()}`;
}

function buildSnapshotTitle({
  coachName,
  packName,
  rangeKey,
  viewName,
}: AdvancedBISnapshotScope) {
  const rangeLabel = ADVANCED_BI_SNAPSHOT_RANGES[rangeKey].label;

  if (viewName) {
    return `BI Snapshot - ${rangeLabel} - ${viewName}`;
  }

  if (packName) {
    return `BI Snapshot - ${rangeLabel} - ${packName}`;
  }

  if (coachName) {
    return `BI Snapshot - ${rangeLabel} - ${coachName}`;
  }

  return `BI Snapshot - ${rangeLabel}`;
}

function buildScopeNote({ coachId, packId }: AdvancedBISnapshotScope) {
  if (!coachId && !packId) {
    return null;
  }

  return "Coach/package filters scope finance and coach ops only.";
}

export async function buildAdvancedBISnapshotNotification(
  scope: AdvancedBISnapshotScope
): Promise<AdvancedBISnapshotNotificationPayload> {
  const range = ADVANCED_BI_SNAPSHOT_RANGES[scope.rangeKey];
  const endDate = startOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, range.days - 1));

  const [finance, lifecycle, coachOps, clientHealth] = await Promise.all([
    getBIFinanceOverview({
      startDate,
      endDate,
      coachId: scope.coachId || undefined,
      packId: scope.packId || undefined,
    }),
    getBIUserLifecycleOverview({
      startDate,
      endDate,
    }),
    getBICoachOpsOverview({
      startDate,
      endDate,
      coachId: scope.coachId || undefined,
    }),
    getBIClientHealthOverview({
      startDate,
      endDate,
    }),
  ]);

  const coachOpsTotalBookings =
    coachOps.totals.totalCompletedBookings +
    coachOps.totals.totalCancelledBookings +
    coachOps.totals.totalNoShows;
  const noShowRate =
    coachOpsTotalBookings > 0
      ? (coachOps.totals.totalNoShows / coachOpsTotalBookings) * 100
      : 0;
  const scopeNote = buildScopeNote(scope);
  const messageParts = [
    `${format(startDate, "MMM d")}-${format(endDate, "MMM d")}`,
    buildFinanceSummary(finance.summaryByCurrency),
    `Lifecycle ${formatCompactNumber(
      lifecycle.summary.anyActiveUsersInRange
    )} active, ${formatCompactNumber(
      lifecycle.summary.signupsInRange
    )} signups, DAU/WAU/MAU ${formatCompactNumber(
      lifecycle.summary.dau
    )}/${formatCompactNumber(lifecycle.summary.wau)}/${formatCompactNumber(
      lifecycle.summary.mau
    )}`,
    `Coach ops ${formatCompactNumber(
      coachOps.totals.coachesWithBookingActivity
    )} active coaches, ${formatCompactNumber(
      coachOps.totals.totalCompletedBookings
    )} completed, ${formatPercent(noShowRate)} no-show`,
    `Client health ${formatCompactNumber(
      clientHealth.summary.usersWithThreePlusRiskSignals
    )} high-risk, ${formatCompactNumber(
      clientHealth.summary.usersWithWorkoutLast7d
    )} workout-active, ${formatCompactNumber(
      clientHealth.summary.usersWithExpiringPack7d
    )} packs expiring`,
  ];

  if (scopeNote) {
    messageParts.push(scopeNote);
  }

  return {
    title: buildSnapshotTitle(scope),
    message: messageParts.join(". "),
    href: buildSnapshotHref(scope),
  };
}
