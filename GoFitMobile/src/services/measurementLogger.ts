import * as FileSystem from 'expo-file-system/legacy';
import type { MeasurementResult } from './bodyMeasurementService';

const LOG_FILENAME = 'gofit-measurement-log.json';
const MAX_ENTRIES = 100;

/**
 * Persistent on-device log of every body-measurement scan.
 *
 * File lives in the app's document directory (survives app restarts, wiped
 * on uninstall). Stored as a JSON array of entries, newest appended at the
 * end. Trimmed to the last MAX_ENTRIES to stop it from growing unbounded.
 *
 * Use this instead of screenshotting the result screen when comparing scans
 * across outfits, lighting, people, etc.
 */
export type MeasurementLogEntry = {
  timestamp: string;
  heightCm: number | null;
  edited?: {
    chest_cm: number;
    waist_cm: number;
    hip_cm: number;
    shoulder_cm: number;
  } | null;
  result: MeasurementResult;
  /**
   * Capture-quality score after anomaly dampening (what the UI actually
   * showed the user). `result.confidence` is the raw service value; this is
   * what the user saw on the screen after history/ratio gates had a chance
   * to penalize a drifted scan. Missing on old entries.
   */
  effectiveConfidence?: number;
  /**
   * Short labels of any capture-anomaly gates that fired (e.g.
   * 'history-shoulder-drift', 'height-ratio-out-of-band'). Persisted so that
   * an old log can still explain why a scan looked "off" even after the
   * anomaly rules change later.
   */
  anomalyFlags?: string[];
  note?: string;
};

function getLogFileUri(): string {
  return `${FileSystem.documentDirectory ?? ''}${LOG_FILENAME}`;
}

export function getMeasurementLogFileUri(): string {
  return getLogFileUri();
}

export async function readMeasurementLog(): Promise<MeasurementLogEntry[]> {
  try {
    const uri = getLogFileUri();
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return [];
    const text = await FileSystem.readAsStringAsync(uri);
    if (!text) return [];
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as MeasurementLogEntry[]) : [];
  } catch (e) {
    console.warn('[measurementLogger] read failed', e);
    return [];
  }
}

export async function appendMeasurementLog(entry: MeasurementLogEntry): Promise<void> {
  try {
    const entries = await readMeasurementLog();
    entries.push(entry);
    const trimmed = entries.slice(-MAX_ENTRIES);
    await FileSystem.writeAsStringAsync(getLogFileUri(), JSON.stringify(trimmed, null, 2));
  } catch (e) {
    console.warn('[measurementLogger] append failed', e);
  }
}

export async function clearMeasurementLog(): Promise<void> {
  try {
    const uri = getLogFileUri();
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (e) {
    console.warn('[measurementLogger] clear failed', e);
  }
}

/**
 * Builds a compact, human-readable text summary of the log for Share sheets,
 * in-app viewing, and copy-paste.
 *
 * IMPORTANT: this does NOT include the raw `result.debug` payloads. Each
 * `MeasurementResult.debug` carries pose keypoints, MediaPipe debug frames,
 * and segmentation vectors; dumping JSON for 100 entries easily exceeds
 * Android's ~1 MB binder limit for `Share.share({ message })` and hangs the
 * system share sheet. The full JSON is always available on disk at
 * `getMeasurementLogFileUri()` for offline debugging.
 */
export function formatMeasurementLogForShare(entries: MeasurementLogEntry[]): string {
  if (entries.length === 0) {
    return 'GoFit measurement log is empty.';
  }

  const header = `GoFit measurement log - ${entries.length} scan${entries.length === 1 ? '' : 's'}`;
  const lines = entries.map((entry, idx) => {
    const r = entry.result;
    const ts = entry.timestamp;
    const formula = r.debug?.formula;
    const fv = r.debug?.featureVector;
    const seg = fv?.segmentation;
    const poseFront = r.debug?.front?.source ?? '--';
    const poseSide = r.debug?.side?.source ?? '--';
    const depthModel = fv?.depthModel ?? '--';
    const depthSource = fv?.depthSource ?? '--';
    const chestDepth = fv?.estimatedChestDepthCm;
    const abdomenDepth = fv?.estimatedAbdomenDepthCm;
    // Shoulder / height ratio is a cheap plausibility signal; adult humans
    // sit in 0.22-0.30. Out-of-band usually means pose drift or wrong height.
    const shoulderOverHeight =
      entry.heightCm && entry.heightCm > 0 && r.shoulder_cm > 0
        ? (r.shoulder_cm / entry.heightCm).toFixed(3)
        : '--';
    const edited = entry.edited
      ? `  edited -> chest ${entry.edited.chest_cm} / waist ${entry.edited.waist_cm} / hip ${entry.edited.hip_cm} / shoulder ${entry.edited.shoulder_cm}`
      : '';

    return [
      `#${idx + 1}  ${ts}`,
      `  height: ${entry.heightCm ?? '--'} cm  |  capture quality: ${r.confidence.toFixed(2)}${
        entry.effectiveConfidence != null && entry.effectiveConfidence !== r.confidence
          ? ` (dampened ${entry.effectiveConfidence.toFixed(2)})`
          : ''
      }${entry.anomalyFlags?.length ? `  |  anomalies: ${entry.anomalyFlags.join(', ')}` : ''}`,
      `  chest ${r.chest_cm} cm  |  waist ${r.waist_cm} cm  |  hip ${r.hip_cm} cm  |  shoulder ${r.shoulder_cm} cm`,
      `  depth source: ${depthSource}  |  depth model: ${depthModel}  |  chestDepth ${chestDepth ?? '--'} cm  |  abdomenDepth ${abdomenDepth ?? '--'} cm`,
      seg
        ? `  segmentation: clean ${seg.frontCleanCoverage != null ? `${Math.round(seg.frontCleanCoverage * 100)}%` : '--'} / ${seg.sideCleanCoverage != null ? `${Math.round(seg.sideCleanCoverage * 100)}%` : '--'}  |  ratios C ${seg.chestDepthToWidthRatio ?? '--'}  W ${seg.waistDepthToWidthRatio ?? '--'}  H ${seg.hipDepthToWidthRatio ?? '--'}`
        : '',
      seg
        ? `  seg lines: front ${seg.frontChestWidthCm ?? '--'}/${seg.frontWaistWidthCm ?? '--'}/${seg.frontHipWidthCm ?? '--'} cm  |  side ${seg.sideChestDepthCm ?? '--'}/${seg.sideWaistDepthCm ?? '--'}/${seg.sideHipDepthCm ?? '--'} cm`
        : '',
      `  shoulder/height: ${shoulderOverHeight}   (healthy 0.22-0.30)`,
      `  pose front: ${poseFront}  |  pose side: ${poseSide}`,
      formula
        ? `  formula: shoulderPx ${formula.frontShoulderPx ?? '--'} / hipPx ${formula.frontHipPx ?? '--'} / scale ${r.debug?.scaleCmPerPx ?? '--'}`
        : '',
      r.qualityIssues?.length ? `  issues: ${r.qualityIssues.join(', ')}` : '',
      r.error ? `  error: ${r.error}` : '',
      edited,
    ]
      .filter(Boolean)
      .join('\n');
  });

  const footer = `\n\nFull raw JSON (with pose keypoints / debug) is stored on-device at:\n${getLogFileUri()}`;
  return [header, '', ...lines].join('\n\n') + footer;
}
