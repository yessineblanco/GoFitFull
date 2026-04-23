import {
  getCoachPerformanceData,
  getUserGrowthData,
  getPopularExercises,
  getWorkoutCompletionRates,
  getEngagementMetrics,
  getActivityHeatmap,
  getRecentActivity,
  getSessionActivityData,
} from "@/lib/analytics";
import { getBIClientHealthOverview } from "@/lib/bi-client-health";
import { getBICoachOpsOverview } from "@/lib/bi-coach-ops";
import { getBIFinanceOverview } from "@/lib/bi-finance";
import {
  getBIUserLifecycleOverview,
  getBIUserWorkoutCohortRetention,
} from "@/lib/bi-user-lifecycle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, startOfDay, subDays } from "date-fns";
import Link from "next/link";
import type { ReactNode } from "react";

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import CoachPerformanceTable from "@/components/analytics/CoachPerformanceTable";
import AdvancedBISavedViews from "@/components/analytics/AdvancedBISavedViews";
import AdvancedBISnapshotButton from "@/components/analytics/AdvancedBISnapshotButton";
import BIThresholdAlertsCard from "@/components/analytics/BIThresholdAlertsCard";
import ClientHealthTrendDetailCard from "@/components/analytics/ClientHealthTrendDetailCard";
import CoachOpsDetailCard from "@/components/analytics/CoachOpsDetailCard";
import ClientHealthRiskQueue from "@/components/analytics/ClientHealthRiskQueue";
import FinanceCurrencyDetailCard from "@/components/analytics/FinanceCurrencyDetailCard";
import LifecycleActivationDetailCard from "@/components/analytics/LifecycleActivationDetailCard";
import RetentionCohortCard from "@/components/analytics/RetentionCohortCard";
import SessionActivityChart from "@/components/analytics/SessionActivityChart";
import UserGrowthChart from "@/components/analytics/UserGrowthChart";
import PopularExercisesCard from "@/components/analytics/PopularExercisesCard";
import WorkoutCompletionCard from "@/components/analytics/WorkoutCompletionCard";
import EngagementMetricsCards from "@/components/analytics/EngagementMetricsCards";
import ActivityHeatmap from "@/components/analytics/ActivityHeatmap";
import RecentActivityFeed from "@/components/analytics/RecentActivityFeed";
import { SystemHealth } from "@/components/health/SystemHealth";
import {
  buildAdvancedBISavedViewsSettingKey,
  isMissingAdminSettingsTableError,
  parseAdvancedBISavedViewsValue,
  type AdvancedBISavedView,
} from "@/lib/bi-saved-views";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  Calendar,
  ChevronDown,
  CheckCircle2,
  Download,
  DollarSign,
  Dumbbell,
  HeartPulse,
  UserCheck,
} from "lucide-react";

const ADVANCED_BI_RANGE_OPTIONS = [
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
] as const;

const ADVANCED_BI_EXPORT_OPTIONS = [
  { key: "finance", label: "Finance CSV" },
  { key: "lifecycle", label: "Lifecycle CSV" },
  { key: "cohorts", label: "Cohorts CSV" },
  { key: "coach-ops", label: "Coach Ops CSV" },
  { key: "client-health", label: "Client Health CSV" },
] as const;

type AdvancedBIRangeKey = (typeof ADVANCED_BI_RANGE_OPTIONS)[number]["key"];
type AdvancedBIExportKey = (typeof ADVANCED_BI_EXPORT_OPTIONS)[number]["key"];
type DashboardSearchParamValue = string | string[] | undefined;
type DashboardSearchParams = Record<string, DashboardSearchParamValue>;

interface DashboardPageProps {
  searchParams?: Promise<DashboardSearchParams> | DashboardSearchParams;
}

interface DashboardSectionProps {
  badge: string;
  children: ReactNode;
  defaultOpen?: boolean;
  description: string;
  meta: string;
  title: string;
}

interface AdvancedBICoachFilterOption {
  id: string;
  name: string;
  status: string;
}

interface AdvancedBIPackFilterOption {
  coachId: string;
  currency: string;
  id: string;
  name: string;
}

function resolveAdvancedBIRange(
  rangeParam: DashboardSearchParamValue
): (typeof ADVANCED_BI_RANGE_OPTIONS)[number] {
  const resolvedValue = Array.isArray(rangeParam) ? rangeParam[0] : rangeParam;

  return (
    ADVANCED_BI_RANGE_OPTIONS.find((option) => option.key === resolvedValue) ||
    ADVANCED_BI_RANGE_OPTIONS[1]
  );
}

