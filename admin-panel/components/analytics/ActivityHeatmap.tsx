"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityHeatmapData } from "@/lib/analytics";
import { Calendar } from "lucide-react";

interface ActivityHeatmapProps {
  data: ActivityHeatmapData[];
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // Find max count for color scaling
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Get color intensity based on count
  const getColor = (count: number) => {
    if (count === 0) return "bg-muted/30";
    const intensity = (count / maxCount) * 100;
    if (intensity < 20) return "bg-green-200 dark:bg-green-900/40";
    if (intensity < 40) return "bg-green-300 dark:bg-green-800/50";
    if (intensity < 60) return "bg-green-400 dark:bg-green-700/60";
    if (intensity < 80) return "bg-green-500 dark:bg-green-600/70";
    return "bg-green-600 dark:bg-green-500/80";
  };

  // Group data by day and get peak hours
  const dayStats = days.map((day) => {
    const dayData = data.filter((d) => d.day === day);
    const totalSessions = dayData.reduce((sum, d) => sum + d.count, 0);
    const peakHour = dayData.reduce((max, d) => (d.count > max.count ? d : max), dayData[0]);
    
    return {
      day,
      total: totalSessions,
      peakHour: peakHour?.hour || 0,
      peakCount: peakHour?.count || 0,
    };
  });

  const totalWeeklySessions = dayStats.reduce((sum, d) => sum + d.total, 0);
  const mostActiveDay = dayStats.reduce((max, d) => (d.total > max.total ? d : max), dayStats[0]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Weekly Activity Overview
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Last 7 days • {totalWeeklySessions} total sessions
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Daily breakdown */}
          <div className="grid grid-cols-7 gap-3">
            {dayStats.map((dayStat) => (
              <div
                key={dayStat.day}
                className="space-y-2 rounded-lg border p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{dayStat.day}</span>
                  {dayStat.day === mostActiveDay.day && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      Peak
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-primary">
                  {dayStat.total}
                </div>
                <div className="text-xs text-muted-foreground">
                  {dayStat.total === 1 ? "session" : "sessions"}
                </div>
                {dayStat.peakCount > 0 && (
                  <div className="text-xs text-muted-foreground pt-1 border-t">
                    Peak: {dayStat.peakHour}:00 ({dayStat.peakCount})
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mini hourly grid for reference */}
          <div className="space-y-2 rounded-lg border p-4 bg-muted/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Hourly Activity Pattern</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-1">
                  <div className="h-3 w-3 rounded-sm bg-muted/30" />
                  <div className="h-3 w-3 rounded-sm bg-green-200 dark:bg-green-900/40" />
                  <div className="h-3 w-3 rounded-sm bg-green-400 dark:bg-green-700/60" />
                  <div className="h-3 w-3 rounded-sm bg-green-600 dark:bg-green-500/80" />
                </div>
                <span>More</span>
              </div>
            </div>
            
            <div className="space-y-1.5">
              {days.map((day) => {
                const dayData = data.filter((d) => d.day === day);
                return (
                  <div key={day} className="flex items-center gap-2">
                    <div className="w-10 text-xs font-medium text-muted-foreground">
                      {day}
                    </div>
                    <div className="flex-1 flex gap-0.5">
                      {Array.from({ length: 24 }, (_, hour) => {
                        const hourData = dayData.find((d) => d.hour === hour);
                        const count = hourData?.count || 0;
                        return (
                          <div
                            key={hour}
                            className={`h-5 flex-1 rounded-sm ${getColor(count)} transition-all hover:scale-110 hover:z-10 hover:shadow-sm cursor-pointer`}
                            title={`${day} ${hour}:00 - ${count} sessions`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time labels */}
            <div className="flex items-center gap-2 mt-2 pl-10">
              <div className="flex-1 flex justify-between text-[10px] text-muted-foreground">
                <span>12am</span>
                <span>6am</span>
                <span>12pm</span>
                <span>6pm</span>
                <span>11pm</span>
              </div>
            </div>
          </div>

          {/* Key insights */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 bg-muted/10">
              <div className="text-xs text-muted-foreground mb-1">Most Active Day</div>
              <div className="text-lg font-bold">{mostActiveDay.day}</div>
              <div className="text-xs text-muted-foreground">{mostActiveDay.total} sessions</div>
            </div>
            <div className="rounded-lg border p-3 bg-muted/10">
              <div className="text-xs text-muted-foreground mb-1">Peak Time</div>
              <div className="text-lg font-bold">{mostActiveDay.peakHour}:00</div>
              <div className="text-xs text-muted-foreground">Most popular hour</div>
            </div>
            <div className="rounded-lg border p-3 bg-muted/10">
              <div className="text-xs text-muted-foreground mb-1">Daily Average</div>
              <div className="text-lg font-bold">{Math.round(totalWeeklySessions / 7)}</div>
              <div className="text-xs text-muted-foreground">sessions per day</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
