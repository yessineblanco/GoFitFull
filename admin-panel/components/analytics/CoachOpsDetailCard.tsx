import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BICoachOpsSummaryRow } from "@/lib/bi-coach-ops";

interface CoachOpsDetailCardProps {
  rows: BICoachOpsSummaryRow[];
  windowLabel: string;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)}h`;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Number(value.toFixed(1))}%`;
}

function getStatusBadgeClassName(status: string) {
  if (status === "approved") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  return "border-border/60 bg-background/70 text-muted-foreground";
}

export default function CoachOpsDetailCard({
  rows,
  windowLabel,
}: CoachOpsDetailCardProps) {
  const approvedRows = rows.filter((row) => row.coachStatus === "approved");
  const displayRows = (approvedRows.length > 0 ? approvedRows : rows).slice(0, 6);
  const coachesWithBookings = displayRows.filter((row) => row.totalBookings > 0).length;
  const approvedCount = approvedRows.length;
  const completedBookings = displayRows.reduce(
    (sum, row) => sum + row.completedBookings,
    0
  );
  const missingScheduleCount = approvedRows.filter(
    (row) => row.availableMinutesPattern === 0
  ).length;

  return (
    <Card className="relative overflow-hidden border-white/40 bg-gradient-to-br from-background/95 via-background to-muted/35">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-700 dark:text-amber-300"
              >
                Coach Ops Detail
              </Badge>
              <Badge variant="outline" className="bg-background/60">
                Top coaches
              </Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-4 w-4" />
                Coach Operations
              </CardTitle>
              <CardDescription>
                Booking outcomes, coach quality signals, and approximate utilization
                inputs from the canonical coach-ops layer.
              </CardDescription>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Approved
              </p>
              <p className="mt-1 text-sm font-semibold">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Current approved coaches</p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Booked
              </p>
              <p className="mt-1 text-sm font-semibold">{coachesWithBookings}</p>
              <p className="text-xs text-muted-foreground">
                Coaches with {windowLabel.toLowerCase()} bookings
              </p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Completed
              </p>
              <p className="mt-1 text-sm font-semibold">{formatNumber(completedBookings)}</p>
              <p className="text-xs text-muted-foreground">Completed bookings shown</p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Missing Schedule
              </p>
              <p className="mt-1 text-sm font-semibold">{missingScheduleCount}</p>
              <p className="text-xs text-muted-foreground">Approved coaches with no pattern</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {displayRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No coach ops summary rows available in the selected window.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border/70">
                  <th className="py-3 pr-3 text-left font-medium">Coach</th>
                  <th className="px-3 py-3 text-left font-medium">Bookings</th>
                  <th className="px-3 py-3 text-left font-medium">Booking Quality</th>
                  <th className="px-3 py-3 text-left font-medium">Capacity</th>
                  <th className="px-3 py-3 text-left font-medium">Relationships</th>
                  <th className="py-3 pl-3 text-left font-medium">Reviews</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => (
                  <tr
                    key={row.coachId}
                    className="border-b border-border/40 transition-colors hover:bg-muted/20"
                  >
                    <td className="py-3 pr-3 align-top">
                      <div className="space-y-2">
                        <div className="font-medium">{row.coachName}</div>
                        <Badge
                          variant="outline"
                          className={getStatusBadgeClassName(row.coachStatus)}
                        >
                          {row.coachStatus}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="font-medium">
                        {formatNumber(row.completedBookings)} completed /{" "}
                        {formatNumber(row.totalBookings)} total
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatHours(row.completedBookingMinutes)} completed hours in range
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="font-medium">
                        {formatPercent(row.completionRate)} completion
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatPercent(row.cancellationRate)} cancelled -{" "}
                        {formatPercent(row.noShowRate)} no-show
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      {row.availableMinutesPattern > 0 ? (
                        <>
                          <div className="font-medium">
                            {formatHours(row.nonCancelledBookingMinutes)} /{" "}
                            {formatHours(row.availableMinutesPattern)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Utilization {formatPercent(row.approximateUtilizationRate)}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="font-medium">No recurring availability</div>
                          <p className="text-xs text-muted-foreground">
                            Utilization input unavailable
                          </p>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="font-medium">
                        {formatNumber(row.currentRelationshipClients)} current client
                        {row.currentRelationshipClients === 1 ? "" : "s"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(row.currentActivePackClients)} active packs -{" "}
                        {formatNumber(row.currentCompletedBookingClients)} completed-booking
                        {" "}clients
                      </p>
                    </td>
                    <td className="py-3 pl-3 align-top">
                      {row.totalReviewsCurrent > 0 ? (
                        <>
                          <div className="font-medium">
                            {row.averageRatingCurrent.toFixed(1)} rating
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(row.totalReviewsCurrent)} reviews -{" "}
                            {formatNumber(row.totalSessionsLifetime)} lifetime sessions
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="font-medium">No ratings yet</div>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(row.totalSessionsLifetime)} lifetime sessions
                          </p>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Utilization is approximate: non-cancelled booking minutes divided by the
          recurring availability pattern minutes from coach availability.
        </p>
      </CardContent>
    </Card>
  );
}
