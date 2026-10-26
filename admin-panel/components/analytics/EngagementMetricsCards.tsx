"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EngagementMetrics } from "@/lib/analytics";
import { Users, Activity, TrendingUp, UserCheck } from "lucide-react";

interface EngagementMetricsCardsProps {
  metrics: EngagementMetrics;
}

export default function EngagementMetricsCards({
  metrics,
}: EngagementMetricsCardsProps) {
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">User profiles</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalUsers}</div>
          <p className="text-xs text-muted-foreground">Accounts with a saved profile</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">DAU</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.dau}</div>
          <p className="text-xs text-muted-foreground">
            Started a workout today
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">WAU</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.wau}</div>
          <p className="text-xs text-muted-foreground">
            Started a workout in the last 7 days
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">MAU</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.mau}</div>
          <p className="text-xs text-muted-foreground">
            Started a workout in the last 30 days
          </p>
        </CardContent>
      </Card>
    </>
  );
}
