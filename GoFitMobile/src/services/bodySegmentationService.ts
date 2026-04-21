import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { decode as decodeJpeg } from 'jpeg-js';

type LoadedTfliteModel = { run(inputs: ArrayBuffer[]): Promise<ArrayBuffer[]> };

export type SegmentationClassDebug = {
  classIndex: number;
  coverage: number;
  meanScore: number;
  bounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
};

export type SegmentationPoseKeypoint = { y: number; x: number; score: number };

export type SegmentationPoseDebug = {
  keypoints: SegmentationPoseKeypoint[];
};

export type SegmentationLineMeasurement = {
  label: 'chest' | 'waist' | 'hip';
  y: number;
  widthMaskPx: number;
  widthImagePx: number;
  segmentCount: number;
  leftX?: number;
  rightX?: number;
};

export type SegmentationBodyMaskDebug = {
  classIndex: number;
  rawCoverage: number;
  cleanedCoverage: number;
  lines: SegmentationLineMeasurement[];
};

export type SegmentationImageDebug = {
  originalWidth: number;
  originalHeight: number;
  maskWidth: number;
  maskHeight: number;
  channels: number;
  sampleSize: number;
  classCells: number[];
  classes: SegmentationClassDebug[];
  bodyMask?: SegmentationBodyMaskDebug;
};

export type BodySegmentationDebug = {
  model: string;
  input: string;
  output: string;
  front?: SegmentationImageDebug;
  side?: SegmentationImageDebug;
  error?: string;
};

const MODEL = require('../../assets/models/selfie_segmentation.tflite');
const MODEL_NAME = 'selfie_segmentation.tflite';
const INPUT_SIZE = 256;
const SAMPLE_SIZE = 32;
/**
 * Classic MediaPipe **Selfie Segmentation** TFLite (same graph shipped in
 * `@mediapipe/selfie_segmentation`): single-channel person confidence per
 * pixel, thresholded at 0.5, then pose-anchored flood-fill like before.
 *
 * We intentionally do **not** load the newer MediaPipe Tasks
 * `selfie_segmenter` asset from `mediapipe-models/.../float16/...` here:
 * that build fails on `react-native-fast-tflite`'s bundled LiteRT with
 * `Status: unresolved-ops` (often surfaced as a bogus allocation error).
 *
 * Compared to `selfie_multiclass_256x256`, this stays a single foreground
 * class so we avoid hair / face-skin subclasses painting the background.
 */
const PERSON_THRESHOLD = 0.5;
/** Debug class labels: 0 = background, 1 = person. */
const BACKGROUND_CLASS_INDEX = 0;
const PERSON_CLASS_INDEX = 1;
const DEBUG_CLASS_COUNT = 2;

/** Pose-landmark indices used to anchor the mask to the actual user. */
const MASK_ANCHOR_KEYPOINT_INDICES = [0, 5, 6, 11, 12] as const; // nose, shoulders, hips
const MASK_ANCHOR_MIN_SCORE = 0.3;
const MASK_ANCHOR_SEARCH_RADIUS = 10;

let cachedModel: LoadedTfliteModel | null = null;

async function getModel(): Promise<LoadedTfliteModel> {
  if (cachedModel) return cachedModel;
  const { loadTensorflowModel } = await import('react-native-fast-tflite');
  cachedModel = await loadTensorflowModel(MODEL, []);
  return cachedModel;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (e) => reject(e),
    );
  });
}

