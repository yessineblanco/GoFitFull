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
  const dauPercentage = metrics.totalUsers > 0 
    ? ((metrics.dau / metrics.totalUsers) * 100).toFixed(1)
    : "0";
  const wauPercentage = metrics.totalUsers > 0
    ? ((metrics.wau / metrics.totalUsers) * 100).toFixed(1)
    : "0";
  const mauPercentage = metrics.totalUsers > 0
    ? ((metrics.mau / metrics.totalUsers) * 100).toFixed(1)
    : "0";

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalUsers}</div>
          <p className="text-xs text-muted-foreground">Registered accounts</p>
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
            {dauPercentage}% of total users
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
            {wauPercentage}% of total users
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
            {mauPercentage}% of total users
          </p>
        </CardContent>
      </Card>
    </>
  );
}
