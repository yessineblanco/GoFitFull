import { format, parseISO } from "date-fns";
import { Layers3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BIUserWorkoutCohortRetentionRow } from "@/lib/bi-user-lifecycle";
import { cn } from "@/lib/utils";

interface RetentionCohortCardProps {
  cohorts: BIUserWorkoutCohortRetentionRow[];
}

function formatCohortMonth(value: string) {
  try {
    return format(parseISO(value), "MMM yyyy");
  } catch {
    return value.slice(0, 7);
  }
}

function formatPercent(value: number) {
  return `${Number(value.toFixed(1))}%`;
}

export default function RetentionCohortCard({
  cohorts,
}: RetentionCohortCardProps) {
  const orderedCohorts = [...cohorts].reverse();
  const periodHeaders = orderedCohorts[0]?.periods || [];
  const monthOneRates = cohorts
    .map((cohort) => cohort.periods.find((period) => period.period === 1)?.retentionRate)
    .filter((value): value is number => typeof value === "number");
  const averageMonthOneRetention =
    monthOneRates.length > 0
      ? monthOneRates.reduce((sum, value) => sum + value, 0) / monthOneRates.length
      : 0;
  const strongestMonthOneCohort = cohorts.reduce<BIUserWorkoutCohortRetentionRow | null>(
    (best, cohort) => {
      const bestRate = best?.periods.find((period) => period.period === 1)?.retentionRate ?? -1;
      const currentRate =
        cohort.periods.find((period) => period.period === 1)?.retentionRate ?? -1;

      return currentRate > bestRate ? cohort : best;
    },
    null
  );
  const strongestMonthOneRate =
    strongestMonthOneCohort?.periods.find((period) => period.period === 1)?.retentionRate ?? 0;
  const latestCohort = orderedCohorts[0] || null;

  return (
    <Card className="relative overflow-hidden border-white/40 bg-gradient-to-br from-background/95 via-background to-muted/35">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Retention Drilldown
              </Badge>
              <Badge variant="outline" className="bg-background/60">
                Workout-based cohorts
              </Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers3 className="h-4 w-4" />
                Signup To Workout Cohorts
              </CardTitle>
              <CardDescription>
                Users count as retained in month N when they log any workout session in that
                month. Period 0 is the signup month cohort size.
              </CardDescription>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Latest Cohort
              </p>
              <p className="mt-1 text-sm font-semibold">
                {latestCohort ? formatCohortMonth(latestCohort.cohortMonth) : "No data"}
              </p>
              <p className="text-xs text-muted-foreground">
                {latestCohort ? `${latestCohort.cohortSize} signups` : "Waiting for signups"}
              </p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Avg Month 1
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatPercent(averageMonthOneRetention)}
              </p>
              <p className="text-xs text-muted-foreground">
                Across visible signup cohorts
              </p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Best Month 1
              </p>
              <p className="mt-1 text-sm font-semibold">
                {strongestMonthOneCohort
                  ? formatCohortMonth(strongestMonthOneCohort.cohortMonth)
                  : "No data"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatPercent(strongestMonthOneRate)} retained
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {orderedCohorts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No cohort retention data available yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-border/70">
                  <th className="py-3 pr-3 text-left font-medium">Cohort</th>
                  <th className="px-3 py-3 text-right font-medium">Size</th>
                  {periodHeaders.map((period) => (
                    <th key={period.period} className="px-2 py-3 text-center font-medium">
                      M{period.period}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orderedCohorts.map((cohort) => (
                  <tr key={cohort.cohortMonth} className="border-b border-border/40">
                    <td className="py-3 pr-3 align-middle">
                      <div className="font-medium">{formatCohortMonth(cohort.cohortMonth)}</div>
                      <p className="text-xs text-muted-foreground">
                        Signup month cohort
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right font-medium">{cohort.cohortSize}</td>
                    {cohort.periods.map((period) => {
                      const rate = period.retentionRate;
                      const alpha =
                        period.period === 0 ? 0.2 : 0.08 + (Math.min(rate, 100) / 100) * 0.34;

                      return (
                        <td key={period.period} className="px-2 py-3 text-center">
                          <div
                            className={cn(
                              "rounded-md border px-2 py-2 text-xs font-semibold",
                              period.period === 0
                                ? "border-primary/20 bg-primary/10 text-primary"
                                : rate >= 60
                                  ? "border-emerald-400/30 text-emerald-950 dark:text-emerald-50"
                                  : "border-border/60"
                            )}
                            style={
                              period.period === 0
                                ? undefined
                                : { backgroundColor: `rgba(16, 185, 129, ${alpha})` }
                            }
                          >
                            <div>{formatPercent(rate)}</div>
                            <div className="mt-1 text-[11px] font-normal opacity-80">
                              {period.activeUsers} users
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