async function preprocessForSegmentation(
  imageUri: string,
): Promise<{ inputBuffer: ArrayBuffer; originalWidth: number; originalHeight: number }> {
  const { width: originalWidth, height: originalHeight } = await getImageSize(imageUri);

  const manipulated = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: INPUT_SIZE, height: INPUT_SIZE } }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
  );

  const jpegBytes = new Uint8Array(await new File(manipulated.uri).arrayBuffer());
  const decoded = decodeJpeg(jpegBytes, { useTArray: true });
  const { data, width, height } = decoded;

  const rgb = new Float32Array(1 * width * height * 3);
  let o = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rgb[o++] = data[idx] / 255;
      rgb[o++] = data[idx + 1] / 255;
      rgb[o++] = data[idx + 2] / 255;
    }
  }

  return { inputBuffer: rgb.buffer as ArrayBuffer, originalWidth, originalHeight };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function keypointAverageY(
  pose: SegmentationPoseDebug | undefined,
  a: number,
  b: number,
  minScore = 0.08,
): number | null {
  const ka = pose?.keypoints[a];
  const kb = pose?.keypoints[b];
  if (!ka || !kb || ka.score < minScore || kb.score < minScore) return null;
  return (ka.y + kb.y) / 2;
}

function keypointAverageX(
  pose: SegmentationPoseDebug | undefined,
  a: number,
  b: number,
  minScore = 0.08,
): number | null {
  const ka = pose?.keypoints[a];
  const kb = pose?.keypoints[b];
  if (!ka || !kb || ka.score < minScore || kb.score < minScore) return null;
  return (ka.x + kb.x) / 2;
}

function bodyLevelRows(pose?: SegmentationPoseDebug): Array<{ label: 'chest' | 'waist' | 'hip'; y: number }> {
  const shoulderY = keypointAverageY(pose, 5, 6);
  const hipY = keypointAverageY(pose, 11, 12);
  if (shoulderY == null || hipY == null || hipY <= shoulderY) {
    return [
      { label: 'chest', y: 0.34 },
      { label: 'waist', y: 0.48 },
      { label: 'hip', y: 0.58 },
    ];
  }

  return [
    { label: 'chest', y: shoulderY + (hipY - shoulderY) * 0.28 },
    { label: 'waist', y: shoulderY + (hipY - shoulderY) * 0.68 },
    { label: 'hip', y: hipY },
  ];
}

function torsoCenterX(pose?: SegmentationPoseDebug): number {
  const shoulderX = keypointAverageX(pose, 5, 6);
  const hipX = keypointAverageX(pose, 11, 12);
  if (shoulderX != null && hipX != null) return (shoulderX + hipX) / 2;
  if (shoulderX != null) return shoulderX;
  if (hipX != null) return hipX;
  return 0.5;
}

/**
 * Returns the pixel index of the nearest body-mask pixel around `anchorIdx`,
 * searching outward in concentric squares up to `radius`. Used to recover
 * when the exact landmark lands on a background pixel (e.g. hair gap or
 * shoulder edge jitter). Returns -1 if nothing is found within radius.
 */
function findNearbyBodyPixel(mask: Uint8Array, anchorIdx: number, radius: number): number {
  if (mask[anchorIdx]) return anchorIdx;
  const ax = anchorIdx % INPUT_SIZE;
  const ay = Math.floor(anchorIdx / INPUT_SIZE);
  for (let r = 1; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      const ny = ay + dy;
      if (ny < 0 || ny >= INPUT_SIZE) continue;
      for (let dx = -r; dx <= r; dx++) {
        // Only scan the ring at distance r to avoid revisiting earlier rings.
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const nx = ax + dx;
        if (nx < 0 || nx >= INPUT_SIZE) continue;
        const idx = ny * INPUT_SIZE + nx;
        if (mask[idx]) return idx;
      }
    }
  }
  return -1;
}

/**
 * Flood-fills from `seed` across `mask`, marking reached pixels in `cleaned`
 * and skipping pixels already in `visited`. Returns the count of new pixels
 * added to `cleaned`.
 */
