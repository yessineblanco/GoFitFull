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

export function ImportExercisesButton() {
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

  const normalizeExerciseData = (data: any): any => {
    // Map common field names to our schema
    const mapping: Record<string, string> = {
      id: "id",
      name: "name",
      category: "category",
      difficulty: "difficulty",
      muscle_groups: "muscle_groups",
      musclegroups: "muscle_groups",
      equipment: "equipment",
      image_url: "image_url",
      imageurl: "image_url",
      video_url: "video_url",
      videourl: "video_url",
      instructions: "instructions",
      default_sets: "default_sets",
      defaultsets: "default_sets",
      default_reps: "default_reps",
      defaultreps: "default_reps",
      default_rest_time: "default_rest_time",
      defaultresttime: "default_rest_time",
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

    // Convert string arrays to arrays
    if (normalized.muscle_groups && typeof normalized.muscle_groups === "string") {
      normalized.muscle_groups = normalized.muscle_groups
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
    if (normalized.equipment && typeof normalized.equipment === "string") {
      normalized.equipment = normalized.equipment
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    // Convert numbers
    if (normalized.default_sets && typeof normalized.default_sets === "string") {
      normalized.default_sets = parseInt(normalized.default_sets) || 3;
    }
    if (normalized.default_reps && typeof normalized.default_reps === "string") {
      normalized.default_reps = parseInt(normalized.default_reps) || 10;
    }
    if (normalized.default_rest_time && typeof normalized.default_rest_time === "string") {
      normalized.default_rest_time = parseInt(normalized.default_rest_time) || 60;
    }

    // Remove id if present (we'll generate new ones)
    delete normalized.id;

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
          return normalizeExerciseData(item);
        } catch (error: any) {
          throw new Error(`Row ${index + 1}: ${error.message}`);
        }
      });

      // Import exercises via API
      const response = await fetch("/api/exercises/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ exercises: normalizedData }),
      });

      const data = await response.json();
      setResult({
        success: data.success || normalizedData.length,
        failed: data.failed || 0,
        errors: data.errors || [],
      });

      toast({
        title: "Import successful!",
        description: `Successfully imported ${data.success || normalizedData.length} exercises.`,
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
        description: error.message || "Failed to import exercises.",
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
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Exercises</DialogTitle>
          <DialogDescription>
            Import exercises from a CSV or JSON file. The file should contain exercise data with
            fields like name, category, difficulty, etc.
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
                placeholder='[{"name": "Push Up", "category": "Chest", ...}]'
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
                  Successfully imported: {result.success} exercises
                  {result.failed > 0 && <>, Failed: {result.failed} exercises</>}
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
              Import Exercises
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
