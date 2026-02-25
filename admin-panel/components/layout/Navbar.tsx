"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User, Bell } from "lucide-react";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { QuickActions } from "@/components/actions/QuickActions";
import { KeyboardShortcuts } from "@/components/keyboard/KeyboardShortcuts";

export function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex h-16 items-center justify-between border-b border-white/10 glass-strong px-4 sm:px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4 flex-1">
        <MobileSidebar />
        <div className="hidden sm:block flex-1" />
        <div className="hidden md:block flex-1 max-w-md">
          <GlobalSearch />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Actions - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:block">
          <QuickActions />
        </div>

        {/* Keyboard Shortcuts */}
        <KeyboardShortcuts />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationCenter />

        {/* User Profile */}
        <div className="glass rounded-lg px-2 sm:px-3 py-2 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center glow-primary">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium">Admin</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          className="bg-gradient-primary hover:scale-105 transition-all duration-200 shadow-lg glow-primary"
          size="sm"
        >
          <LogOut className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </div>
  );
}
