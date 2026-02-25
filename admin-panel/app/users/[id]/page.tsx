import { createAdminClient } from "@/lib/supabase/admin";

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Mail,
  Calendar,
  Activity,
  Dumbbell,
  TrendingUp,
  ArrowLeft,
  User,
  Ruler,
  Weight,
  Target,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import ToggleAdminButton from "@/components/users/ToggleAdminButton";
import DeleteUserButton from "@/components/users/DeleteUserButton";

interface UserDetailsPageProps {
  params: Promise<{ id: string }>;
}

async function getUserDetails(userId: string) {
  const adminClient = createAdminClient();

  // Get auth user data
  const { data: authUser, error: authError } =
    await adminClient.auth.admin.getUserById(userId);

  if (authError || !authUser.user) {
    console.error("Error fetching auth user:", authError);
    return null;
  }

  // Get profile data
  const { data: profile } = await adminClient
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  // Get workout sessions stats
  const { data: sessions } = await adminClient
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  // Get total workouts (custom workouts created by user)
  const { count: customWorkoutsCount } = await adminClient
    .from("workouts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("workout_type", "custom");

  // Calculate stats
  const completedSessions = sessions?.filter((s) => s.completed_at) || [];
  const totalSessions = completedSessions.length;
  const totalDuration = completedSessions.reduce(
    (sum, s) => sum + (s.duration_minutes || 0),
    0
  );
  const totalCalories = completedSessions.reduce(
    (sum, s) => sum + (s.calories || 0),
    0
  );

  // Get recent sessions (last 10)
  const recentSessions = completedSessions.slice(0, 10);

  // Get last active date
  const lastActive = sessions?.[0]?.started_at
    ? new Date(sessions[0].started_at)
    : null;

  return {
    id: authUser.user.id,
    email: authUser.user.email || "N/A",
    display_name:
      authUser.user.user_metadata?.display_name ||
      authUser.user.email?.split("@")[0] ||
      "No name",
    created_at: authUser.user.created_at,
    last_sign_in_at: authUser.user.last_sign_in_at,
    is_admin: profile?.is_admin || false,
    profile: profile || null,
    stats: {
      totalSessions,
      totalDuration,
      totalCalories,
      customWorkoutsCount: customWorkoutsCount || 0,
      lastActive,
    },
    recentSessions,
  };
}

export default async function UserDetailsPage({ params }: UserDetailsPageProps) {
  const { id } = await params;
  const user = await getUserDetails(id);

  if (!user) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/users">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">User Details</h2>
            <p className="text-muted-foreground">
              View and manage user information
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ToggleAdminButton
            userId={user.id}
            isAdmin={user.is_admin}
            userName={user.display_name}
          />
          <DeleteUserButton
            userId={user.id}
            userName={user.display_name}
            userEmail={user.email}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={user.profile?.profile_picture_url || undefined}
                  alt={user.display_name}
                />
                <AvatarFallback className="text-2xl">
                  {user.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className="mt-4 text-xl font-semibold">{user.display_name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-2">
                {user.is_admin ? (
                  <Badge className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    User
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Joined</p>
                  <p className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {user.stats.lastActive && (
                <div className="flex items-center gap-3 text-sm">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Last Active</p>
                    <p className="text-muted-foreground">
                      {new Date(user.stats.lastActive).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Physical Stats */}
            {user.profile && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold">Physical Information</h4>
                
                {user.profile.age && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Age</span>
                    <span className="font-medium">{user.profile.age} years</span>
                  </div>
                )}

                {user.profile.gender && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Gender</span>
                    <span className="font-medium capitalize">{user.profile.gender}</span>
                  </div>
                )}

                {user.profile.height && (
                  <div className="flex items-center gap-3 text-sm">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">Height</span>
                    </div>
                    <span className="font-medium">
                      {user.profile.height} {user.profile.height_unit || "cm"}
                    </span>
                  </div>
                )}

                {user.profile.weight && (
                  <div className="flex items-center gap-3 text-sm">
                    <Weight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">Weight</span>
                    </div>
                    <span className="font-medium">
                      {user.profile.weight} {user.profile.weight_unit || "kg"}
                    </span>
                  </div>
                )}

                {user.profile.goal && (
                  <div className="flex items-center gap-3 text-sm">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">Goal</span>
                    </div>
                    <span className="font-medium capitalize">{user.profile.goal}</span>
                  </div>
                )}

                {user.profile.activity_level && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Activity Level</span>
                    <span className="font-medium capitalize">
                      {user.profile.activity_level}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats and Activity */}
        <div className="space-y-6 md:col-span-2">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Sessions
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{user.stats.totalSessions}</div>
                <p className="text-xs text-muted-foreground">
                  Completed workouts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Duration
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(user.stats.totalDuration / 60)}h
                </div>
                <p className="text-xs text-muted-foreground">
                  {user.stats.totalDuration} minutes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Calories Burned
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {user.stats.totalCalories.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total kcal</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Custom Workouts
                </CardTitle>
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {user.stats.customWorkoutsCount}
                </div>
                <p className="text-xs text-muted-foreground">Created by user</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Workout Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {user.recentSessions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Activity className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-4">No workout sessions yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {user.recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">
                            {new Date(session.started_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {session.duration_minutes} min • {session.calories || 0}{" "}
                          kcal
                        </p>
                      </div>
                      <Badge
                        variant={session.completed_at ? "default" : "secondary"}
                      >
                        {session.completed_at ? "Completed" : "In Progress"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
