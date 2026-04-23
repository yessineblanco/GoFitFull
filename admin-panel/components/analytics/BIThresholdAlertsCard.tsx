import { AlertTriangle, Gauge, Users } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BIClientHealthSnapshotRow } from "@/lib/bi-client-health";
import { BICoachOpsSummaryRow } from "@/lib/bi-coach-ops";
import { cn } from "@/lib/utils";

interface BIThresholdAlertsCardProps {
  clientRows: BIClientHealthSnapshotRow[];
  coachFilterActive?: boolean;
  coachRows: BICoachOpsSummaryRow[];
  windowLabel: string;
}

const CLIENT_INACTIVE_WARNING_DAYS = 14;
const CLIENT_INACTIVE_CRITICAL_DAYS = 30;
const COACH_LOW_UTILIZATION_WARNING = 25;
const COACH_LOW_UTILIZATION_CRITICAL = 10;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Number(value.toFixed(1))}%`;
}

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)}h`;
}

function formatInactiveClientLabel(row: BIClientHealthSnapshotRow) {
  if (row.daysSinceLastCompletedWorkout === null) {
    return "No completed workout yet";
  }

  return `${row.daysSinceLastCompletedWorkout}d since last completed workout`;
}

function getInactiveClientSeverity(row: BIClientHealthSnapshotRow) {
  if (
    row.daysSinceLastCompletedWorkout === null ||
    row.daysSinceLastCompletedWorkout >= CLIENT_INACTIVE_CRITICAL_DAYS
  ) {
    return "critical";
  }

  return "warning";
}

function getCoachSeverity(row: BICoachOpsSummaryRow) {
  if (row.approximateUtilizationRate < COACH_LOW_UTILIZATION_CRITICAL) {
    return "critical";
  }

  return "warning";
}

function getSeverityBadgeClassName(severity: "critical" | "warning") {
  return severity === "critical"
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

export default function BIThresholdAlertsCard({
  clientRows,
  coachFilterActive = false,
  coachRows,
  windowLabel,
}: BIThresholdAlertsCardProps) {
  const inactiveClientRows = clientRows
    .filter(
      (row) =>
        row.daysSinceLastCompletedWorkout === null ||
        row.daysSinceLastCompletedWorkout >= CLIENT_INACTIVE_WARNING_DAYS
    )
    .sort((a, b) => {
      const aDays = a.daysSinceLastCompletedWorkout ?? Number.POSITIVE_INFINITY;
      const bDays = b.daysSinceLastCompletedWorkout ?? Number.POSITIVE_INFINITY;
      if (aDays !== bDays) {
        return bDays - aDays;
      }

      return b.atRiskSignalsCount - a.atRiskSignalsCount;
    });
  const lowUtilizationCoachRows = coachRows
    .filter(
      (row) =>
        row.availableMinutesPattern > 0 &&
        row.approximateUtilizationRate < COACH_LOW_UTILIZATION_WARNING
    )
    .sort((a, b) => a.approximateUtilizationRate - b.approximateUtilizationRate);
  const criticalInactiveClients = inactiveClientRows.filter(
    (row) => getInactiveClientSeverity(row) === "critical"
  ).length;
  const warningInactiveClients = inactiveClientRows.length - criticalInactiveClients;
  const criticalLowUtilizationCoaches = lowUtilizationCoachRows.filter(
    (row) => getCoachSeverity(row) === "critical"
  ).length;
  const warningLowUtilizationCoaches =
    lowUtilizationCoachRows.length - criticalLowUtilizationCoaches;

  return (
    <Card className="relative overflow-hidden border-white/40 bg-gradient-to-br from-background/95 via-background to-muted/35">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-rose-500/10 text-rose-700 dark:text-rose-300">
                Threshold Alerts
              </Badge>
              <Badge variant="outline" className="bg-background/60">
                Current panel only
              </Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-4 w-4" />
                In-Panel Threshold Alerts
              </CardTitle>
              <CardDescription>
                Fixed dashboard thresholds for current client inactivity and low coach
                utilization before any scheduled delivery layer.
              </CardDescription>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Client Critical
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatNumber(criticalInactiveClients)}
              </p>
              <p className="text-xs text-muted-foreground">30d+ inactive or never</p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Client Warning
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatNumber(warningInactiveClients)}
              </p>
              <p className="text-xs text-muted-foreground">14d+ inactive</p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Coach Critical
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatNumber(criticalLowUtilizationCoaches)}
              </p>
              <p className="text-xs text-muted-foreground">Under 10% utilization</p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Coach Warning
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatNumber(warningLowUtilizationCoaches)}
              </p>
              <p className="text-xs text-muted-foreground">10% to under 25%</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 pt-0 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border bg-background/70 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-rose-500" />
            <div>
              <p className="text-sm font-semibold">Inactive Client Alerts</p>
              <p className="text-xs text-muted-foreground">
                Current snapshot threshold: 14+ days since last completed workout.
              </p>
            </div>
          </div>

          {inactiveClientRows.length === 0 ? (
            <Alert>
              <AlertTitle>No inactive-client alerts</AlertTitle>
              <AlertDescription>
                No current clients are over the inactivity threshold.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {inactiveClientRows.slice(0, 4).map((row) => {
                const severity = getInactiveClientSeverity(row);

                return (
                  <div
                    key={row.userId}
                    className="rounded-lg border border-border/60 bg-background/80 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{row.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatInactiveClientLabel(row)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("w-fit", getSeverityBadgeClassName(severity))}
                      >
                        {severity === "critical" ? "Critical" : "Warning"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatNumber(row.atRiskSignalsCount)} active risk signal
                      {row.atRiskSignalsCount === 1 ? "" : "s"} -{" "}
                      {formatNumber(row.currentExpiringPackCount7d)} pack
                      {row.currentExpiringPackCount7d === 1 ? "" : "s"} expiring in 7d
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border bg-background/70 p-4">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-sm font-semibold">Low Utilization Coach Alerts</p>
              <p className="text-xs text-muted-foreground">
                Threshold uses {windowLabel.toLowerCase()} coach ops with recurring
                availability minutes as the denominator.
              </p>
            </div>
          </div>

          {lowUtilizationCoachRows.length === 0 ? (
            <Alert>
              <AlertTitle>No low-utilization alerts</AlertTitle>
              <AlertDescription>
                No coaches with recurring availability are currently below the
                utilization threshold.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {lowUtilizationCoachRows.slice(0, 4).map((row) => {
                const severity = getCoachSeverity(row);

                return (
                  <div
                    key={row.coachId}
                    className="rounded-lg border border-border/60 bg-background/80 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{row.coachName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPercent(row.approximateUtilizationRate)} utilization from{" "}
                          {formatHours(row.nonCancelledBookingMinutes)} booked /{" "}
                          {formatHours(row.availableMinutesPattern)} available
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("w-fit", getSeverityBadgeClassName(severity))}
                      >
                        {severity === "critical" ? "Critical" : "Warning"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatNumber(row.totalBookings)} booking
                      {row.totalBookings === 1 ? "" : "s"} in {windowLabel} -{" "}
                      {formatNumber(row.currentRelationshipClients)} current client
                      {row.currentRelationshipClients === 1 ? "" : "s"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {coachFilterActive ? (
          <p className="lg:col-span-2 text-xs text-muted-foreground">
            Current scope note: coach filters apply to utilization alerts only.
            Inactive-client alerts remain global until client-health snapshots gain
            coach attribution.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