function floodFillFromSeed(
  mask: Uint8Array,
  seed: number,
  visited: Uint8Array,
  cleaned: Uint8Array,
  queue: Int32Array,
): number {
  if (visited[seed] || !mask[seed]) return 0;
  let head = 0;
  let tail = 0;
  visited[seed] = 1;
  cleaned[seed] = 1;
  queue[tail++] = seed;
  let count = 1;

  while (head < tail) {
    const current = queue[head++];
    const x = current % INPUT_SIZE;
    const y = Math.floor(current / INPUT_SIZE);
    const neighbors = [
      x > 0 ? current - 1 : -1,
      x < INPUT_SIZE - 1 ? current + 1 : -1,
      y > 0 ? current - INPUT_SIZE : -1,
      y < INPUT_SIZE - 1 ? current + INPUT_SIZE : -1,
    ];
    for (const next of neighbors) {
      if (next < 0 || visited[next] || !mask[next]) continue;
      visited[next] = 1;
      cleaned[next] = 1;
      queue[tail++] = next;
      count += 1;
    }
  }
  return count;
}

function countMaskPixels(mask: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) n += 1;
  return n;
}

/**
 * Keep only the connected component(s) that actually contain the user.
 *
 * Previously this kept the single largest blob, which failed whenever a
 * non-person object near the subject (a chair behind them, furniture, a
 * backpack on the floor) produced a bigger silhouette than the partially
 * captured user. We now flood-fill from the positions of the MediaPipe
 * pose keypoints (nose, shoulders, hips) so the kept blob is always the
 * one the pose detector agrees is the person. Falls back to the largest
 * component when pose anchors aren't available.
 */
function keepPoseAnchoredComponents(
  mask: Uint8Array,
  pose?: SegmentationPoseDebug,
): { mask: Uint8Array; rawCount: number; cleanedCount: number } {
  const rawCount = countMaskPixels(mask);
  const cleaned = new Uint8Array(mask.length);
  if (rawCount === 0) return { mask: cleaned, rawCount: 0, cleanedCount: 0 };

  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);

  if (pose) {
    let cleanedCount = 0;
    for (const kpIndex of MASK_ANCHOR_KEYPOINT_INDICES) {
      const kp = pose.keypoints[kpIndex];
      if (!kp || (kp.score ?? 0) < MASK_ANCHOR_MIN_SCORE) continue;
      const x = Math.max(0, Math.min(INPUT_SIZE - 1, Math.round(kp.x * (INPUT_SIZE - 1))));
      const y = Math.max(0, Math.min(INPUT_SIZE - 1, Math.round(kp.y * (INPUT_SIZE - 1))));
      const anchorIdx = y * INPUT_SIZE + x;
      const seed = findNearbyBodyPixel(mask, anchorIdx, MASK_ANCHOR_SEARCH_RADIUS);
      if (seed < 0) continue;
      cleanedCount += floodFillFromSeed(mask, seed, visited, cleaned, queue);
    }
    if (cleanedCount > 0) {
      return { mask: cleaned, rawCount, cleanedCount };
    }
    // Every anchor was too far from any body pixel — fall through to the
    // largest-component fallback so we still return _something_ instead of
    // an empty mask.
  }

  let bestStart = -1;
  let bestCount = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || visited[i]) continue;
    let head = 0;
    let tail = 0;
    let count = 0;
    visited[i] = 1;
    queue[tail++] = i;
    while (head < tail) {
      const current = queue[head++];
      count += 1;
      const x = current % INPUT_SIZE;
      const y = Math.floor(current / INPUT_SIZE);
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < INPUT_SIZE - 1 ? current + 1 : -1,
        y > 0 ? current - INPUT_SIZE : -1,
        y < INPUT_SIZE - 1 ? current + INPUT_SIZE : -1,
      ];
      for (const next of neighbors) {
        if (next < 0 || visited[next] || !mask[next]) continue;
        visited[next] = 1;
        queue[tail++] = next;
      }
    }
    if (count > bestCount) {
      bestCount = count;
      bestStart = i;
    }
  }

  if (bestStart < 0) return { mask: cleaned, rawCount, cleanedCount: 0 };

  const fallbackVisited = new Uint8Array(mask.length);
  const cleanedCount = floodFillFromSeed(mask, bestStart, fallbackVisited, cleaned, queue);
  return { mask: cleaned, rawCount, cleanedCount };
}

