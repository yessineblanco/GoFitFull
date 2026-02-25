"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function ImportWorkoutsButton() {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [jsonData, setJsonData] = useState("");
  const [importType, setImportType] = useState<"file" | "json">("file");
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/json" || selectedFile.name.endsWith(".json")) {
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setJsonData(text);
        };
        reader.readAsText(selectedFile);
      } else if (selectedFile.type === "text/csv" || selectedFile.name.endsWith(".csv")) {
        setFile(selectedFile);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV or JSON file.",
          variant: "destructive",
        });
      }
    }
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split("\n").filter((line) => line.trim());
    if (lines.length === 0) return [];

    // Parse header
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header.toLowerCase().replace(/\s+/g, "_")] = values[index] || "";
      });
      data.push(obj);
    }

    return data;
  };

  const parseJSON = (jsonText: string): any[] => {
    try {
      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      throw new Error("Invalid JSON format");
    }
  };

  const normalizeWorkoutData = (data: any): any => {
    // Map common field names to our schema
    const mapping: Record<string, string> = {
      id: "id",
      name: "name",
      difficulty: "difficulty",
      image_url: "image_url",
      imageurl: "image_url",
      exercises: "exercises",
      workout_type: "workout_type",
    };

    const normalized: any = {};
    Object.keys(data).forEach((key) => {
      const mappedKey = mapping[key.toLowerCase()] || key.toLowerCase();
      normalized[mappedKey] = data[key];
    });

    // Ensure required fields
    if (!normalized.name) {
      throw new Error("Missing required field: name");
    }

    // Ensure exercises is an array
    if (!normalized.exercises || !Array.isArray(normalized.exercises)) {
      if (typeof normalized.exercises === "string") {
        // Try to parse as JSON
        try {
          normalized.exercises = JSON.parse(normalized.exercises);
        } catch {
          throw new Error("Invalid exercises format (must be an array)");
        }
      } else {
        throw new Error("Missing or invalid exercises field (must be an array)");
      }
    }

    // Normalize exercises
    normalized.exercises = normalized.exercises.map((ex: any, index: number) => ({
      exercise_id: ex.exercise_id || ex.id || ex.exerciseId,
      sets: parseInt(ex.sets || ex.default_sets) || 3,
      reps: String(ex.reps || ex.default_reps || "10"),
      rest_time: parseInt(ex.rest_time || ex.default_rest_time || ex.restTime) || 60,
      day: ex.day || null,
      exercise_order: ex.exercise_order !== undefined ? ex.exercise_order : index,
    }));

    // Remove id if present (we'll generate new ones)
    delete normalized.id;

    // Set workout_type to native for imports
    normalized.workout_type = "native";

    return normalized;
  };

  const handleImport = async () => {
    if (importType === "file" && !file) {
      toast({
        title: "No file selected",
        description: "Please select a file to import.",
        variant: "destructive",
      });
      return;
    }

    if (importType === "json" && !jsonData.trim()) {
      toast({
        title: "No JSON data",
        description: "Please paste JSON data or select a file.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      let rawData: any[];

      if (importType === "file" && file) {
        if (file.type === "application/json" || file.name.endsWith(".json")) {
          rawData = parseJSON(jsonData);
        } else {
          const csvText = await file.text();
          rawData = parseCSV(csvText);
        }
      } else {
        rawData = parseJSON(jsonData);
      }

      if (rawData.length === 0) {
        throw new Error("No data found in file");
      }

      // Normalize and validate data
      const normalizedData = rawData.map((item, index) => {
        try {
          return normalizeWorkoutData(item);
        } catch (error: any) {
          throw new Error(`Row ${index + 1}: ${error.message}`);
        }
      });

      // Import workouts via API
      const response = await fetch("/api/workouts/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workouts: normalizedData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import workouts");
      }

      const data = await response.json();
      setResult({
        success: data.success || normalizedData.length,
        failed: data.failed || 0,
        errors: data.errors || [],
      });

      toast({
        title: "Import successful!",
        description: `Successfully imported ${data.success || normalizedData.length} workouts.`,
      });

      // Refresh the page after a short delay
      setTimeout(() => {
        router.refresh();
        setOpen(false);
        setFile(null);
        setJsonData("");
        setResult(null);
      }, 2000);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import workouts.",
        variant: "destructive",
      });
      setResult({
        success: 0,
        failed: 1,
        errors: [error.message || "Unknown error"],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 w-full justify-start">
          <Upload className="h-4 w-4" />
          Import Workouts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Workouts</DialogTitle>
          <DialogDescription>
            Import workouts from a CSV or JSON file. The file should contain workout data with
            fields like name, difficulty, and exercises array.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button
              variant={importType === "file" ? "default" : "outline"}
              size="sm"
              onClick={() => setImportType("file")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Upload File
            </Button>
            <Button
              variant={importType === "json" ? "default" : "outline"}
              size="sm"
              onClick={() => setImportType("json")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Paste JSON
            </Button>
          </div>

          {importType === "file" ? (
            <div className="space-y-2">
              <Label htmlFor="file-upload">Select CSV or JSON file</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                disabled={loading}
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="json-input">Paste JSON data</Label>
              <Textarea
                id="json-input"
                placeholder='[{"name": "Full Body Workout", "difficulty": "Beginner", "exercises": [...]}]'
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                disabled={loading}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          )}

          {result && (
            <Alert variant={result.failed > 0 ? "destructive" : "default"}>
              {result.failed === 0 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                Import {result.failed === 0 ? "Successful" : "Completed with Errors"}
              </AlertTitle>
              <AlertDescription>
                <p>
                  Successfully imported: {result.success} workouts
                  {result.failed > 0 && <>, Failed: {result.failed} workouts</>}
                </p>
                {result.errors.length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-sm">
                    {result.errors.slice(0, 5).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>... and {result.errors.length - 5} more errors</li>
                    )}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={loading || (!file && !jsonData.trim())}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import Workouts
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
