"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle2,
  Upload,
} from "lucide-react";

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
type Difficulty = (typeof DIFFICULTIES)[number];

interface ExerciseEntry {
  id: string;
  name: string;
  category: string;
  difficulty: Difficulty;
  muscleGroups: string[];
  equipment: string[];
  imageUrl: string;
  videoUrl: string;
  instructions: string;
  defaultSets: string;
  defaultReps: string;
  defaultRestTime: string;
  collapsed: boolean;
}

function createEmptyEntry(): ExerciseEntry {
  return {
    id: crypto.randomUUID(),
    name: "",
    category: "",
    difficulty: "Beginner",
    muscleGroups: [],
    equipment: [],
    imageUrl: "",
    videoUrl: "",
    instructions: "",
    defaultSets: "3",
    defaultReps: "10",
    defaultRestTime: "60",
    collapsed: false,
  };
}

function validateEntry(entry: ExerciseEntry): string | null {
  if (!entry.name.trim()) return "Name is required";
  if (!entry.category) return "Category is required";
  if (entry.muscleGroups.length === 0)
    return "At least one muscle group is required";
  return null;
}

export function MultiExerciseForm() {
  const router = useRouter();
  const [entries, setEntries] = useState<ExerciseEntry[]>([createEmptyEntry()]);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [results, setResults] = useState<
    { name: string; success: boolean; error?: string }[]
  >([]);
  const [imageUploading, setImageUploading] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const activeUploadId = useRef<string | null>(null);

  const updateEntry = useCallback(
    (id: string, updates: Partial<ExerciseEntry>) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
      );
    },
    []
  );

  const addEntry = () => {
    setEntries((prev) => {
      const collapsed = prev.map((e) => ({ ...e, collapsed: true }));
      return [...collapsed, createEmptyEntry()];
    });
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  };

  const duplicateEntry = (id: string) => {
    setEntries((prev) => {
      const source = prev.find((e) => e.id === id);
      if (!source) return prev;
      const idx = prev.indexOf(source);
      const dup: ExerciseEntry = {
        ...source,
        id: crypto.randomUUID(),
        name: source.name ? `${source.name} (copy)` : "",
        collapsed: false,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      return next;
    });
  };

  const toggleCollapse = (id: string) => {
    updateEntry(id, {
      collapsed: !entries.find((e) => e.id === id)?.collapsed,
    });
  };

  const toggleMuscleGroup = (entryId: string, muscle: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? {
              ...e,
              muscleGroups: e.muscleGroups.includes(muscle)
                ? e.muscleGroups.filter((m) => m !== muscle)
                : [...e.muscleGroups, muscle],
            }
          : e
      )
    );
  };

  const toggleEquipment = (entryId: string, equip: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? {
              ...e,
              equipment: e.equipment.includes(equip)
                ? e.equipment.filter((eq) => eq !== equip)
                : [...e.equipment, equip],
            }
          : e
      )
    );
  };

  const uploadFile = async (
    entryId: string,
    file: File,
    type: "image" | "video"
  ) => {
    if (type === "image") setImageUploading(entryId);
    else setVideoUploading(entryId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      if (type === "image") updateEntry(entryId, { imageUrl: data.url });
      else updateEntry(entryId, { videoUrl: data.url });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setGlobalError(message);
    } finally {
      if (type === "image") setImageUploading(null);
      else setVideoUploading(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeUploadId.current)
      uploadFile(activeUploadId.current, file, "image");
    e.target.value = "";
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeUploadId.current)
      uploadFile(activeUploadId.current, file, "video");
    e.target.value = "";
  };

  const handleSubmit = async () => {
    setGlobalError("");
    setResults([]);

    const errors: string[] = [];
    entries.forEach((entry, i) => {
      const err = validateEntry(entry);
      if (err) errors.push(`Exercise ${i + 1} (${entry.name || "untitled"}): ${err}`);
    });

    if (errors.length > 0) {
      setGlobalError(errors.join("\n"));
      setEntries((prev) => prev.map((e) => ({ ...e, collapsed: false })));
      return;
    }

    setIsLoading(true);

    try {
      const payload = entries.map((e) => ({
        name: e.name.trim(),
        category: e.category,
        difficulty: e.difficulty,
        muscle_groups: e.muscleGroups,
        equipment: e.equipment.length > 0 ? e.equipment : null,
        image_url: e.imageUrl.trim() || null,
        video_url: e.videoUrl.trim() || null,
        instructions: e.instructions.trim() || null,
        default_sets: parseInt(e.defaultSets) || 3,
        default_reps: parseInt(e.defaultReps) || 10,
        default_rest_time: parseInt(e.defaultRestTime) || 60,
      }));

      const response = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.length === 1 ? payload[0] : payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create exercises");
      }

      const data = await response.json();
      const created = Array.isArray(data.data) ? data.data : [data.data];

      setResults(
        created.map((ex: any) => ({
          name: ex.name,
          success: true,
        }))
      );

      setTimeout(() => {
        router.push("/exercises");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setGlobalError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const entryLabel = (entry: ExerciseEntry, idx: number) => {
    if (entry.name.trim()) return entry.name;
    return `Exercise ${idx + 1}`;
  };

  return (
    <div className="space-y-6">
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleImageChange}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleVideoChange}
      />

      {/* Global error */}
      {globalError && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-400 whitespace-pre-line">
          {globalError}
        </div>
      )}

      {/* Success results */}
      {results.length > 0 && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 space-y-1">
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm text-green-800 dark:text-green-400"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{r.name} created successfully</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
        <span className="text-sm font-medium">
          {entries.length} exercise{entries.length !== 1 ? "s" : ""} to create
        </span>
        <Button type="button" variant="outline" size="sm" onClick={addEntry}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Another
        </Button>
      </div>

      {/* Exercise entries */}
      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          className="rounded-lg border bg-card shadow-sm overflow-hidden"
        >
          {/* Collapsible header */}
          <button
            type="button"
            onClick={() => toggleCollapse(entry.id)}
            className="flex w-full items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {idx + 1}
              </span>
              <span className="font-medium text-sm">
                {entryLabel(entry, idx)}
              </span>
              {entry.category && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {entry.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {entry.collapsed ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>

          {/* Collapsible body */}
          {!entry.collapsed && (
            <div className="border-t px-5 py-5 space-y-5">
              {/* Row 1: Name + Category */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    Exercise Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={entry.name}
                    onChange={(e) =>
                      updateEntry(entry.id, { name: e.target.value })
                    }
                    placeholder="e.g., Bench Press"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={entry.category}
                    onChange={(e) =>
                      updateEntry(entry.id, { category: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select category...</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map((diff) => (
                    <Button
                      key={diff}
                      type="button"
                      variant={entry.difficulty === diff ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        updateEntry(entry.id, { difficulty: diff })
                      }
                    >
                      {diff}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Muscle Groups */}
              <div className="space-y-2">
                <Label>
                  Muscle Groups <span className="text-red-500">*</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_GROUPS.map((muscle) => (
                    <Button
                      key={muscle}
                      type="button"
                      variant={
                        entry.muscleGroups.includes(muscle)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => toggleMuscleGroup(entry.id, muscle)}
                    >
                      {muscle}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div className="space-y-2">
                <Label>Equipment</Label>
                <div className="flex flex-wrap gap-1.5">
                  {EQUIPMENT_OPTIONS.map((equip) => (
                    <Button
                      key={equip}
                      type="button"
                      variant={
                        entry.equipment.includes(equip) ? "default" : "outline"
                      }
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => toggleEquipment(entry.id, equip)}
                    >
                      {equip}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Sets / Reps / Rest */}
              <div className="grid gap-4 grid-cols-3">
                <div className="space-y-2">
                  <Label>Sets</Label>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={entry.defaultSets}
                    onChange={(e) =>
                      updateEntry(entry.id, { defaultSets: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reps</Label>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={entry.defaultReps}
                    onChange={(e) =>
                      updateEntry(entry.id, { defaultReps: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rest (sec)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="600"
                    value={entry.defaultRestTime}
                    onChange={(e) =>
                      updateEntry(entry.id, {
                        defaultRestTime: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Image / Video URLs */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      value={entry.imageUrl}
                      onChange={(e) =>
                        updateEntry(entry.id, { imageUrl: e.target.value })
                      }
                      placeholder="https://..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={imageUploading === entry.id}
                      onClick={() => {
                        activeUploadId.current = entry.id;
                        imageInputRef.current?.click();
                      }}
                      title="Upload image"
                    >
                      {imageUploading === entry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Video URL</Label>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      value={entry.videoUrl}
                      onChange={(e) =>
                        updateEntry(entry.id, { videoUrl: e.target.value })
                      }
                      placeholder="https://..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={videoUploading === entry.id}
                      onClick={() => {
                        activeUploadId.current = entry.id;
                        videoInputRef.current?.click();
                      }}
                      title="Upload video"
                    >
                      {videoUploading === entry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label>Instructions</Label>
                <Textarea
                  value={entry.instructions}
                  onChange={(e) =>
                    updateEntry(entry.id, { instructions: e.target.value })
                  }
                  placeholder="Step-by-step instructions..."
                  rows={3}
                />
              </div>

              {/* Entry actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => duplicateEntry(entry.id)}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Duplicate
                </Button>
                {entries.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeEntry(entry.id)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Bottom actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-2">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || results.length > 0}
          className="w-full sm:w-auto"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {entries.length === 1
            ? "Create Exercise"
            : `Create ${entries.length} Exercises`}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={addEntry}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Another
        </Button>
        <Link href="/exercises" className="w-full sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </Link>
      </div>
    </div>
  );
}
