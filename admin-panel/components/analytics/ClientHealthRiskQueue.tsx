import { format, parseISO } from "date-fns";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BIClientHealthSnapshotRow } from "@/lib/bi-client-health";
import { cn } from "@/lib/utils";

interface ClientHealthRiskQueueProps {
  rows: BIClientHealthSnapshotRow[];
  nutritionSignalsLikelyNoisy?: boolean;
}

function formatSignupDate(value: string) {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

function getRiskBadgeClassName(riskCount: number) {
  if (riskCount >= 4) {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  if (riskCount >= 3) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (riskCount >= 2) {
    return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }

  return "border-border/60 bg-background/70 text-muted-foreground";
}

function formatWorkoutStatus(row: BIClientHealthSnapshotRow) {
  if (row.daysSinceLastCompletedWorkout === null) {
    return "No completed workout yet";
  }

  if (row.workoutInactive14d) {
    return `Inactive ${row.daysSinceLastCompletedWorkout ?? "?"}d`;
  }

  if (row.workoutInactive7d) {
    return `Inactive ${row.daysSinceLastCompletedWorkout ?? "?"}d`;
  }

  return `${row.completedWorkoutDaysLast7d} active day${row.completedWorkoutDaysLast7d === 1 ? "" : "s"} / 7d`;
}

function getRiskReasons(row: BIClientHealthSnapshotRow) {
  const reasons: string[] = [];

  if (row.workoutInactive7d) {
    reasons.push("Workout inactive");
  }

  if (row.nutritionInactive7d) {
    reasons.push("No recent nutrition logs");
  }

  if (!row.hasRecentBodyMeasurement30d) {
    reasons.push("No recent body measurement");
  }

  if (row.currentExpiringPackCount7d > 0) {
    reasons.push("Pack expiring soon");
  }

  return reasons;
}

function formatBodyStatus(row: BIClientHealthSnapshotRow) {
  if (!row.hasRecentBodyMeasurement30d) {
    return row.daysSinceLastBodyMeasurement === null
      ? "No measurement yet"
      : `${row.daysSinceLastBodyMeasurement}d since last`;
  }

  return `${row.daysSinceLastBodyMeasurement ?? 0}d since last`;
}

function formatPackStatus(row: BIClientHealthSnapshotRow) {
  if (row.currentExpiringPackCount7d > 0) {
    return `${row.currentExpiringPackCount7d} expiring in 7d`;
  }

  if (row.currentExpiringPackCount14d > 0) {
    return `${row.currentExpiringPackCount14d} expiring in 14d`;
  }

  if (row.currentActivePackCount > 0) {
    return `${row.currentRemainingSessions} sessions left`;
  }

  return "No active pack";
}

export default function ClientHealthRiskQueue({
  rows,
  nutritionSignalsLikelyNoisy = false,
}: ClientHealthRiskQueueProps) {
  const queueRows = rows
    .filter(
      (row) =>
        row.atRiskSignalsCount > 0 ||
        row.currentExpiringPackCount14d > 0 ||
        row.workoutInactive14d ||
        !row.hasRecentBodyMeasurement30d
    )
    .slice(0, 8);
  const criticalCount = rows.filter((row) => row.atRiskSignalsCount >= 3).length;
  const workoutInactiveCount = rows.filter((row) => row.workoutInactive14d).length;
  const expiringPackCount = rows.filter((row) => row.currentExpiringPackCount7d > 0).length;

  return (
    <Card className="relative overflow-hidden border-white/40 bg-gradient-to-br from-background/95 via-background to-muted/35">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              >
                Client Health Queue
              </Badge>
              <Badge variant="outline" className="bg-background/60">
                Current snapshots
              </Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-4 w-4" />
                Highest Risk Clients
              </CardTitle>
              <CardDescription>
                Ranked by current risk signals, pack expiry pressure, and workout inactivity.
              </CardDescription>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Critical
              </p>
              <p className="mt-1 text-sm font-semibold">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">3+ active risk signals</p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Workout Inactive
              </p>
              <p className="mt-1 text-sm font-semibold">{workoutInactiveCount}</p>
              <p className="text-xs text-muted-foreground">No completed workout in 14d</p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Packs Expiring
              </p>
              <p className="mt-1 text-sm font-semibold">{expiringPackCount}</p>
              <p className="text-xs text-muted-foreground">Active packs expiring in 7d</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {nutritionSignalsLikelyNoisy ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            Nutrition inactivity is currently noisy because no recent meal-log activity exists
            in the workspace yet.
          </div>
        ) : null}

        {queueRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No at-risk clients in the current snapshot.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border/70">
                  <th className="py-3 pr-3 text-left font-medium">Client</th>
                  <th className="px-3 py-3 text-left font-medium">Risk</th>
                  <th className="px-3 py-3 text-left font-medium">Workout</th>
                  <th className="px-3 py-3 text-left font-medium">Nutrition</th>
                  <th className="px-3 py-3 text-left font-medium">Body</th>
                  <th className="py-3 pl-3 text-left font-medium">Pack</th>
                </tr>
              </thead>
              <tbody>
                {queueRows.map((row) => {
                  const riskReasons = getRiskReasons(row);

                  return (
                    <tr
                      key={row.userId}
                      className="border-b border-border/40 transition-colors hover:bg-muted/20"
                    >
                      <td className="py-3 pr-3 align-top">
                        <div className="font-medium">{row.userName}</div>
                        <p className="text-xs text-muted-foreground">
                          Joined {formatSignupDate(row.signupDate)}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <Badge
                            variant="outline"
                            className={cn("w-fit", getRiskBadgeClassName(row.atRiskSignalsCount))}
                          >
                            {row.atRiskSignalsCount} signal{row.atRiskSignalsCount === 1 ? "" : "s"}
                          </Badge>
                          {riskReasons.length > 0 ? (
                            <div className="space-y-1">
                              {riskReasons.slice(0, 2).map((reason) => (
                                <p key={reason} className="text-xs text-muted-foreground">
                                  {reason}
                                </p>
                              ))}
                              {riskReasons.length > 2 ? (
                                <p className="text-xs text-muted-foreground">
                                  +{riskReasons.length - 2} more signal
                                  {riskReasons.length - 2 === 1 ? "" : "s"}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No active urgent signals
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="font-medium">{formatWorkoutStatus(row)}</div>
                        <p className="text-xs text-muted-foreground">
                          {row.completedWorkoutDaysLast28d} active day
                          {row.completedWorkoutDaysLast28d === 1 ? "" : "s"} / 28d
                        </p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div
                          className={cn(
                            "font-medium",
                            row.nutritionInactive7d ? "text-muted-foreground" : ""
                          )}
                        >
                          {row.nutritionInactive7d
                            ? row.daysSinceLastNutritionLog === null
                              ? "No nutrition logs yet"
                              : `${row.daysSinceLastNutritionLog}d since last log`
                            : `${row.nutritionLogDaysLast7d} log day${row.nutritionLogDaysLast7d === 1 ? "" : "s"} / 7d`}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {nutritionSignalsLikelyNoisy
                            ? "Signal currently low-confidence"
                            : "Used as a current risk input"}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div
                          className={cn(
                            "font-medium",
                            !row.hasRecentBodyMeasurement30d ? "text-muted-foreground" : ""
                          )}
                        >
                          {formatBodyStatus(row)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {row.hasRecentBodyMeasurement30d
                            ? "Within recent 30d window"
                            : "Missing recent measurement"}
                        </p>
                      </td>
                      <td className="py-3 pl-3 align-top">
                        <div
                          className={cn(
                            "font-medium",
                            row.currentExpiringPackCount7d > 0
                              ? "text-amber-700 dark:text-amber-300"
                              : ""
                          )}
                        >
                          {formatPackStatus(row)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {row.currentRemainingSessions} sessions remaining
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