function findSegmentsOnRow(mask: Uint8Array, y: number): Array<{ left: number; right: number; width: number; center: number }> {
  const segments: Array<{ left: number; right: number; width: number; center: number }> = [];
  let x = 0;
  while (x < INPUT_SIZE) {
    while (x < INPUT_SIZE && !mask[y * INPUT_SIZE + x]) x++;
    if (x >= INPUT_SIZE) break;
    const left = x;
    while (x < INPUT_SIZE && mask[y * INPUT_SIZE + x]) x++;
    const right = x - 1;
    const width = right - left + 1;
    segments.push({ left, right, width, center: (left + right) / 2 });
  }
  return segments;
}

function pickTorsoSegment(mask: Uint8Array, centerY: number, centerX: number) {
  const targetX = centerX * INPUT_SIZE;
  let best: { left: number; right: number; width: number; center: number; y: number; segmentCount: number } | null = null;

  for (let y = Math.max(0, centerY - 3); y <= Math.min(INPUT_SIZE - 1, centerY + 3); y++) {
    const segments = findSegmentsOnRow(mask, y).filter((segment) => segment.width >= 3);
    for (const segment of segments) {
      const centerDistance = Math.abs(segment.center - targetX);
      const score = segment.width - centerDistance * 0.35;
      const bestScore = best ? best.width - Math.abs(best.center - targetX) * 0.35 : -Infinity;
      if (score > bestScore) {
        best = { ...segment, y, segmentCount: segments.length };
      }
    }
  }

  return best;
}

function measureMaskLines(
  bodyMask: Uint8Array,
  originalWidth: number,
  pose?: SegmentationPoseDebug,
): SegmentationBodyMaskDebug {
  const cleaned = keepPoseAnchoredComponents(bodyMask, pose);
  const centerX = torsoCenterX(pose);

  const lines = bodyLevelRows(pose).map((level) => {
    const centerY = Math.max(0, Math.min(INPUT_SIZE - 1, Math.round(level.y * (INPUT_SIZE - 1))));
    const segment = pickTorsoSegment(cleaned.mask, centerY, centerX);
    const widthMaskPx = segment?.width ?? 0;
    return {
      label: level.label,
      y: round2(centerY / INPUT_SIZE),
      widthMaskPx: round2(widthMaskPx),
      widthImagePx: round2(widthMaskPx * (originalWidth / INPUT_SIZE)),
      segmentCount: segment?.segmentCount ?? 0,
      leftX: segment ? round2(segment.left / INPUT_SIZE) : undefined,
      rightX: segment ? round2(segment.right / INPUT_SIZE) : undefined,
    };
  });

  return {
    classIndex: PERSON_CLASS_INDEX,
    rawCoverage: round4(cleaned.rawCount / (INPUT_SIZE * INPUT_SIZE)),
    cleanedCoverage: round4(cleaned.cleanedCount / (INPUT_SIZE * INPUT_SIZE)),
    lines,
  };
}

/**
 * Decodes the selfie segmentation model's single-channel confidence output into:
 *   - a binary person-vs-background mask (thresholded at 0.5),
 *   - per-class coverage/bounds debug entries (background + person),
 *   - a downsampled `classCells` grid used by the debug overlay UI.
 */
