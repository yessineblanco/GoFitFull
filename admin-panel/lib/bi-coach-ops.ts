import { createAdminClient } from "./supabase/admin";

interface RawBICoachOpsDailyRow {
  metric_date: string;
  coach_id: string;
  user_id: string;
  coach_status: string;
  average_rating_current: number | string | null;
  total_reviews_current: number | null;
  total_sessions_lifetime: number | null;
  total_bookings: number | null;
  completed_bookings_count: number | null;
  cancelled_bookings_count: number | null;
  no_show_bookings_count: number | null;
  pending_bookings_count: number | null;
  confirmed_bookings_count: number | null;
  scheduled_booking_minutes: number | null;
  non_cancelled_booking_minutes: number | null;
  completed_booking_minutes: number | null;
  cancelled_booking_minutes: number | null;
  no_show_booking_minutes: number | null;
  availability_slots_count: number | null;
  available_minutes_pattern: number | null;
  had_booking_activity: boolean | null;
  had_completed_booking: boolean | null;
  had_cancelled_booking: boolean | null;
  had_no_show_booking: boolean | null;
  had_availability_pattern: boolean | null;
}

export interface BICoachOpsDailyRow {
  metricDate: string;
  coachId: string;
  userId: string;
  coachStatus: string;
  averageRatingCurrent: number;
  totalReviewsCurrent: number;
  totalSessionsLifetime: number;
  totalBookings: number;
  completedBookingsCount: number;
  cancelledBookingsCount: number;
  noShowBookingsCount: number;
  pendingBookingsCount: number;
  confirmedBookingsCount: number;
  scheduledBookingMinutes: number;
  nonCancelledBookingMinutes: number;
  completedBookingMinutes: number;
  cancelledBookingMinutes: number;
  noShowBookingMinutes: number;
  availabilitySlotsCount: number;
  availableMinutesPattern: number;
  hadBookingActivity: boolean;
  hadCompletedBooking: boolean;
  hadCancelledBooking: boolean;
  hadNoShowBooking: boolean;
  hadAvailabilityPattern: boolean;
}

export interface BICoachOpsSnapshotRow {
  coachId: string;
  userId: string;
  coachName: string;
  coachStatus: string;
  averageRatingCurrent: number;
  totalReviewsCurrent: number;
  totalSessionsLifetime: number;
  currentActivePackClients: number;
  currentCompletedBookingClients: number;
  currentRelationshipClients: number;
}

export interface BICoachOpsSummaryRow {
  coachId: string;
  coachName: string;
  coachStatus: string;
  averageRatingCurrent: number;
  totalReviewsCurrent: number;
  totalSessionsLifetime: number;
  currentActivePackClients: number;
  currentCompletedBookingClients: number;
  currentRelationshipClients: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShows: number;
  scheduledBookingMinutes: number;
  nonCancelledBookingMinutes: number;
  completedBookingMinutes: number;
  availableMinutesPattern: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  approximateUtilizationRate: number;
}

export interface BICoachOpsOverview {
  dailyRows: BICoachOpsDailyRow[];
  snapshots: BICoachOpsSnapshotRow[];
  summaryByCoach: BICoachOpsSummaryRow[];
  totals: {
    approvedCoaches: number;
    coachesWithBookingActivity: number;
    totalCompletedBookings: number;
    totalCancelledBookings: number;
    totalNoShows: number;
  };
}

export interface BICoachOpsFilters {
  coachId?: string;
  endDate?: Date | string;
  startDate?: Date | string;
}

