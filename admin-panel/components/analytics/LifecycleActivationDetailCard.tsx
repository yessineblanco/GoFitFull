import { format, parseISO } from "date-fns";
import { ActivitySquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BIUserLifecycleOverview,
  BIUserLifecycleSnapshotRow,
} from "@/lib/bi-user-lifecycle";
import { cn } from "@/lib/utils";

interface LifecycleActivationDetailCardProps {
  snapshots: BIUserLifecycleSnapshotRow[];
  summary: BIUserLifecycleOverview["summary"];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatSignupDate(value: string) {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

function formatRelativeDays(days: number | null) {
  if (days === null) {
    return "No workout yet";
  }

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "1 day ago";
  }

  return `${days} days ago`;
}

function getActivationBadgeClassName(snapshot: BIUserLifecycleSnapshotRow) {
  if (snapshot.activationType === "workout") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (snapshot.activationType === "booking") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }

  return "border-border/60 bg-background/70 text-muted-foreground";
}

function getWorkoutBucketLabel(snapshot: BIUserLifecycleSnapshotRow) {
  if (snapshot.isWorkoutActive7d) {
    return "Active 7d";
  }

  if (snapshot.isWorkoutInactive8to14d) {
    return "Inactive 8-14d";
  }

  if (snapshot.isWorkoutInactive15to30d) {
    return "Inactive 15-30d";
  }

  return "31+d / never";
}

function getWorkoutBucketClassName(snapshot: BIUserLifecycleSnapshotRow) {
  if (snapshot.isWorkoutActive7d) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (snapshot.isWorkoutInactive8to14d) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (snapshot.isWorkoutInactive15to30d) {
    return "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300";
  }

  return "border-destructive/30 bg-destructive/10 text-destructive";
}

function formatLastActivity(snapshot: BIUserLifecycleSnapshotRow) {
  if (snapshot.daysSinceLastAnyActivity === null) {
    return "Signup only";
  }

  return formatRelativeDays(snapshot.daysSinceLastAnyActivity);
}

export default function LifecycleActivationDetailCard({
  snapshots,
  summary,
}: LifecycleActivationDetailCardProps) {
  const displayRows = snapshots.slice(0, 8);
  const nonClientCount = snapshots.filter(
    (snapshot) => snapshot.userType !== "client" || snapshot.isAdmin
  ).length;

  return (
    <Card className="relative overflow-hidden border-white/40 bg-gradient-to-br from-background/95 via-background to-muted/35">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-sky-500/10 text-sky-700 dark:text-sky-300"
              >
                Lifecycle Detail
              </Badge>
              <Badge variant="outline" className="bg-background/60">
                Activation + inactivity
              </Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ActivitySquare className="h-4 w-4" />
                Activation And Inactivity Buckets
              </CardTitle>
              <CardDescription>
                Current user segments from the canonical lifecycle layer, using first
                activation type plus the latest workout activity date.
              </CardDescription>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Workout Activated
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatNumber(summary.workoutActivatedUsers)}
              </p>
              <p className="text-xs text-muted-foreground">Activated by completed workout</p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Booking Only
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatNumber(summary.bookingOnlyActivatedUsers)}
              </p>
              <p className="text-xs text-muted-foreground">No completed workout yet</p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Active 7d
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatNumber(summary.workoutActive7d)}
              </p>
              <p className="text-xs text-muted-foreground">Recent workout activity</p>
            </div>

            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                31+d / Never
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatNumber(summary.workoutInactive31PlusOrNever)}
              </p>
              <p className="text-xs text-muted-foreground">Longest-lapsed bucket</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <div className="grid gap-2 md:grid-cols-4">
          <div className="rounded-lg border bg-background/70 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Active 7d
            </p>
            <p className="mt-1 text-lg font-semibold">{summary.workoutActive7d}</p>
            <p className="text-xs text-muted-foreground">Current workout users</p>
          </div>
          <div className="rounded-lg border bg-background/70 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Inactive 8-14d
            </p>
            <p className="mt-1 text-lg font-semibold">{summary.workoutInactive8to14d}</p>
            <p className="text-xs text-muted-foreground">Cooling-off users</p>
          </div>
          <div className="rounded-lg border bg-background/70 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Inactive 15-30d
            </p>
            <p className="mt-1 text-lg font-semibold">{summary.workoutInactive15to30d}</p>
            <p className="text-xs text-muted-foreground">At-risk before lapse</p>
          </div>
          <div className="rounded-lg border bg-background/70 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Unactivated
            </p>
            <p className="mt-1 text-lg font-semibold">{summary.unactivatedUsers}</p>
            <p className="text-xs text-muted-foreground">No workout or booking activation</p>
          </div>
        </div>

        {displayRows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No lifecycle snapshots available yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-border/70">
                  <th className="py-3 pr-3 text-left font-medium">User</th>
                  <th className="px-3 py-3 text-left font-medium">Activation</th>
                  <th className="px-3 py-3 text-left font-medium">Workout Status</th>
                  <th className="px-3 py-3 text-left font-medium">Latest Lifecycle</th>
                  <th className="py-3 pl-3 text-left font-medium">Signup</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((snapshot) => (
                  <tr
                    key={snapshot.userId}
                    className="border-b border-border/40 transition-colors hover:bg-muted/20"
                  >
                    <td className="py-3 pr-3 align-top">
                      <div className="font-medium">{snapshot.userName}</div>
                      <p className="text-xs text-muted-foreground">
                        {snapshot.isAdmin ? "admin" : snapshot.userType}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-2">
                        <Badge
                          variant="outline"
                          className={cn("w-fit", getActivationBadgeClassName(snapshot))}
                        >
                          {snapshot.activationType === "workout"
                            ? "Workout activated"
                            : snapshot.activationType === "booking"
                              ? "Booking-only"
                              : "Unactivated"}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {snapshot.firstCompletedWorkoutDate
                            ? `First workout ${formatSignupDate(snapshot.firstCompletedWorkoutDate)}`
                            : snapshot.firstCompletedBookingDate
                              ? `First booking ${formatSignupDate(snapshot.firstCompletedBookingDate)}`
                              : "No activation event yet"}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-2">
                        <Badge
                          variant="outline"
                          className={cn("w-fit", getWorkoutBucketClassName(snapshot))}
                        >
                          {getWorkoutBucketLabel(snapshot)}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeDays(snapshot.daysSinceLastWorkout)}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="font-medium">{formatLastActivity(snapshot)}</div>
                      <p className="text-xs text-muted-foreground">
                        Latest event {formatSignupDate(snapshot.latestLifecycleEventDate)}
                      </p>
                    </td>
                    <td className="py-3 pl-3 align-top">
                      <div className="font-medium">{formatSignupDate(snapshot.signupDate)}</div>
                      <p className="text-xs text-muted-foreground">
                        {snapshot.daysSinceSignup} day
                        {snapshot.daysSinceSignup === 1 ? "" : "s"} since signup
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Current buckets use latest workout activity dates from the lifecycle view.{" "}
          {nonClientCount > 0
            ? `${formatNumber(nonClientCount)} non-client account${nonClientCount === 1 ? "" : "s"} are included because lifecycle BI currently spans all user profiles.`
            : "Current snapshots are all client accounts."}
        </p>
      </CardContent>
    </Card>
  );
}
