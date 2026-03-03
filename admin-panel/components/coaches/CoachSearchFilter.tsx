"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Star } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CoachActions } from "./CoachActions";

interface Coach {
  id: string;
  user_id: string;
  bio: string | null;
  specialties: string[];
  hourly_rate: number | null;
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

interface CoachSearchFilterProps {
  coaches: Coach[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  approved: "bg-green-500/10 text-green-500 border-green-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function CoachSearchFilter({ coaches }: CoachSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  const filtered = useMemo(() => {
    let result = [...coaches];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.email.toLowerCase().includes(q) ||
          c.display_name.toLowerCase().includes(q) ||
          c.specialties.some((s) => s.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "rating":
          return b.average_rating - a.average_rating;
        case "name":
          return a.display_name.localeCompare(b.display_name);
        default:
          return 0;
      }
    });

    return result;
  }, [coaches, searchQuery, statusFilter, sortBy]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>All Coaches ({filtered.length})</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, specialty..."
                className="pl-8 w-full sm:w-[280px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="rating">Highest Rating</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left text-xs font-medium">Coach</th>
                <th className="p-3 text-left text-xs font-medium">Specialties</th>
                <th className="p-3 text-left text-xs font-medium">Rating</th>
                <th className="p-3 text-left text-xs font-medium">Rate</th>
                <th className="p-3 text-left text-xs font-medium">Status</th>
                <th className="p-3 text-left text-xs font-medium hidden md:table-cell">Created</th>
                <th className="p-3 text-right text-xs font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    {searchQuery || statusFilter !== "all"
                      ? "No coaches found matching your filters"
                      : "No coaches registered yet"}
                  </td>
                </tr>
              ) : (
                filtered.map((coach) => (
                  <tr key={coach.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-3">
                      <div>
                        <p className="text-sm font-medium">{coach.display_name}</p>
                        <p className="text-xs text-muted-foreground">{coach.email}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {coach.specialties.slice(0, 2).map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px]">
                            {s.replace(/_/g, " ")}
                          </Badge>
                        ))}
                        {coach.specialties.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{coach.specialties.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span className="text-sm">{coach.average_rating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">
                          ({coach.total_reviews})
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      {coach.hourly_rate ? `€${coach.hourly_rate}/h` : "—"}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${statusColors[coach.status] || ""}`}
                      >
                        {coach.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">
                      {new Date(coach.created_at).toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" })}
                    </td>
                    <td className="p-3 text-right">
                      <CoachActions coach={coach} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {coaches.length > 0 && (
          <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
            <div>
              Showing {filtered.length} of {coaches.length} coaches
            </div>
            <div className="flex gap-4">
              <span>{coaches.filter((c) => c.status === "pending").length} Pending</span>
              <span>{coaches.filter((c) => c.status === "approved").length} Approved</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
