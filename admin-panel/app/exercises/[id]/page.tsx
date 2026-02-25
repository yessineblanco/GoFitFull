import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ExerciseForm } from "@/components/exercises/ExerciseForm";
import { notFound } from "next/navigation";
import type { Exercise } from "@/types/database";

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getExercise(id: string) {
  try {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("exercises")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching exercise:", error);
      return null;
    }

    return data as Exercise;
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
}

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exercise = await getExercise(id);

  if (!exercise) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center gap-4">
        <Link href="/exercises">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Exercise</h2>
          <p className="text-muted-foreground">
            Update exercise details for {exercise.name}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exercise Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ExerciseForm exercise={exercise} isEditing={true} />
        </CardContent>
      </Card>
    </div>
  );
}
