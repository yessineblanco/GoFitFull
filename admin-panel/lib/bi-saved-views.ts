export const ADVANCED_BI_SAVED_VIEWS_MAX = 6;

export const ADVANCED_BI_SAVED_VIEW_RANGE_KEYS = ["7d", "30d", "90d"] as const;

export type AdvancedBISavedViewRangeKey =
  (typeof ADVANCED_BI_SAVED_VIEW_RANGE_KEYS)[number];

export interface AdvancedBISavedView {
  id: string;
  name: string;
  rangeKey: AdvancedBISavedViewRangeKey;
  coachId: string | null;
  packId: string | null;
  createdAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeSavedView(value: unknown): AdvancedBISavedView | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = normalizeNullableString(value.id);
  const name = normalizeNullableString(value.name);
  const rangeKey = normalizeNullableString(value.rangeKey);
  const createdAt = normalizeNullableString(value.createdAt);

  if (
    !id ||
    !name ||
    !createdAt ||
    !rangeKey ||
    !ADVANCED_BI_SAVED_VIEW_RANGE_KEYS.includes(
      rangeKey as AdvancedBISavedViewRangeKey
    )
  ) {
    return null;
  }

  return {
    id,
    name,
    rangeKey: rangeKey as AdvancedBISavedViewRangeKey,
    coachId: normalizeNullableString(value.coachId),
    packId: normalizeNullableString(value.packId),
    createdAt,
  };
}

export function buildAdvancedBISavedViewsSettingKey(adminUserId: string) {
  return `advanced_bi_saved_views:${adminUserId}`;
}

export function parseAdvancedBISavedViewsValue(value: unknown) {
  const rawViews = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.views)
      ? value.views
      : [];

  return rawViews
    .map((item) => normalizeSavedView(item))
    .filter((item): item is AdvancedBISavedView => item !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, ADVANCED_BI_SAVED_VIEWS_MAX);
}
