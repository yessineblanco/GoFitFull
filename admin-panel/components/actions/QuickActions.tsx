"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Users, Dumbbell, ListChecks } from "lucide-react";
import { ImportExercisesButton } from "@/components/exercises/ImportExercisesButton";
import { ImportWorkoutsButton } from "@/components/workouts/ImportWorkoutsButton";

export function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      label: "New Exercise",
      icon: Dumbbell,
      href: "/exercises/new",
    },
    {
      label: "New Workout",
      icon: ListChecks,
      href: "/workouts/new",
    },
    {
      label: "Add User",
      icon: Users,
      href: "/users", // Could be a modal in the future
    },
  ];

  // Import buttons are handled by separate components

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-gradient-primary hover:scale-105 transition-all duration-200 shadow-lg glow-primary">
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Quick Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Create New</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem
              key={action.label}
              onClick={() => router.push(action.href)}
              className="cursor-pointer"
            >
              <Icon className="mr-2 h-4 w-4" />
              {action.label}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Import</DropdownMenuLabel>
        <div className="px-2 py-1.5 flex flex-col gap-1">
          <ImportExercisesButton />
          <ImportWorkoutsButton />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
