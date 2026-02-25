"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Server, Users, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface HealthMetric {
  name: string;
  status: "healthy" | "warning" | "error";
  value: string;
}

export function SystemHealth() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/health");
        if (!response.ok) {
          throw new Error("Failed to fetch health metrics");
        }
        const data = await response.json();
        setMetrics(data.metrics || []);
      } catch (error) {
        console.error("Error fetching health metrics:", error);
        // Set error state metrics
        setMetrics([
          {
            name: "Database",
            status: "error",
            value: "Connection Error",
          },
          {
            name: "API Server",
            status: "error",
            value: "Error",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: HealthMetric["status"]) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    }
  };

  const getStatusIcon = (status: HealthMetric["status"]) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      case "error":
        return <XCircle className="h-3 w-3 text-red-500" />;
    }
  };

  const getIcon = (name: string) => {
    switch (name) {
      case "Database":
        return Database;
      case "API Server":
        return Server;
      case "Active Users":
        return Users;
      case "System Load":
        return Activity;
      default:
        return Activity;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">System Health</CardTitle>
        <CardDescription className="text-xs">Real-time system status</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 gap-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div>
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-2 w-12" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))
          ) : metrics.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No health data available
            </div>
          ) : (
            metrics.map((metric) => {
              const Icon = getIcon(metric.name);
              return (
                <div
                  key={metric.name}
                  className="flex items-center justify-between p-2 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">{metric.name}</p>
                      <p className="text-[10px] text-muted-foreground">{metric.value}</p>
                    </div>
                  </div>
                  <Badge className={cn("text-[10px] px-1.5 py-0.5 flex items-center gap-1", getStatusColor(metric.status))}>
                    {getStatusIcon(metric.status)}
                    {metric.status}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
