import { createAdminClient } from "@/lib/supabase/admin";
import CoachSearchFilter from "@/components/coaches/CoachSearchFilter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CoachRow {
  id: string;
  user_id: string;
  bio: string | null;
  specialties: string[];
  hourly_rate: number | null;
  profile_picture_url: string | null;
  is_verified: boolean;
  average_rating: number;
  total_reviews: number;
  total_sessions: number;
  status: string;
  cv_url: string | null;
  cancellation_policy: string;
  created_at: string;
  email: string;
  display_name: string;
  certifications_count: number;
}

async function getCoaches(): Promise<CoachRow[]> {
  try {
    const adminClient = createAdminClient();

    const { data: coaches, error } = await adminClient
      .from("coach_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching coach profiles:", error);
      return [];
    }

    if (!coaches || coaches.length === 0) return [];

    const { data: authData } = await adminClient.auth.admin.listUsers();
    const authMap = new Map(
      (authData?.users || []).map((u) => [u.id, u])
    );

    const coachIds = coaches.map((c) => c.id);
    const { data: certs } = await adminClient
      .from("coach_certifications")
      .select("coach_id")
      .in("coach_id", coachIds);

    const certCounts = new Map<string, number>();
    (certs || []).forEach((c) => {
      certCounts.set(c.coach_id, (certCounts.get(c.coach_id) || 0) + 1);
    });

    return coaches.map((coach) => {
      const authUser = authMap.get(coach.user_id);
      return {
        ...coach,
        email: authUser?.email || "N/A",
        display_name:
          authUser?.user_metadata?.display_name ||
          authUser?.email?.split("@")[0] ||
          "No name",
        certifications_count: certCounts.get(coach.id) || 0,
      };
    });
  } catch (error: any) {
    console.error("Error in getCoaches:", error?.message);
    return [];
  }
}

export default async function CoachesPage() {
  const coaches = await getCoaches();

  const stats = {
    total: coaches.length,
    pending: coaches.filter((c) => c.status === "pending").length,
    approved: coaches.filter((c) => c.status === "approved").length,
    rejected: coaches.filter((c) => c.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Coach Management</h1>
        <p className="text-muted-foreground">
          Review and manage coach profiles, certifications, and verification status.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Coaches</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Approved</p>
          <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Rejected</p>
          <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
        </div>
      </div>

      <CoachSearchFilter coaches={coaches} />
    </div>
  );
}
