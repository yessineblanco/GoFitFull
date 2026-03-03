"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Dumbbell,
  ListChecks,
  Settings,
  FileText,
  CreditCard,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/users", icon: Users },
  { name: "Coaches", href: "/coaches", icon: UserCheck },
  { name: "Transactions", href: "/transactions", icon: CreditCard },
  { name: "Exercises", href: "/exercises", icon: Dumbbell },
  { name: "Workouts", href: "/workouts", icon: ListChecks },
  { name: "Activity Logs", href: "/activity-logs", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden lg:flex h-full w-64 flex-col glass-strong border-r border-white/10">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-border px-6">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img
            src="/logo.png"
            alt="GoFit Logo"
            className="h-10 w-auto dark:brightness-0 dark:invert"
          />
          <div className="hidden xl:block">
            <p className="text-[10px] text-muted-foreground -mt-0.5">Admin Panel</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4 custom-scrollbar overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-primary text-white shadow-lg glow-primary"
                  : "text-foreground hover:bg-white/5 dark:hover:bg-white/10 hover:translate-x-1"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-transform duration-200",
                isActive ? "scale-110" : "group-hover:scale-110"
              )} />
              <span>{item.name}</span>
              {isActive && (
                <div className="ml-auto h-2 w-2 rounded-full bg-white animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <div className="glass rounded-lg p-3">
          <p className="text-xs font-medium text-foreground">GoFit Admin</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Version 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
