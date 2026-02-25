/**
 * Export utilities for converting data to CSV/JSON
 */

export interface ExportableData {
  [key: string]: any;
}

/**
 * Convert data array to CSV string
 */
export function exportToCSV(data: ExportableData[], filename: string): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV rows
  const csvRows = [
    // Header row
    headers.map(h => escapeCSVValue(h)).join(","),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return escapeCSVValue(formatValueForCSV(value));
      }).join(",")
    )
  ];

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Convert data array to JSON file
 */
export function exportToJSON(data: ExportableData[], filename: string): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.json`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  
  const stringValue = String(value);
  
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Format value for CSV (handle arrays, objects, dates)
 */
function formatValueForCSV(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  
  if (Array.isArray(value)) {
    return value.join("; ");
  }
  
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  return String(value);
}
