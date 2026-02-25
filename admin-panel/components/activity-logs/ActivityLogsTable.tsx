"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface ActivityLog {
  id: string;
  adminUserId: string;
  adminEmail: string;
  adminName: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface ActivityLogsTableProps {
  logs: ActivityLog[];
}

function getActionColor(action: string): string {
  if (action.includes("CREATE")) {
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  }
  if (action.includes("UPDATE")) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  }
  if (action.includes("DELETE")) {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  }
  return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
}

function getResourceTypeColor(resourceType: string): string {
  const colors: Record<string, string> = {
    exercise: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    workout: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    user: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
    settings: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  };
  return colors[resourceType.toLowerCase()] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
}

export default function ActivityLogsTable({ logs }: ActivityLogsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Get unique actions and resource types
  const actions = useMemo(() => {
    const actionSet = new Set(logs.map((log) => log.action));
    return Array.from(actionSet).sort();
  }, [logs]);

  const resourceTypes = useMemo(() => {
    const typeSet = new Set(logs.map((log) => log.resourceType));
    return Array.from(typeSet).sort();
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    let filtered = [...logs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.adminEmail.toLowerCase().includes(query) ||
          log.adminName.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query) ||
          log.resourceType.toLowerCase().includes(query) ||
          log.ipAddress?.toLowerCase().includes(query)
      );
    }

    // Action filter
    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    // Resource type filter
    if (resourceTypeFilter !== "all") {
      filtered = filtered.filter((log) => log.resourceType === resourceTypeFilter);
    }

    // Date range filter
    if (dateRange?.from) {
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.createdAt);
        const fromDate = dateRange.from!;
        const toDate = dateRange.to || dateRange.from!;
        return logDate >= fromDate && logDate <= toDate;
      });
    }

    return filtered;
  }, [logs, searchQuery, actionFilter, resourceTypeFilter, dateRange]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Activity History ({filteredLogs.length})</CardTitle>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by admin, action, resource..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Action Filter */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Resource Type Filter */}
            <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {resourceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              className="w-full sm:w-[280px]"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium">Time</th>
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium">Admin</th>
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium">Action</th>
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium">Resource</th>
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium hidden md:table-cell">Details</th>
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium hidden lg:table-cell">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    {searchQuery || actionFilter !== "all" || resourceTypeFilter !== "all" || dateRange
                      ? "No activity logs found matching your filters"
                      : "No activity logs found"}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-3 sm:p-4 text-xs sm:text-sm">
                      <div>{format(new Date(log.createdAt), "MMM dd, yyyy")}</div>
                      <div className="text-muted-foreground">
                        {format(new Date(log.createdAt), "HH:mm:ss")}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm">
                      <div className="font-medium">{log.adminName}</div>
                      <div className="text-muted-foreground truncate max-w-[150px]">
                        {log.adminEmail}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4">
                      <Badge className={getActionColor(log.action)}>
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="p-3 sm:p-4">
                      <Badge className={getResourceTypeColor(log.resourceType)}>
                        {log.resourceType}
                      </Badge>
                      {log.resourceId && (
                        <div className="text-xs text-muted-foreground mt-1 truncate max-w-[100px]">
                          {log.resourceId.substring(0, 8)}...
                        </div>
                      )}
                    </td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm hidden md:table-cell">
                      {log.details ? (
                        <div className="max-w-[200px] truncate text-muted-foreground">
                          {JSON.stringify(log.details)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm hidden lg:table-cell">
                      {log.ipAddress || <span className="text-muted-foreground">-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
