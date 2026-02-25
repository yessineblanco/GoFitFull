import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MultiExerciseForm } from "@/components/exercises/MultiExerciseForm";

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function NewExercisePage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center gap-4">
        <Link href="/exercises">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add Exercises</h2>
          <p className="text-muted-foreground">
            Create one or more exercises for the library
          </p>
        </div>
      </div>

      <MultiExerciseForm />
    </div>
  );
}