function toDateKey(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toBoolean(value: boolean | null | undefined) {
  return value === true;
}

function getAuthDisplayName(
  authUser:
    | {
        email?: string | null;
        user_metadata?: {
          display_name?: string | null;
        } | null;
      }
    | undefined,
  fallback: string
) {
  return (
    authUser?.user_metadata?.display_name ||
    authUser?.email?.split("@")[0] ||
    fallback
  );
}

function mapDailyRow(row: RawBICoachOpsDailyRow): BICoachOpsDailyRow {
  return {
    metricDate: row.metric_date,
    coachId: row.coach_id,
    userId: row.user_id,
    coachStatus: row.coach_status,
    averageRatingCurrent: toNumber(row.average_rating_current),
    totalReviewsCurrent: toNumber(row.total_reviews_current),
    totalSessionsLifetime: toNumber(row.total_sessions_lifetime),
    totalBookings: toNumber(row.total_bookings),
    completedBookingsCount: toNumber(row.completed_bookings_count),
    cancelledBookingsCount: toNumber(row.cancelled_bookings_count),
    noShowBookingsCount: toNumber(row.no_show_bookings_count),
    pendingBookingsCount: toNumber(row.pending_bookings_count),
    confirmedBookingsCount: toNumber(row.confirmed_bookings_count),
    scheduledBookingMinutes: toNumber(row.scheduled_booking_minutes),
    nonCancelledBookingMinutes: toNumber(row.non_cancelled_booking_minutes),
    completedBookingMinutes: toNumber(row.completed_booking_minutes),
    cancelledBookingMinutes: toNumber(row.cancelled_booking_minutes),
    noShowBookingMinutes: toNumber(row.no_show_booking_minutes),
    availabilitySlotsCount: toNumber(row.availability_slots_count),
    availableMinutesPattern: toNumber(row.available_minutes_pattern),
    hadBookingActivity: toBoolean(row.had_booking_activity),
    hadCompletedBooking: toBoolean(row.had_completed_booking),
    hadCancelledBooking: toBoolean(row.had_cancelled_booking),
    hadNoShowBooking: toBoolean(row.had_no_show_booking),
    hadAvailabilityPattern: toBoolean(row.had_availability_pattern),
  };
}

export async function getBICoachOpsDailyRows(
  filters: BICoachOpsFilters = {}
): Promise<BICoachOpsDailyRow[]> {
  const adminClient = createAdminClient();
  let query = adminClient
    .from("bi_coach_ops_daily")
    .select("*")
    .order("metric_date", { ascending: true })
    .order("coach_id", { ascending: true });

  if (filters.startDate) {
    query = query.gte("metric_date", toDateKey(filters.startDate));
  }

  if (filters.endDate) {
    query = query.lte("metric_date", toDateKey(filters.endDate));
  }

  if (filters.coachId) {
    query = query.eq("coach_id", filters.coachId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch BI coach ops rows: ${error.message}`);
  }

  return ((data || []) as RawBICoachOpsDailyRow[]).map(mapDailyRow);
}

export async function getCurrentBICoachOpsSnapshots(
  coachId?: string
): Promise<BICoachOpsSnapshotRow[]> {
  const adminClient = createAdminClient();
  let coachProfilesQuery = adminClient
    .from("coach_profiles")
    .select("id, user_id, status, average_rating, total_reviews, total_sessions");
  let activePacksQuery = adminClient
    .from("purchased_packs")
    .select("coach_id, client_id")
    .eq("status", "active");
  let completedBookingsQuery = adminClient
    .from("bookings")
    .select("coach_id, client_id")
    .eq("status", "completed");

  if (coachId) {
    coachProfilesQuery = coachProfilesQuery.eq("id", coachId);
    activePacksQuery = activePacksQuery.eq("coach_id", coachId);
    completedBookingsQuery = completedBookingsQuery.eq("coach_id", coachId);
  }

  const [coachProfilesResult, activePacksResult, completedBookingsResult, authUsersResult] =
    await Promise.all([
      coachProfilesQuery,
      activePacksQuery,
      completedBookingsQuery,
      adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  if (coachProfilesResult.error) {
    throw new Error(
      `Failed to fetch coach profiles for BI coach ops: ${coachProfilesResult.error.message}`
    );
  }

  if (activePacksResult.error) {
    throw new Error(
      `Failed to fetch active packs for BI coach ops: ${activePacksResult.error.message}`
    );
  }

  if (completedBookingsResult.error) {
    throw new Error(
      `Failed to fetch completed bookings for BI coach ops: ${completedBookingsResult.error.message}`
    );
  }

  const authMap = new Map(
    (authUsersResult.data?.users || []).map((user) => [user.id, user])
  );
  const activePackClientsByCoach = new Map<string, Set<string>>();
  const completedBookingClientsByCoach = new Map<string, Set<string>>();

  (activePacksResult.data || []).forEach((pack) => {
    const clients = activePackClientsByCoach.get(pack.coach_id) || new Set<string>();
    clients.add(pack.client_id);
    activePackClientsByCoach.set(pack.coach_id, clients);
  });

  (completedBookingsResult.data || []).forEach((booking) => {
    const clients =
      completedBookingClientsByCoach.get(booking.coach_id) || new Set<string>();
    clients.add(booking.client_id);
    completedBookingClientsByCoach.set(booking.coach_id, clients);
  });

  return (coachProfilesResult.data || []).map((coach) => {
    const activePackClients = activePackClientsByCoach.get(coach.id) || new Set<string>();
    const completedBookingClients =
      completedBookingClientsByCoach.get(coach.id) || new Set<string>();
    const relationshipClients = new Set<string>([
      ...activePackClients,
      ...completedBookingClients,
    ]);

    return {
      coachId: coach.id,
      userId: coach.user_id,
      coachName: getAuthDisplayName(authMap.get(coach.user_id), "Coach"),
      coachStatus: coach.status,
      averageRatingCurrent: toNumber(coach.average_rating),
      totalReviewsCurrent: toNumber(coach.total_reviews),
      totalSessionsLifetime: toNumber(coach.total_sessions),
      currentActivePackClients: activePackClients.size,
      currentCompletedBookingClients: completedBookingClients.size,
      currentRelationshipClients: relationshipClients.size,
    };
  });
}

export async function getBICoachOpsOverview(
  filters: BICoachOpsFilters = {}
): Promise<BICoachOpsOverview> {
  const [dailyRows, snapshots] = await Promise.all([
    getBICoachOpsDailyRows(filters),
    getCurrentBICoachOpsSnapshots(filters.coachId),
  ]);

  const snapshotMap = new Map(snapshots.map((snapshot) => [snapshot.coachId, snapshot]));
  const summaryMap = new Map<string, BICoachOpsSummaryRow>();

  dailyRows.forEach((row) => {
    const snapshot = snapshotMap.get(row.coachId);

    if (!snapshot) {
      return;
    }

    const existing = summaryMap.get(row.coachId) || {
      coachId: row.coachId,
      coachName: snapshot.coachName,
      coachStatus: snapshot.coachStatus,
      averageRatingCurrent: snapshot.averageRatingCurrent,
      totalReviewsCurrent: snapshot.totalReviewsCurrent,
      totalSessionsLifetime: snapshot.totalSessionsLifetime,
      currentActivePackClients: snapshot.currentActivePackClients,
      currentCompletedBookingClients: snapshot.currentCompletedBookingClients,
      currentRelationshipClients: snapshot.currentRelationshipClients,
      totalBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      noShows: 0,
      scheduledBookingMinutes: 0,
      nonCancelledBookingMinutes: 0,
      completedBookingMinutes: 0,
      availableMinutesPattern: 0,
      completionRate: 0,
      cancellationRate: 0,
      noShowRate: 0,
      approximateUtilizationRate: 0,
    };

    existing.totalBookings += row.totalBookings;
    existing.completedBookings += row.completedBookingsCount;
    existing.cancelledBookings += row.cancelledBookingsCount;
    existing.noShows += row.noShowBookingsCount;
    existing.scheduledBookingMinutes += row.scheduledBookingMinutes;
    existing.nonCancelledBookingMinutes += row.nonCancelledBookingMinutes;
    existing.completedBookingMinutes += row.completedBookingMinutes;
    existing.availableMinutesPattern += row.availableMinutesPattern;

    summaryMap.set(row.coachId, existing);
  });

  const summaryByCoach = Array.from(summaryMap.values())
    .map((summary) => ({
      ...summary,
      completionRate:
        summary.totalBookings > 0
          ? Number(((summary.completedBookings / summary.totalBookings) * 100).toFixed(2))
          : 0,
      cancellationRate:
        summary.totalBookings > 0
          ? Number(((summary.cancelledBookings / summary.totalBookings) * 100).toFixed(2))
          : 0,
      noShowRate:
        summary.totalBookings > 0
          ? Number(((summary.noShows / summary.totalBookings) * 100).toFixed(2))
          : 0,
      approximateUtilizationRate:
        summary.availableMinutesPattern > 0
          ? Number(
              (
                (summary.nonCancelledBookingMinutes / summary.availableMinutesPattern) *
                100
              ).toFixed(2)
            )
          : 0,
    }))
    .sort((a, b) => {
      if (b.completedBookings !== a.completedBookings) {
        return b.completedBookings - a.completedBookings;
      }

      if (b.currentRelationshipClients !== a.currentRelationshipClients) {
        return b.currentRelationshipClients - a.currentRelationshipClients;
      }

      return b.averageRatingCurrent - a.averageRatingCurrent;
    });

  return {
    dailyRows,
    snapshots,
    summaryByCoach,
    totals: {
      approvedCoaches: snapshots.filter((snapshot) => snapshot.coachStatus === "approved")
        .length,
      coachesWithBookingActivity: new Set(
        dailyRows.filter((row) => row.hadBookingActivity).map((row) => row.coachId)
      ).size,
      totalCompletedBookings: summaryByCoach.reduce(
        (sum, row) => sum + row.completedBookings,
        0
      ),
      totalCancelledBookings: summaryByCoach.reduce(
        (sum, row) => sum + row.cancelledBookings,
        0
      ),
      totalNoShows: summaryByCoach.reduce((sum, row) => sum + row.noShows, 0),
    },
  };
}
