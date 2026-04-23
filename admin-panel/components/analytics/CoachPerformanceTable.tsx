"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CoachPerformanceRow } from "@/lib/analytics";
import { Star } from "lucide-react";

interface CoachPerformanceTableProps {
  coaches: CoachPerformanceRow[];
}

export default function CoachPerformanceTable({
  coaches,
}: CoachPerformanceTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="h-4 w-4" />
          Coach Performance (30d)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {coaches.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No coach performance data available
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 pr-3 text-left font-medium">Coach</th>
                  <th className="py-3 px-3 text-right font-medium">Rating</th>
                  <th className="py-3 px-3 text-right font-medium">Reviews</th>
                  <th className="py-3 px-3 text-right font-medium">Completed</th>
                  <th className="py-3 px-3 text-right font-medium">Active Clients</th>
                  <th className="py-3 pl-3 text-right font-medium">Lifetime Sessions</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((coach) => (
                  <tr key={coach.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 pr-3 font-medium">{coach.name}</td>
                    <td className="py-3 px-3 text-right">{coach.averageRating.toFixed(1)}</td>
                    <td className="py-3 px-3 text-right">{coach.totalReviews}</td>
                    <td className="py-3 px-3 text-right">{coach.completedBookings}</td>
                    <td className="py-3 px-3 text-right">{coach.activeClients}</td>
                    <td className="py-3 pl-3 text-right">{coach.totalSessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
