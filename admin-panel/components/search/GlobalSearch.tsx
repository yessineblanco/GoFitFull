"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Search, Users, Dumbbell, ListChecks, FileText, Settings, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  category: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Search results based on routes
  const searchResults: SearchResult[] = [
    {
      id: "dashboard",
      title: "Dashboard",
      description: "View analytics and statistics",
      href: "/dashboard",
      icon: LayoutDashboard,
      category: "Pages",
    },
    {
      id: "users",
      title: "Users",
      description: "Manage user accounts and profiles",
      href: "/users",
      icon: Users,
      category: "Pages",
    },
    {
      id: "exercises",
      title: "Exercises",
      description: "Manage exercise library",
      href: "/exercises",
      icon: Dumbbell,
      category: "Pages",
    },
    {
      id: "workouts",
      title: "Workouts",
      description: "Manage native workouts",
      href: "/workouts",
      icon: ListChecks,
      category: "Pages",
    },
    {
      id: "activity-logs",
      title: "Activity Logs",
      description: "View admin activity and audit trail",
      href: "/activity-logs",
      icon: FileText,
      category: "Pages",
    },
    {
      id: "settings",
      title: "Settings",
      description: "Configure admin panel settings",
      href: "/settings",
      icon: Settings,
      category: "Pages",
    },
  ];

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (result: SearchResult) => {
    router.push(result.href);
    setOpen(false);
  };

  const groupedResults = searchResults.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative w-full sm:w-64 justify-start text-sm text-muted-foreground glass",
          "hover:bg-white/10 transition-all duration-200"
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <span className="hidden sm:inline-flex ml-auto text-xs bg-muted px-1.5 py-0.5 rounded border">
          ⌘K
        </span>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, users, exercises..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(groupedResults).map(([category, results]) => (
            <CommandGroup key={category} heading={category}>
              {results.map((result) => {
                const Icon = result.icon;
                return (
                  <CommandItem
                    key={result.id}
                    value={`${result.title} ${result.description}`}
                    onSelect={() => handleSelect(result)}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{result.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {result.description}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