function buildDashboardHref(
  searchParams: DashboardSearchParams,
  rangeKey: AdvancedBIRangeKey
) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (key === "range" || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }

    params.set(key, value);
  });

  params.set("range", rangeKey);

  return `/dashboard?${params.toString()}`;
}

function buildAdvancedBIExportHref(
  slice: AdvancedBIExportKey,
  rangeKey: AdvancedBIRangeKey,
  filters: {
    coachId?: string | null;
    packId?: string | null;
  }
) {
  const params = new URLSearchParams({
    slice,
    range: rangeKey,
  });

  if ((slice === "finance" || slice === "coach-ops") && filters.coachId) {
    params.set("coach", filters.coachId);
  }

  if (slice === "finance" && filters.packId) {
    params.set("pack", filters.packId);
  }

  return `/api/bi/export?${params.toString()}`;
}

function formatWindowDateRange(startDate: Date, endDate: Date) {
  return `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`;
}

function getAuthDisplayName(
  authUser:
    | {
        email?: string | null;
        user_metadata?: {
          display_name?: string | null;
          full_name?: string | null;
        } | null;
      }
    | undefined,
  fallback: string
) {
  return (
    authUser?.user_metadata?.display_name ||
    authUser?.user_metadata?.full_name ||
    authUser?.email?.split("@")[0] ||
    fallback
  );
}

function DashboardSection({
  badge,
  children,
  defaultOpen = false,
  description,
  meta,
  title,
}: DashboardSectionProps) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-xl border border-white/40 bg-gradient-to-br from-background/95 via-background to-muted/30"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {badge}
            </Badge>
            <Badge variant="outline" className="bg-background/60">
              {meta}
            </Badge>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-white/30 p-4 pt-4">{children}</div>
    </details>
  );
}

function getComparisonToneClassName(delta: number, positiveIsGood = true) {
  if (delta === 0) {
    return "text-muted-foreground";
  }

  const isGoodChange = positiveIsGood ? delta > 0 : delta < 0;

  return isGoodChange
    ? "text-emerald-700 dark:text-emerald-300"
    : "text-rose-700 dark:text-rose-300";
}

function formatComparisonDelta(
  delta: number,
  singular: string,
  plural: string,
  comparisonLabel: string
) {
  if (delta === 0) {
    return `Flat vs ${comparisonLabel}`;
  }

  const absoluteDelta = Math.abs(delta);
  const unitLabel = absoluteDelta === 1 ? singular : plural;
  const prefix = delta > 0 ? "+" : "-";

  return `${prefix}${formatNumber(absoluteDelta)} ${unitLabel} vs ${comparisonLabel}`;
}

