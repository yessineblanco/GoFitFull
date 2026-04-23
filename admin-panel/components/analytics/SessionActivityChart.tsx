"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionActivityPoint } from "@/lib/analytics";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";

interface SessionActivityChartProps {
  data: SessionActivityPoint[];
}

export default function SessionActivityChart({
  data,
}: SessionActivityChartProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-4 w-4" />
          Session Activity (30d)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No session activity data available
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="workoutSessions"
                name="Workout Sessions"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="completedWorkouts"
                name="Completed Workouts"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="completedBookings"
                name="Completed Coach Bookings"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
