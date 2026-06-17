export const BI_RANGE_CONFIG = {
  "7d": { days: 7, label: "7D" },
  "30d": { days: 30, label: "30D" },
  "90d": { days: 90, label: "90D" },
} as const;

export type BIRangeKey = keyof typeof BI_RANGE_CONFIG;

export const BI_RANGE_KEYS = Object.keys(BI_RANGE_CONFIG) as BIRangeKey[];

export const BI_EXPORT_SLICES = [
  "finance",
  "lifecycle",
  "cohorts",
  "coach-ops",
  "client-health",
] as const;

export type BIExportSlice = (typeof BI_EXPORT_SLICES)[number];
export type CSVValue = boolean | number | string | null | undefined;

export interface BIExportQuery {
  coachId?: string;
  packId?: string;
  range: { days: number; key: BIRangeKey };
  slice: BIExportSlice;
}

export interface BISnapshotInput {
  coachId: string | null;
  coachName: string | null;
  packId: string | null;
  packName: string | null;
  rangeKey: BIRangeKey;
}

type ParseResult<T> =
  | { ok: true; value: T }
  | { error: string; ok: false };

export function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function isBIRangeKey(value: string | null): value is BIRangeKey {
  return value !== null && BI_RANGE_KEYS.includes(value as BIRangeKey);
}

export function parseBIExportQuery(
  searchParams: URLSearchParams
): ParseResult<BIExportQuery> {
  const sliceKey = normalizeOptionalString(searchParams.get("slice"));
  const slice = BI_EXPORT_SLICES.find((candidate) => candidate === sliceKey);

  if (!slice) {
    return { error: "Invalid BI export slice.", ok: false };
  }

  const requestedRange = normalizeOptionalString(searchParams.get("range"));
  const rangeKey = isBIRangeKey(requestedRange) ? requestedRange : "30d";

  return {
    ok: true,
    value: {
      slice,
      range: { days: BI_RANGE_CONFIG[rangeKey].days, key: rangeKey },
      coachId: normalizeOptionalString(searchParams.get("coach")) || undefined,
      packId: normalizeOptionalString(searchParams.get("pack")) || undefined,
    },
  };
}

export function parseBISnapshotInput(
  body: unknown
): ParseResult<BISnapshotInput> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Invalid BI snapshot range.", ok: false };
  }

  const record = body as Record<string, unknown>;
  const rangeKey = normalizeOptionalString(record.rangeKey);

  if (!isBIRangeKey(rangeKey)) {
    return { error: "Invalid BI snapshot range.", ok: false };
  }

  return {
    ok: true,
    value: {
      rangeKey,
      coachId: normalizeOptionalString(record.coachId),
      coachName: normalizeOptionalString(record.coachName),
      packId: normalizeOptionalString(record.packId),
      packName: normalizeOptionalString(record.packName),
    },
  };
}

function escapeCSVValue(value: CSVValue): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue =
    typeof value === "boolean" ? (value ? "true" : "false") : String(value);

  if (!/[",\r\n]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replace(/"/g, '""')}"`;
}

export function serializeCSV(
  columns: string[],
  rows: Record<string, CSVValue>[]
): string {
  const lines = [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => escapeCSVValue(row[column])).join(",")
    ),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}
