import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function EmptyUsersState() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
      </div>

      <EmptyState
        icon={Users}
        title="No users yet"
        description="Users will appear here once they sign up for the app. You can manage their accounts, assign admin roles, and monitor their activity."
      />
    </div>
  );
}
