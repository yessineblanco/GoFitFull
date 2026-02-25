"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldOff, Search } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportUsersButton } from "@/components/users/ExportUsersButton";

interface User {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
}

interface UserSearchFilterProps {
  users: User[];
}

export default function UserSearchFilter({ users }: UserSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.display_name.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (roleFilter === "admin") {
      filtered = filtered.filter((user) => user.is_admin);
    } else if (roleFilter === "user") {
      filtered = filtered.filter((user) => !user.is_admin);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name":
          return a.display_name.localeCompare(b.display_name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [users, searchQuery, roleFilter, sortBy]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>All Users ({filteredAndSortedUsers.length})</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ExportUsersButton users={filteredAndSortedUsers} />
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                className="pl-8 w-full sm:w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admins Only</SelectItem>
                <SelectItem value="user">Users Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium">Email</th>
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium">
                  Display Name
                </th>
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium">Role</th>
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium hidden md:table-cell">
                  Created At
                </th>
                <th className="p-3 sm:p-4 text-right text-xs sm:text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-muted-foreground"
                  >
                    {searchQuery || roleFilter !== "all"
                      ? "No users found matching your filters"
                      : "No users found"}
                  </td>
                </tr>
              ) : (
                filteredAndSortedUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-3 sm:p-4 text-xs sm:text-sm truncate max-w-[200px]">{user.email}</td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm">
                      {user.display_name || "-"}
                    </td>
                    <td className="p-3 sm:p-4">
                      {user.is_admin ? (
                        <Badge className="flex items-center gap-1 w-fit text-xs">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1 w-fit text-xs"
                        >
                          <ShieldOff className="h-3 w-3" />
                          User
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground hidden md:table-cell">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 sm:p-4 text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <Link href={`/users/${user.id}`}>
                          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                            <span className="hidden sm:inline">View Details</span>
                            <span className="sm:hidden">View</span>
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Stats Footer */}
        {users.length > 0 && (
          <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
            <div>
              Showing {filteredAndSortedUsers.length} of {users.length} users
            </div>
            <div className="flex gap-4">
              <span>
                {users.filter((u) => u.is_admin).length} Admin{users.filter((u) => u.is_admin).length !== 1 ? "s" : ""}
              </span>
              <span>
                {users.filter((u) => !u.is_admin).length} Regular User{users.filter((u) => !u.is_admin).length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