async function getAdvancedBIFilterOptions() {
  const adminClient = createAdminClient();
  const [coachProfilesResult, authUsersResult] = await Promise.all([
    adminClient
      .from("coach_profiles")
      .select("id, user_id, status")
      .eq("status", "approved")
      .order("created_at", { ascending: true }),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (coachProfilesResult.error) {
    throw new Error(
      `Failed to fetch coach filter options: ${coachProfilesResult.error.message}`
    );
  }

  const approvedCoaches = coachProfilesResult.data || [];
  const approvedCoachIds = approvedCoaches.map((coach) => coach.id);
  const authMap = new Map(
    (authUsersResult.data?.users || []).map((user) => [user.id, user])
  );
  const coaches: AdvancedBICoachFilterOption[] = approvedCoaches.map((coach) => ({
    id: coach.id,
    name: getAuthDisplayName(authMap.get(coach.user_id), "Coach"),
    status: coach.status,
  }));

  let packs: AdvancedBIPackFilterOption[] = [];

  if (approvedCoachIds.length > 0) {
    const sessionPacksResult = await adminClient
      .from("session_packs")
      .select("id, coach_id, name, currency")
      .eq("is_active", true)
      .in("coach_id", approvedCoachIds)
      .order("created_at", { ascending: true });

    if (sessionPacksResult.error) {
      throw new Error(
        `Failed to fetch package filter options: ${sessionPacksResult.error.message}`
      );
    }

    const coachNameById = new Map(coaches.map((coach) => [coach.id, coach.name]));
    packs = (sessionPacksResult.data || []).map((pack) => ({
      id: pack.id,
      coachId: pack.coach_id,
      name: `${pack.name} · ${coachNameById.get(pack.coach_id) || "Coach"}`,
      currency: pack.currency,
    }));
  }

  return { coaches, packs };
}

async function getAdvancedBISavedViews(): Promise<AdvancedBISavedView[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return [];
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("admin_settings")
    .select("value")
    .eq("key", buildAdvancedBISavedViewsSettingKey(user.id))
    .single();

  if (error && error.code !== "PGRST116") {
    if (isMissingAdminSettingsTableError(error)) {
      return [];
    }

    throw new Error(`Failed to fetch BI saved views: ${error.message}`);
  }

  return parseAdvancedBISavedViewsValue(data?.value);
}

async function getAnalyticsData() {
  try {
    const [
      userGrowth,
      popularExercises,
      workoutCompletion,
      engagement,
      heatmap,
      recentActivity,
      sessionActivity,
      coachPerformance,
    ] = await Promise.all([
      getUserGrowthData(30, "daily"),
      getPopularExercises(10),
      getWorkoutCompletionRates(10),
      getEngagementMetrics(),
      getActivityHeatmap(),
      getRecentActivity(10),
      getSessionActivityData(30),
      getCoachPerformanceData(30, 5),
    ]);

    return {
      userGrowth,
      popularExercises,
      workoutCompletion,
      engagement,
      heatmap,
      recentActivity,
      sessionActivity,
      coachPerformance,
    };
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return {
      userGrowth: [],
      popularExercises: [],
      workoutCompletion: [],
      engagement: { dau: 0, wau: 0, mau: 0, totalUsers: 0 },
      heatmap: [],
      recentActivity: [],
      sessionActivity: {
        points: [],
        summary: {
          totalWorkoutSessions: 0,
          completedWorkouts: 0,
          workoutCompletionRate: 0,
          completedBookings: 0,
          activeUsers: 0,
          activeCoaches: 0,
        },
      },
      coachPerformance: {
        rows: [],
        summary: {
          approvedCoaches: 0,
          activeCoaches: 0,
          totalCompletedBookings: 0,
        },
      },
    };
  }
}

async function getAdvancedBIData(
  rangeKey: AdvancedBIRangeKey,
  filters: {
    coachId?: string;
    packId?: string;
  } = {}
) {
  const rangeOption =
    ADVANCED_BI_RANGE_OPTIONS.find((option) => option.key === rangeKey) ||
    ADVANCED_BI_RANGE_OPTIONS[1];
  const endDate = startOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, rangeOption.days - 1));
  const previousEndDate = startOfDay(subDays(startDate, 1));
  const previousStartDate = startOfDay(subDays(previousEndDate, rangeOption.days - 1));

  try {
    const [
      finance,
      previousFinance,
      lifecycle,
      previousLifecycle,
      cohortRetention,
      coachOps,
      previousCoachOps,
      clientHealth,
      previousClientHealth,
    ] = await Promise.all([
      getBIFinanceOverview({
        startDate,
        endDate,
        coachId: filters.coachId,
        packId: filters.packId,
      }),
      getBIFinanceOverview({
        startDate: previousStartDate,
        endDate: previousEndDate,
        coachId: filters.coachId,
        packId: filters.packId,
      }),
      getBIUserLifecycleOverview({ startDate, endDate }),
      getBIUserLifecycleOverview({
        startDate: previousStartDate,
        endDate: previousEndDate,
      }),
      getBIUserWorkoutCohortRetention({
        endDate,
        cohortCount: rangeOption.days >= 90 ? 6 : 4,
        maxPeriod: 4,
      }),
      getBICoachOpsOverview({ startDate, endDate, coachId: filters.coachId }),
      getBICoachOpsOverview({
        startDate: previousStartDate,
        endDate: previousEndDate,
        coachId: filters.coachId,
      }),
      getBIClientHealthOverview({ startDate, endDate }),
      getBIClientHealthOverview({
        startDate: previousStartDate,
        endDate: previousEndDate,
      }),
    ]);

    return {
      finance,
      lifecycle,
      cohortRetention,
      coachOps,
      clientHealth,
      previous: {
        finance: previousFinance,
        lifecycle: previousLifecycle,
        coachOps: previousCoachOps,
        clientHealth: previousClientHealth,
      },
      window: {
        key: rangeOption.key,
        label: rangeOption.label,
        days: rangeOption.days,
        currentRangeLabel: formatWindowDateRange(startDate, endDate),
        previousRangeLabel: formatWindowDateRange(previousStartDate, previousEndDate),
        comparisonLabel: `previous ${rangeOption.label.toLowerCase()}`,
        anchorDateLabel: format(endDate, "MMMM d, yyyy"),
      },
    };
  } catch (error) {
    console.error("Error fetching advanced BI data:", error);
    return {
      finance: {
        dailyRows: [],
        summaryByCurrency: [],
        currentLiability: [],
      },
      lifecycle: {
        dailySeries: [],
        snapshots: [],
        summary: {
          signupsInRange: 0,
          firstWorkoutActivationsInRange: 0,
          firstBookingActivationsInRange: 0,
          workoutActiveUsersInRange: 0,
          bookingActiveUsersInRange: 0,
          anyActiveUsersInRange: 0,
          packPurchasersInRange: 0,
          dau: 0,
          wau: 0,
          mau: 0,
          workoutActivatedUsers: 0,
          bookingOnlyActivatedUsers: 0,
          unactivatedUsers: 0,
          workoutActive7d: 0,
          workoutInactive8to14d: 0,
          workoutInactive15to30d: 0,
          workoutInactive31PlusOrNever: 0,
        },
      },
      cohortRetention: [],
      coachOps: {
        dailyRows: [],
        snapshots: [],
        summaryByCoach: [],
        totals: {
          approvedCoaches: 0,
          coachesWithBookingActivity: 0,
          totalCompletedBookings: 0,
          totalCancelledBookings: 0,
          totalNoShows: 0,
        },
      },
      clientHealth: {
        dailyRows: [],
        dailySeries: [],
        snapshots: [],
        summary: {
          usersWithWorkoutLast7d: 0,
          usersInactive14d: 0,
          usersWithNutritionLast7d: 0,
          usersWithRecentBodyMeasurement30d: 0,
          usersWithExpiringPack7d: 0,
          usersWithThreePlusRiskSignals: 0,
        },
      },
      previous: {
        finance: {
          dailyRows: [],
          summaryByCurrency: [],
          currentLiability: [],
        },
        lifecycle: {
          dailySeries: [],
          snapshots: [],
          summary: {
            signupsInRange: 0,
            firstWorkoutActivationsInRange: 0,
            firstBookingActivationsInRange: 0,
            workoutActiveUsersInRange: 0,
            bookingActiveUsersInRange: 0,
            anyActiveUsersInRange: 0,
            packPurchasersInRange: 0,
            dau: 0,
            wau: 0,
            mau: 0,
            workoutActivatedUsers: 0,
            bookingOnlyActivatedUsers: 0,
            unactivatedUsers: 0,
            workoutActive7d: 0,
            workoutInactive8to14d: 0,
            workoutInactive15to30d: 0,
            workoutInactive31PlusOrNever: 0,
          },
        },
        coachOps: {
          dailyRows: [],
          snapshots: [],
          summaryByCoach: [],
          totals: {
            approvedCoaches: 0,
            coachesWithBookingActivity: 0,
            totalCompletedBookings: 0,
            totalCancelledBookings: 0,
            totalNoShows: 0,
          },
        },
        clientHealth: {
          dailyRows: [],
          dailySeries: [],
          snapshots: [],
          summary: {
            usersWithWorkoutLast7d: 0,
            usersInactive14d: 0,
            usersWithNutritionLast7d: 0,
            usersWithRecentBodyMeasurement30d: 0,
            usersWithExpiringPack7d: 0,
            usersWithThreePlusRiskSignals: 0,
          },
        },
      },
      window: {
        key: rangeOption.key,
        label: rangeOption.label,
        days: rangeOption.days,
        currentRangeLabel: formatWindowDateRange(startDate, endDate),
        previousRangeLabel: formatWindowDateRange(previousStartDate, previousEndDate),
        comparisonLabel: `previous ${rangeOption.label.toLowerCase()}`,
        anchorDateLabel: format(endDate, "MMMM d, yyyy"),
      },
    };
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Number(value.toFixed(1))}%`;
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

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) || {};
  const selectedAdvancedBIRange = resolveAdvancedBIRange(resolvedSearchParams.range);
  const [filterOptions, initialSavedViews] = await Promise.all([
    getAdvancedBIFilterOptions(),
    getAdvancedBISavedViews(),
  ]);
  const selectedCoachParam = Array.isArray(resolvedSearchParams.coach)
    ? resolvedSearchParams.coach[0]
    : resolvedSearchParams.coach;
  const selectedCoach =
    filterOptions.coaches.find((coach) => coach.id === selectedCoachParam) || null;
  const availablePackOptions = selectedCoach
    ? filterOptions.packs.filter((pack) => pack.coachId === selectedCoach.id)
    : filterOptions.packs;
  const selectedPackParam = Array.isArray(resolvedSearchParams.pack)
    ? resolvedSearchParams.pack[0]
    : resolvedSearchParams.pack;
  const selectedPack =
    availablePackOptions.find((pack) => pack.id === selectedPackParam) || null;
  const advancedBIExportLinks = ADVANCED_BI_EXPORT_OPTIONS.map((option) => ({
    ...option,
    href: buildAdvancedBIExportHref(option.key, selectedAdvancedBIRange.key, {
      coachId: selectedCoach?.id || null,
      packId: selectedPack?.id || null,
    }),
  }));
  const [data, advancedData] = await Promise.all([
    getAnalyticsData(),
    getAdvancedBIData(selectedAdvancedBIRange.key, {
      coachId: selectedCoach?.id,
      packId: selectedPack?.id,
    }),
  ]);
  const financeSummaryByCurrency = [...advancedData.finance.summaryByCurrency].sort(
    (a, b) => b.grossPackSales - a.grossPackSales
  );
  const previousFinanceSummaryByCurrency = [
    ...advancedData.previous.finance.summaryByCurrency,
  ].sort((a, b) => b.grossPackSales - a.grossPackSales);
  const financePackSalesCount = financeSummaryByCurrency.reduce(
    (sum, row) => sum + row.packSalesCount,
    0
  );
  const previousFinancePackSalesCount = previousFinanceSummaryByCurrency.reduce(
    (sum, row) => sum + row.packSalesCount,
    0
  );
  const financePackSalesDelta = financePackSalesCount - previousFinancePackSalesCount;
  const coachOpsTotalBookings = advancedData.coachOps.summaryByCoach.reduce(
    (sum, coach) => sum + coach.totalBookings,
    0
  );
  const coachOpsCompletionRate =
    coachOpsTotalBookings > 0
      ? (advancedData.coachOps.totals.totalCompletedBookings / coachOpsTotalBookings) * 100
      : 0;
  const coachOpsNoShowRate =
    coachOpsTotalBookings > 0
      ? (advancedData.coachOps.totals.totalNoShows / coachOpsTotalBookings) * 100
      : 0;
  const lifecycleActiveDelta =
    advancedData.lifecycle.summary.anyActiveUsersInRange -
    advancedData.previous.lifecycle.summary.anyActiveUsersInRange;
  const coachOpsActiveDelta =
    advancedData.coachOps.totals.coachesWithBookingActivity -
    advancedData.previous.coachOps.totals.coachesWithBookingActivity;
  const clientRiskDelta =
    advancedData.clientHealth.summary.usersWithThreePlusRiskSignals -
    advancedData.previous.clientHealth.summary.usersWithThreePlusRiskSignals;
  const nutritionSignalsLikelyNoisy =
    advancedData.clientHealth.summary.usersWithNutritionLast7d === 0;
  const advancedBIFilterResetHref = buildDashboardHref(
    {
      ...resolvedSearchParams,
      coach: undefined,
      pack: undefined,
    },
    advancedData.window.key
  );
  const coachFilterAffectsCards = selectedCoach !== null;
  const financeCardIsPackScoped = selectedPack !== null;

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 pt-6 page-transition">
      <div className="flex items-center justify-between space-y-2 fade-in">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            BI v1 stays inside the main dashboard and focuses on trustworthy growth,
            session activity, and coach performance.
          </p>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <EngagementMetricsCards metrics={data.engagement} />
      </div>

      {/* Advanced BI Overview */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-xl border border-white/40 bg-gradient-to-r from-background/95 via-background/90 to-muted/35 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                Advanced BI
              </Badge>
              <Badge variant="outline" className="bg-background/60">
                Semantic Layer Live
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold tracking-tight">Advanced BI Overview</h3>
              <p className="text-sm text-muted-foreground">
                Canonical finance, lifecycle, coach ops, and client health metrics for{" "}
                {advancedData.window.currentRangeLabel} inside the existing admin dashboard.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {ADVANCED_BI_RANGE_OPTIONS.map((option) => {
                const isActive = option.key === advancedData.window.key;

                return (
                  <Button
                    key={option.key}
                    asChild
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    className={cn(
                      "h-8 rounded-full px-3 text-xs tracking-[0.18em]",
                      isActive && "shadow-sm"
                    )}
                  >
                    <Link
                      href={buildDashboardHref(resolvedSearchParams, option.key)}
                      scroll={false}
                    >
                      {option.label}
                    </Link>
                  </Button>
                );
              })}
            </div>
            <form method="get" className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
              <input type="hidden" name="range" value={advancedData.window.key} />
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Coach Filter
                </span>
                <select
                  name="coach"
                  defaultValue={selectedCoach?.id || ""}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                >
                  <option value="">All coaches</option>
                  {filterOptions.coaches.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {coach.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Package Filter
                </span>
                <select
                  name="pack"
                  defaultValue={selectedPack?.id || ""}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                >
                  <option value="">All packages</option>
                  {availablePackOptions.map((pack) => (
                    <option key={pack.id} value={pack.id}>
                      {pack.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" className="mt-auto">
                Apply Filters
              </Button>
              <Button asChild type="button" variant="outline" className="mt-auto">
                <Link href={advancedBIFilterResetHref} scroll={false}>
                  Reset
                </Link>
              </Button>
            </form>
            <div className="flex flex-wrap items-center gap-2">
              {selectedCoach ? (
                <Badge variant="outline" className="bg-background/60">
                  Coach: {selectedCoach.name}
                </Badge>
              ) : null}
              {selectedPack ? (
                <Badge variant="outline" className="bg-background/60">
                  Package: {selectedPack.name}
                </Badge>
              ) : null}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/60">
                  CSV Export
                </Badge>
                {advancedBIExportLinks.map((option) => (
                  <Button
                    key={option.key}
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full px-3 text-xs"
                  >
                    <a href={option.href}>
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      {option.label}
                    </a>
                  </Button>
                ))}
                <AdvancedBISnapshotButton
                  currentView={{
                    rangeKey: advancedData.window.key,
                    coachId: selectedCoach?.id || null,
                    coachName: selectedCoach?.name || null,
                    packId: selectedPack?.id || null,
                    packName: selectedPack?.name || null,
                  }}
                />
                <AdvancedBISavedViews
                  coachOptions={filterOptions.coaches.map((coach) => ({
                    id: coach.id,
                    name: coach.name,
                  }))}
                  packOptions={filterOptions.packs.map((pack) => ({
                    id: pack.id,
                    name: pack.name,
                  }))}
                  initialSavedViews={initialSavedViews}
                  currentView={{
                    rangeKey: advancedData.window.key,
                    rangeLabel: advancedData.window.label,
                    coachId: selectedCoach?.id || null,
                    coachName: selectedCoach?.name || null,
                    packId: selectedPack?.id || null,
                    packName: selectedPack?.name || null,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Exports honor the selected date range, plus coach and package filters
                only where the semantic layer already supports that scope.
              </p>
              <p className="text-xs text-muted-foreground">
                BI snapshots currently deliver into the existing admin notification
                center first, using the current range and truthful coach/package scope.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Windowed cards use {advancedData.window.currentRangeLabel}. Snapshot cards stay
              anchored to {advancedData.window.anchorDateLabel}.
            </p>
            <p className="text-xs text-muted-foreground">
              Coach filters currently scope finance and coach-ops only. Package filters
              currently scope finance pack sales only.
            </p>
          </div>
          <div className="space-y-2 rounded-lg border bg-background/65 px-3 py-2 text-right">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Stage 3 / Range + Comparison
            </p>
            <p className="text-sm font-semibold">{advancedData.window.currentRangeLabel}</p>
            <p className="text-xs text-muted-foreground">
              Comparing against {advancedData.window.previousRangeLabel}
            </p>
          </div>
        </div>
        <div className="grid gap-3 grid-cols-1 xl:grid-cols-4">
          <Card className="relative overflow-hidden border-white/40 bg-gradient-to-br from-background/95 via-background to-muted/35">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Badge variant="secondary" className="w-fit bg-primary/10 text-primary">
                    {financeCardIsPackScoped ? "Package Scope" : "Foundation"}
                  </Badge>
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">Finance Foundation</CardTitle>
                    <CardDescription>
                      {financeCardIsPackScoped
                        ? `Gross pack sales for ${selectedPack?.name} by currency`
                        : "Gross pack sales and payout liability by currency"}
                    </CardDescription>
                  </div>
                </div>
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="text-2xl font-bold">{formatNumber(financePackSalesCount)}</div>
                <p className="text-xs text-muted-foreground">
                  Pack sales captured in the selected window
                </p>
                <p
                  className={cn(
                    "text-xs font-medium",
                    getComparisonToneClassName(financePackSalesDelta)
                  )}
                >
                  {formatComparisonDelta(
                    financePackSalesDelta,
                    "order",
                    "orders",
                    advancedData.window.comparisonLabel
                  )}
                </p>
              </div>
              {financeSummaryByCurrency.length > 0 ? (
                financeSummaryByCurrency.map((row) => (
                  <div key={row.currency} className="rounded-lg border bg-background/70 p-3">
                    <div className="flex items-center justify-between gap-3 text-sm font-medium">
                      <span>{row.currency}</span>
                      <span>{formatCurrencyAmount(row.grossPackSales, row.currency)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(row.packSalesCount)} pack sales - AOV{" "}
                      {formatCurrencyAmount(row.averageOrderValue, row.currency, 2)}
                    </p>
                    {!financeCardIsPackScoped ? (
                      <p className="text-xs text-muted-foreground">
                        Current payout liability{" "}
                        {formatCurrencyAmount(row.currentPayoutLiability, row.currency)}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No pack sales or payout liability rows in the selected window.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {financeCardIsPackScoped
                  ? "Package filtering currently scopes gross pack sales, orders, and AOV only."
                  : "Gross pack sales only. Net revenue and refund-aware reconciliation stay deferred until the finance model is unified."}
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-white/40 bg-gradient-to-br from-background/95 via-background to-muted/35">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Badge variant="secondary" className="w-fit bg-sky-500/10 text-sky-600 dark:text-sky-300">
                    {coachFilterAffectsCards ? "Global Scope" : advancedData.window.label}
                  </Badge>
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">Lifecycle</CardTitle>
                    <CardDescription>
                      Signups, activations, and current DAU / WAU / MAU
                    </CardDescription>
                  </div>
                </div>
                <div className="rounded-full bg-sky-500/10 p-2 text-sky-600 dark:text-sky-300">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-2xl font-bold">
                  {formatNumber(advancedData.lifecycle.summary.anyActiveUsersInRange)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Distinct users with any tracked lifecycle activity in the selected window
                </p>
                {coachFilterAffectsCards ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Coach filters do not yet scope lifecycle cohorts or activation counts.
                  </p>
                ) : null}
                <p
                  className={cn(
                    "mt-2 text-xs font-medium",
                    getComparisonToneClassName(lifecycleActiveDelta)
                  )}
                >
                  {formatComparisonDelta(
                    lifecycleActiveDelta,
                    "active user",
                    "active users",
                    advancedData.window.comparisonLabel
                  )}
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Signups</span>
                  <span className="font-medium">
                    {formatNumber(advancedData.lifecycle.summary.signupsInRange)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">First workout activations</span>
                  <span className="font-medium">
                    {formatNumber(
                      advancedData.lifecycle.summary.firstWorkoutActivationsInRange
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">First booking activations</span>
                  <span className="font-medium">
                    {formatNumber(
                      advancedData.lifecycle.summary.firstBookingActivationsInRange
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">DAU / WAU / MAU</span>
                  <span className="font-medium">
                    {formatNumber(advancedData.lifecycle.summary.dau)} /{" "}
                    {formatNumber(advancedData.lifecycle.summary.wau)} /{" "}
                    {formatNumber(advancedData.lifecycle.summary.mau)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-white/40 bg-gradient-to-br from-background/95 via-background to-muted/35">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Badge variant="secondary" className="w-fit bg-amber-500/10 text-amber-600 dark:text-amber-300">
                    {selectedCoach ? "Coach Scoped" : "Operations"}
                  </Badge>
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">Coach Ops</CardTitle>
                    <CardDescription>
                      Activity volume and booking quality signals
                    </CardDescription>
                  </div>
                </div>
                <div className="rounded-full bg-amber-500/10 p-2 text-amber-600 dark:text-amber-300">
                  <UserCheck className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-2xl font-bold">
                  {formatNumber(advancedData.coachOps.totals.coachesWithBookingActivity)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Coaches with booking activity in the selected window
                </p>
                <p
                  className={cn(
                    "mt-2 text-xs font-medium",
                    getComparisonToneClassName(coachOpsActiveDelta)
                  )}
                >
                  {formatComparisonDelta(
                    coachOpsActiveDelta,
                    "coach",
                    "coaches",
                    advancedData.window.comparisonLabel
                  )}
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Approved coaches</span>
                  <span className="font-medium">
                    {formatNumber(advancedData.coachOps.totals.approvedCoaches)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Completed bookings</span>
                  <span className="font-medium">
                    {formatNumber(advancedData.coachOps.totals.totalCompletedBookings)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Completion rate</span>
                  <span className="font-medium">{formatPercent(coachOpsCompletionRate)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">No-show rate</span>
                  <span className="font-medium">{formatPercent(coachOpsNoShowRate)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-white/40 bg-gradient-to-br from-background/95 via-background to-muted/35">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Badge variant="secondary" className="w-fit bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                    {coachFilterAffectsCards ? "Global Scope" : "Current Risk"}
                  </Badge>
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">Client Health</CardTitle>
                    <CardDescription>
                      Risk flags from workout, nutrition, body, and pack signals
                    </CardDescription>
                  </div>
                </div>
                <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-300">
                  <HeartPulse className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-2xl font-bold">
                  {formatNumber(advancedData.clientHealth.summary.usersWithThreePlusRiskSignals)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current clients flagged by 3+ risk inputs
                </p>
                {coachFilterAffectsCards ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Coach filters do not yet scope current client-health snapshots.
                  </p>
                ) : null}
                <p
                  className={cn(
                    "mt-2 text-xs font-medium",
                    getComparisonToneClassName(clientRiskDelta, false)
                  )}
                >
                  {formatComparisonDelta(
                    clientRiskDelta,
                    "high-risk client",
                    "high-risk clients",
                    advancedData.window.comparisonLabel
                  )}
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Workout active last 7d</span>
                  <span className="font-medium">
                    {formatNumber(advancedData.clientHealth.summary.usersWithWorkoutLast7d)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Nutrition logs last 7d</span>
                  <span className="font-medium">
                    {formatNumber(advancedData.clientHealth.summary.usersWithNutritionLast7d)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Recent body measurement 30d
                  </span>
                  <span className="font-medium">
                    {formatNumber(
                      advancedData.clientHealth.summary.usersWithRecentBodyMeasurement30d
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Packs expiring within 7d</span>
                  <span className="font-medium">
                    {formatNumber(advancedData.clientHealth.summary.usersWithExpiringPack7d)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 grid-cols-1">
          <BIThresholdAlertsCard
            clientRows={advancedData.clientHealth.snapshots}
            coachFilterActive={Boolean(selectedCoach)}
            coachRows={advancedData.coachOps.summaryByCoach}
            windowLabel={advancedData.window.label}
          />
        </div>
      </div>

      <DashboardSection
        badge="Advanced BI Drilldowns"
        description="Expand when you want the full lifecycle, client-health, finance, and coach-ops detail panels."
        meta="6 panels"
        title="Deep Dive Panels"
      >
        <div className="grid gap-3 grid-cols-1">
          <RetentionCohortCard cohorts={advancedData.cohortRetention} />
        </div>

        <div className="grid gap-3 grid-cols-1">
          <LifecycleActivationDetailCard
            snapshots={advancedData.lifecycle.snapshots}
            summary={advancedData.lifecycle.summary}
          />
        </div>

        <div className="grid gap-3 grid-cols-1">
          <ClientHealthTrendDetailCard
            series={advancedData.clientHealth.dailySeries}
            summary={advancedData.clientHealth.summary}
            windowLabel={advancedData.window.label}
          />
        </div>

        <div className="grid gap-3 grid-cols-1">
          <ClientHealthRiskQueue
            rows={advancedData.clientHealth.snapshots}
            nutritionSignalsLikelyNoisy={nutritionSignalsLikelyNoisy}
          />
        </div>

        <div className="grid gap-3 grid-cols-1">
          <FinanceCurrencyDetailCard
            rows={financeSummaryByCurrency}
            packScopeName={selectedPack?.name || null}
          />
        </div>

        <div className="grid gap-3 grid-cols-1">
          <CoachOpsDetailCard
            rows={advancedData.coachOps.summaryByCoach}
            windowLabel={advancedData.window.label}
          />
        </div>
      </DashboardSection>

      <DashboardSection
        badge="BI v1"
        description="Core workout and coach metrics that still support the original dashboard view."
        meta="2 blocks"
        title="Core BI Snapshot"
      >
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Workout Sessions (30d)</CardTitle>
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.sessionActivity.summary.totalWorkoutSessions}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.sessionActivity.summary.completedWorkouts} completed workouts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Workout Completion</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(data.sessionActivity.summary.workoutCompletionRate)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Based on all workout sessions in the last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Bookings (30d)</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.coachPerformance.summary.totalCompletedBookings}
              </div>
              <p className="text-xs text-muted-foreground">
                Coach-led sessions marked completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Coaches (30d)</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.coachPerformance.summary.activeCoaches}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.coachPerformance.summary.approvedCoaches} approved coaches total
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 grid-cols-1 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <SessionActivityChart data={data.sessionActivity.points} />
          </div>
          <div className="lg:col-span-2">
            <CoachPerformanceTable coaches={data.coachPerformance.rows} />
          </div>
        </div>
      </DashboardSection>

      <DashboardSection
        badge="Operational Analytics"
        description="Supporting charts and feeds for day-to-day admin monitoring."
        meta="4 blocks"
        title="Supporting Analytics"
      >
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <UserGrowthChart data={data.userGrowth} />
          </div>
          <div className="lg:col-span-1">
            <SystemHealth />
          </div>
        </div>

        <div className="grid gap-3 grid-cols-1">
          <ActivityHeatmap data={data.heatmap} />
        </div>

        <div className="grid gap-3 grid-cols-1 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-3">
            <WorkoutCompletionCard workouts={data.workoutCompletion} />
            <RecentActivityFeed activities={data.recentActivity} />
          </div>
          <div className="lg:col-span-2">
            <PopularExercisesCard exercises={data.popularExercises} />
          </div>
        </div>
      </DashboardSection>
    </div>
  );
}
