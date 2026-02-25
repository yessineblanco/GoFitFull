"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  ListChecks,
  Settings,
  FileText,
  X,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/users", icon: Users },
  { name: "Exercises", href: "/exercises", icon: Dumbbell },
  { name: "Workouts", href: "/workouts", icon: ListChecks },
  { name: "Activity Logs", href: "/activity-logs", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div
            className="fixed inset-y-0 left-0 w-64 glass-strong border-r border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b border-border px-6">
              <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity" onClick={() => setIsOpen(false)}>
                <img
                  src="/logo.png"
                  alt="GoFit Logo"
                  className="h-10 w-auto dark:brightness-0 dark:invert"
                />
                <div>
                  <p className="text-[10px] text-muted-foreground -mt-0.5">Admin Panel</p>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-primary text-white shadow-lg glow-primary"
                        : "text-foreground hover:bg-white/5 dark:hover:bg-white/10"
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
        </div>
      )}
    </>
  );
}
