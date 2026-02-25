"use client";

import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface FormFieldProps {
  label: string;
  error?: string;
  success?: boolean;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
  showCharCount?: boolean;
  maxLength?: number;
  currentLength?: number;
}

export function FormField({
  label,
  error,
  success,
  required,
  hint,
  children,
  className,
  showCharCount,
  maxLength,
  currentLength,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={label.toLowerCase().replace(/\s+/g, "-")}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {showCharCount && maxLength && currentLength !== undefined && (
          <span
            className={cn(
              "text-xs text-muted-foreground",
              currentLength > maxLength * 0.9 && "text-yellow-600",
              currentLength >= maxLength && "text-destructive"
            )}
          >
            {currentLength} / {maxLength}
          </span>
        )}
      </div>
      {children}
      {error && (
        <div className="flex items-center gap-1.5 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{error}</span>
        </div>
      )}
      {success && !error && (
        <div className="flex items-center gap-1.5 text-sm text-primary animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Looks good!</span>
        </div>
      )}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
