"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, X, Upload } from "lucide-react";
import type { Exercise } from "@/types/database";
import { FormField } from "@/components/ui/form-field";
import {
  validateExerciseName,
  validateUrl,
  validateSetsReps,
  validateRestTime,
  validateRequired,
} from "@/lib/validation";

const CATEGORIES = [
  "Chest",
  "Back",
  "Legs",
  "Shoulders",
  "Arms",
  "Core",
  "Cardio",
  "Full Body",
];

const MUSCLE_GROUPS = [
  "Chest",
  "Upper Back",
  "Lower Back",
  "Quadriceps",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Front Delts",
  "Side Delts",
  "Rear Delts",
  "Biceps",
  "Triceps",
  "Forearms",
  "Abs",
  "Obliques",
];

const EQUIPMENT_OPTIONS = [
  "Barbell",
  "Dumbbell",
  "Cable",
  "Machine",
  "Bodyweight",
  "Resistance Band",
  "Kettlebell",
  "Smith Machine",
  "TRX",
  "Medicine Ball",
];

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;

interface ExerciseFormProps {
  exercise?: Exercise;
  isEditing?: boolean;
}

export function ExerciseForm({ exercise, isEditing = false }: ExerciseFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState(exercise?.name || "");
  const [category, setCategory] = useState(exercise?.category || "");
  const [difficulty, setDifficulty] = useState<typeof DIFFICULTIES[number]>(
    exercise?.difficulty || "Beginner"
  );
  const [muscleGroups, setMuscleGroups] = useState<string[]>(
    exercise?.muscle_groups || []
  );
  const [equipment, setEquipment] = useState<string[]>(exercise?.equipment || []);
  const [imageUrl, setImageUrl] = useState(exercise?.image_url || "");
  const [videoUrl, setVideoUrl] = useState(exercise?.video_url || "");
  const [instructions, setInstructions] = useState(exercise?.instructions || "");
  const [defaultSets, setDefaultSets] = useState<string>(
    exercise?.default_sets?.toString() || "3"
  );
  const [defaultReps, setDefaultReps] = useState<string>(
    exercise?.default_reps?.toString() || "10"
  );
  const [defaultRestTime, setDefaultRestTime] = useState<string>(
    exercise?.default_rest_time?.toString() || "60"
  );

  // Validation state
  const [nameError, setNameError] = useState<string | undefined>();
  const [categoryError, setCategoryError] = useState<string | undefined>();
  const [muscleGroupsError, setMuscleGroupsError] = useState<string | undefined>();
  const [imageUrlError, setImageUrlError] = useState<string | undefined>();
  const [videoUrlError, setVideoUrlError] = useState<string | undefined>();
  const [setsError, setSetsError] = useState<string | undefined>();
  const [repsError, setRepsError] = useState<string | undefined>();
  const [restTimeError, setRestTimeError] = useState<string | undefined>();

  // Upload state
  const [imageUploading, setImageUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Real-time validation
  useEffect(() => {
    if (name) {
      const validation = validateExerciseName(name);
      setNameError(validation.isValid ? undefined : validation.error);
    } else {
      setNameError(undefined);
    }
  }, [name]);

  useEffect(() => {
    if (category) {
      const validation = validateRequired(category, "Category");
      setCategoryError(validation.isValid ? undefined : validation.error);
    } else {
      setCategoryError(undefined);
    }
  }, [category]);

  useEffect(() => {
    if (muscleGroups.length > 0) {
      setMuscleGroupsError(undefined);
    } else {
      setMuscleGroupsError(undefined); // Only show on submit
    }
  }, [muscleGroups]);

  useEffect(() => {
    if (imageUrl) {
      const validation = validateUrl(imageUrl, "Image URL");
      setImageUrlError(validation.isValid ? undefined : validation.error);
    } else {
      setImageUrlError(undefined);
    }
  }, [imageUrl]);

  useEffect(() => {
    if (videoUrl) {
      const validation = validateUrl(videoUrl, "Video URL");
      setVideoUrlError(validation.isValid ? undefined : validation.error);
    } else {
      setVideoUrlError(undefined);
    }
  }, [videoUrl]);

  useEffect(() => {
    if (defaultSets) {
      const num = parseInt(defaultSets);
      if (!isNaN(num)) {
        const validation = validateSetsReps(num, "Sets");
        setSetsError(validation.isValid ? undefined : validation.error);
      } else {
        setSetsError("Must be a valid number");
      }
    } else {
      setSetsError(undefined);
    }
  }, [defaultSets]);

  useEffect(() => {
    if (defaultReps) {
      const num = parseInt(defaultReps);
      if (!isNaN(num)) {
        const validation = validateSetsReps(num, "Reps");
        setRepsError(validation.isValid ? undefined : validation.error);
      } else {
        setRepsError("Must be a valid number");
      }
    } else {
      setRepsError(undefined);
    }
  }, [defaultReps]);

  useEffect(() => {
    if (defaultRestTime) {
      const num = parseInt(defaultRestTime);
      if (!isNaN(num)) {
        const validation = validateRestTime(num);
        setRestTimeError(validation.isValid ? undefined : validation.error);
      } else {
        setRestTimeError("Must be a valid number");
      }
    } else {
      setRestTimeError(undefined);
    }
  }, [defaultRestTime]);

  const toggleMuscleGroup = (muscle: string) => {
    setMuscleGroups((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  };

  const toggleEquipment = (equip: string) => {
    setEquipment((prev) =>
      prev.includes(equip) ? prev.filter((e) => e !== equip) : [...prev, equip]
    );
  };

  const uploadFile = async (file: File, type: "image" | "video") => {
    setUploadError(null);
    if (type === "image") setImageUploading(true);
    else setVideoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      if (type === "image") {
        setImageUrl(data.url);
        setImageUrlError(undefined);
      } else {
        setVideoUrl(data.url);
        setVideoUrlError(undefined);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setUploadError(message);
    } finally {
      if (type === "image") setImageUploading(false);
      else setVideoUploading(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, "image");
    e.target.value = "";
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, "video");
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Validate all fields
      const nameValidation = validateExerciseName(name);
      if (!nameValidation.isValid) {
        setNameError(nameValidation.error);
        throw new Error(nameValidation.error);
      }

      const categoryValidation = validateRequired(category, "Category");
      if (!categoryValidation.isValid) {
        setCategoryError(categoryValidation.error);
        throw new Error(categoryValidation.error);
      }

      if (muscleGroups.length === 0) {
        setMuscleGroupsError("At least one muscle group is required");
        throw new Error("At least one muscle group is required");
      }

      if (imageUrl) {
        const imageValidation = validateUrl(imageUrl, "Image URL");
        if (!imageValidation.isValid) {
          setImageUrlError(imageValidation.error);
          throw new Error(imageValidation.error);
        }
      }

      if (videoUrl) {
        const videoValidation = validateUrl(videoUrl, "Video URL");
        if (!videoValidation.isValid) {
          setVideoUrlError(videoValidation.error);
          throw new Error(videoValidation.error);
        }
      }

      const payload = {
        name: name.trim(),
        category,
        difficulty,
        muscle_groups: muscleGroups,
        equipment: equipment.length > 0 ? equipment : null,
        image_url: imageUrl.trim() || null,
        video_url: videoUrl.trim() || null,
        instructions: instructions.trim() || null,
        default_sets: parseInt(defaultSets) || 3,
        default_reps: parseInt(defaultReps) || 10,
        default_rest_time: parseInt(defaultRestTime) || 60,
      };

      const url = isEditing
        ? `/api/exercises/${exercise?.id}`
        : "/api/exercises";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save exercise");
      }

      router.push("/exercises");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <FormField
          label="Exercise Name"
          error={nameError}
          success={!nameError && name.length > 0}
          required
          showCharCount
          maxLength={100}
          currentLength={name.length}
        >
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Bench Press"
            required
            className={nameError ? "border-destructive" : ""}
          />
        </FormField>

        <FormField
          label="Category"
          error={categoryError}
          success={!categoryError && category.length > 0}
          required
        >
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              categoryError ? "border-destructive" : "border-input"
            }`}
            required
          >
            <option value="">Select category...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {/* Difficulty */}
      <div className="space-y-2">
        <Label>
          Difficulty <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-2">
          {DIFFICULTIES.map((diff) => (
            <Button
              key={diff}
              type="button"
              variant={difficulty === diff ? "default" : "outline"}
              onClick={() => setDifficulty(diff)}
            >
              {diff}
            </Button>
          ))}
        </div>
      </div>

      {/* Muscle Groups */}
      <FormField
        label="Muscle Groups"
        error={muscleGroupsError}
        success={!muscleGroupsError && muscleGroups.length > 0}
        required
        hint="Select at least one muscle group"
      >
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map((muscle) => (
            <Button
              key={muscle}
              type="button"
              variant={muscleGroups.includes(muscle) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleMuscleGroup(muscle)}
            >
              {muscle}
            </Button>
          ))}
        </div>
      </FormField>

      {/* Equipment */}
      <div className="space-y-2">
        <Label>Equipment</Label>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map((equip) => (
            <Button
              key={equip}
              type="button"
              variant={equipment.includes(equip) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleEquipment(equip)}
            >
              {equip}
            </Button>
          ))}
        </div>
      </div>

      {/* Default Values */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label="Default Sets" error={setsError} hint="1-1000">
          <Input
            id="sets"
            type="number"
            min="1"
            max="1000"
            value={defaultSets}
            onChange={(e) => setDefaultSets(e.target.value)}
            className={setsError ? "border-destructive" : ""}
          />
        </FormField>

        <FormField label="Default Reps" error={repsError} hint="1-1000">
          <Input
            id="reps"
            type="number"
            min="1"
            max="1000"
            value={defaultReps}
            onChange={(e) => setDefaultReps(e.target.value)}
            className={repsError ? "border-destructive" : ""}
          />
        </FormField>

        <FormField label="Rest Time (seconds)" error={restTimeError} hint="0-600">
          <Input
            id="rest"
            type="number"
            min="0"
            max="600"
            value={defaultRestTime}
            onChange={(e) => setDefaultRestTime(e.target.value)}
            className={restTimeError ? "border-destructive" : ""}
          />
        </FormField>
      </div>

      {/* URLs */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <FormField
          label="Image URL"
          error={imageUrlError}
          success={!imageUrlError && imageUrl.length > 0}
          hint="Optional: URL or upload (max 5 MB, jpeg/png/gif/webp)"
        >
          <div className="flex gap-2">
            <Input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className={imageUrlError ? "border-destructive" : ""}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleImageFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={imageUploading}
              onClick={() => imageInputRef.current?.click()}
              title="Upload image"
            >
              {imageUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
          </div>
        </FormField>

        <FormField
          label="Video URL"
          error={videoUrlError}
          success={!videoUrlError && videoUrl.length > 0}
          hint="Optional: URL or upload (max 50 MB, mp4/webm/mov)"
        >
          <div className="flex gap-2">
            <Input
              id="videoUrl"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/..."
              className={videoUrlError ? "border-destructive" : ""}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={handleVideoFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={videoUploading}
              onClick={() => videoInputRef.current?.click()}
              title="Upload video"
            >
              {videoUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
          </div>
        </FormField>
      </div>
      {uploadError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {uploadError}
        </div>
      )}

      {/* Instructions */}
      <FormField
        label="Instructions"
        hint="Optional: Step-by-step instructions for performing this exercise"
        showCharCount
        maxLength={2000}
        currentLength={instructions.length}
      >
        <Textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Step-by-step instructions..."
          rows={4}
        />
      </FormField>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Exercise" : "Create Exercise"}
        </Button>
        <Link href="/exercises" className="w-full sm:w-auto">
          <Button type="button" variant="outline" disabled={isLoading} className="w-full sm:w-auto">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}
