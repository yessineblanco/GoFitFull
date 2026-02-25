"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DuplicateWorkoutButtonProps {
  workoutId: string;
  workoutName: string;
}

export default function DuplicateWorkoutButton({
  workoutId,
  workoutName,
}: DuplicateWorkoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleDuplicate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/workouts/${workoutId}/duplicate`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to duplicate workout");
      }

      setOpen(false);
      toast.success("Workout duplicated!", {
        description: `"${workoutName}" has been copied successfully.`,
      });
      router.refresh();
    } catch (error: any) {
      console.error("Error duplicating workout:", error);
      toast.error("Failed to duplicate workout", {
        description: error.message || "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Copy className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicate Workout</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a copy of <strong>{workoutName}</strong> with all its
            exercises, sets, reps, and day splits. The new workout will be named "
            {workoutName} (Copy)" and can be edited afterwards.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDuplicate} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