function createClassDebug(
  outputBuffer: ArrayBuffer,
  originalWidth: number,
  originalHeight: number,
  pose?: SegmentationPoseDebug,
): SegmentationImageDebug {
  const output = new Float32Array(outputBuffer);
  const pixelCount = INPUT_SIZE * INPUT_SIZE;
  if (output.length < pixelCount) {
    throw new Error(`Segmentation output was too small: expected ${pixelCount} floats, got ${output.length}.`);
  }

  const classCounts = [0, 0];
  const scoreSums = [0, 0];
  const minX = [INPUT_SIZE, INPUT_SIZE];
  const minY = [INPUT_SIZE, INPUT_SIZE];
  const maxX = [-1, -1];
  const maxY = [-1, -1];
  const classCells: number[] = [];
  const bodyMask = new Uint8Array(pixelCount);

  const cellSize = INPUT_SIZE / SAMPLE_SIZE;
  for (let cy = 0; cy < SAMPLE_SIZE; cy++) {
    for (let cx = 0; cx < SAMPLE_SIZE; cx++) {
      let localPerson = 0;
      let localBackground = 0;
      const startX = Math.floor(cx * cellSize);
      const endX = Math.floor((cx + 1) * cellSize);
      const startY = Math.floor(cy * cellSize);
      const endY = Math.floor((cy + 1) * cellSize);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const pixel = y * INPUT_SIZE + x;
          const prob = output[pixel];
          const isPerson = prob >= PERSON_THRESHOLD;
          const cls = isPerson ? PERSON_CLASS_INDEX : BACKGROUND_CLASS_INDEX;
          // The raw mask fed into flood-fill/torso measurement only needs
          // foreground pixels, but we track both classes for the debug UI.
          if (isPerson) {
            bodyMask[pixel] = 1;
            localPerson += 1;
          } else {
            localBackground += 1;
          }
          classCounts[cls] += 1;
          // `scoreSums` stores the person probability for person pixels and
          // (1 - prob) for background pixels so `meanScore` stays a
          // "confidence in the assigned class" figure like the old model.
          scoreSums[cls] += isPerson ? prob : 1 - prob;
          if (x < minX[cls]) minX[cls] = x;
          if (y < minY[cls]) minY[cls] = y;
          if (x > maxX[cls]) maxX[cls] = x;
          if (y > maxY[cls]) maxY[cls] = y;
        }
      }

      classCells.push(localPerson >= localBackground ? PERSON_CLASS_INDEX : BACKGROUND_CLASS_INDEX);
    }
  }

  const classes = classCounts.map((count, classIndex) => {
    const hasBounds = count > 0 && maxX[classIndex] >= 0;
    return {
      classIndex,
      coverage: round4(count / pixelCount),
      meanScore: round4(count > 0 ? scoreSums[classIndex] / count : 0),
      bounds: hasBounds
        ? {
            minX: round2(minX[classIndex] / INPUT_SIZE),
            minY: round2(minY[classIndex] / INPUT_SIZE),
            maxX: round2(maxX[classIndex] / INPUT_SIZE),
            maxY: round2(maxY[classIndex] / INPUT_SIZE),
          }
        : undefined,
    };
  });

  return {
    originalWidth,
    originalHeight,
    maskWidth: INPUT_SIZE,
    maskHeight: INPUT_SIZE,
    channels: DEBUG_CLASS_COUNT,
    sampleSize: SAMPLE_SIZE,
    classCells,
    classes,
    bodyMask: measureMaskLines(bodyMask, originalWidth, pose),
  };
}

async function segmentImage(imageUri: string, pose?: SegmentationPoseDebug): Promise<SegmentationImageDebug> {
  const model = await getModel();
  const { inputBuffer, originalWidth, originalHeight } = await preprocessForSegmentation(imageUri);
  const outputs = await model.run([inputBuffer]);
  if (!outputs?.length) {
    throw new Error('Segmentation model produced no output.');
  }
  return createClassDebug(outputs[0], originalWidth, originalHeight, pose);
}

export async function analyzeBodySegmentation(params: {
  frontImageUri: string;
  sideImageUri: string;
  frontPose?: SegmentationPoseDebug;
  sidePose?: SegmentationPoseDebug;
}): Promise<BodySegmentationDebug> {
  const [front, side] = await Promise.all([
    segmentImage(params.frontImageUri, params.frontPose),
    segmentImage(params.sideImageUri, params.sidePose),
  ]);
  return {
    model: MODEL_NAME,
    input: 'FLOAT32 [1, 256, 256, 3], RGB normalized 0..1',
    output: 'FLOAT32 [1, 256, 256, 1], person confidence (thresholded at 0.5)',
    front,
    side,
  };
}
