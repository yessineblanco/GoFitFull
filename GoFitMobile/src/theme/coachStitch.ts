/** Stitch “GoFit Coach” dark UI (React Native guide) — prefer on coach dashboard / dark coach flows. */
export const COACH_UI = {
  background: '#0a0a0a',
  card: '#161616',
  primary: '#a3e635',
  accentRating: '#f59e0b',
  accentPacks: '#a855f7',
  textPrimary: '#ffffff',
  textSecondary: '#9ca3af',
  border: '#1f2937',
  iconBg: 'rgba(163, 230, 53, 0.1)',
  barMuted: '#333333',
  spacingMd: 16,
  spacingLg: 24,
  radiusCard: 20,
  radiusPill: 99,
} as const;

/** Dark palette from Stitch / Material mock — use when `isDark` on coach surfaces. */
export const COACH_STITCH = {
  bg: '#131313',
  surfaceLow: '#1c1b1b',
  surfaceCard: '#161616',
  surfaceContainer: '#201f1f',
  surfaceHighest: '#353534',
  outlineVariant: '#424936',
  primary: '#ccff80',
  primaryContainer: '#a3e635',
  onPrimary: '#213600',
  onSurface: '#e5e2e1',
  onSurfaceVariant: '#c2cab0',
  secondary: '#ddb7ff',
  tertiaryContainer: '#ffc989',
  tertiaryFixedDim: '#ffb95f',
  inversePrimary: '#446900',
  error: '#ffb4ab',
  errorContainer: '#93000a',
  outline: '#8c947c',
} as const;

export function coachStitchOr<T extends string | undefined>(
  isDark: boolean,
  stitch: T,
  fallback: T,
): T {
  return (isDark ? stitch : fallback) as T;
}
