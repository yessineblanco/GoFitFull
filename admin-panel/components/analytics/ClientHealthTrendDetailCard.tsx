"use client";

import { format, parseISO } from "date-fns";
import { HeartPulse } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BIClientHealthOverview,
  BIClientHealthSeriesPoint,
} from "@/lib/bi-client-health";

interface ClientHealthTrendDetailCardProps {
  series: BIClientHealthSeriesPoint[];
  summary: BIClientHealthOverview["summary"];
  windowLabel: string;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatChartDate(value: string) {
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
}

export default function ClientHealthTrendDetailCard({
  series,
  summary,
  windowLabel,
}: ClientHealthTrendDetailCardProps) {
  const workoutSignalDays = series.filter((point) => point.workoutActiveUsers > 0).length;
  const nutritionSignalDays = series.filter((point) => point.nutritionLoggingUsers > 0).length;
  const bodySignalDays = series.filter((point) => point.bodyMeasurementUsers > 0).length;
  const peakSignalDay = series.reduce<BIClientHealthSeriesPoint | null>((best, point) => {
    const pointTotal =
      point.workoutActiveUsers + point.nutritionLoggingUsers + point.bodyMeasurementUsers;
    const bestTotal =
      (best?.workoutActiveUsers || 0) +
      (best?.nutritionLoggingUsers || 0) +
      (best?.bodyMeasurementUsers || 0);

    return pointTotal > bestTotal ? point : best;
  }, null);
  const peakSignalTotal =
    (peakSignalDay?.workoutActiveUsers || 0) +
    (peakSignalDay?.nutritionLoggingUsers || 0) +
    (peakSignalDay?.bodyMeasurementUsers || 0);

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
                Client Health Detail
              </Badge>
              <Badge variant="outline" className="bg-background/60">
                {windowLabel} window
              </Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <HeartPulse className="h-4 w-4" />
                Health Signal Trends
              </CardTitle>
              <CardDescription>
                Daily distinct users with workout, nutrition, and body-measurement
                signals from the canonical client-health layer.
              </CardDescription>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Workout 7d
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatNumber(summary.usersWithWorkoutLast7d)}
              </p>
              <p className="text-xs text-muted-foreground">
                {workoutSignalDays} signal days in range
              </p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Nutrition 7d
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatNumber(summary.usersWithNutritionLast7d)}
              </p>
              <p className="text-xs text-muted-foreground">
                {nutritionSignalDays} signal days in range
              </p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Body 30d
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatNumber(summary.usersWithRecentBodyMeasurement30d)}
              </p>
              <p className="text-xs text-muted-foreground">
                {bodySignalDays} signal days in range
              </p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Peak Mixed Day
              </p>
              <p className="mt-1 text-sm font-semibold">
                {peakSignalDay ? formatChartDate(peakSignalDay.date) : "No data"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(peakSignalTotal)} combined user signals
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {series.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No client-health trend data available in the selected window.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                labelFormatter={(value) =>
                  typeof value === "string" ? formatChartDate(value) : String(value)
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="workoutActiveUsers"
                name="Workout Users"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="nutritionLoggingUsers"
                name="Nutrition Users"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="bodyMeasurementUsers"
                name="Body Measurement Users"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        <p className="text-xs text-muted-foreground">
          Daily lines reflect distinct users with each signal, not body-composition deltas
          or nutrition-goal adherence scores.
        </p>
      </CardContent>
    </Card>
  );
}
