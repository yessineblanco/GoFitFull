import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { decode as decodeJpeg } from 'jpeg-js';
import { VALIDATION_LIMITS } from '@/constants';

export type MeasurementResult = {
  chest_cm: number;
  waist_cm: number;
  hip_cm: number;
  shoulder_cm: number;
  confidence: number;
  error?: string;
  qualityIssues?: string[];
  debug?: MeasurementDebug;
};

export type MeasurementDebugKeypoint = { y: number; x: number; score: number };

export type MeasurementDebugImage = {
  originalWidth: number;
  originalHeight: number;
  keypoints: MeasurementDebugKeypoint[];
};

export type MeasurementDebugFormula = {
  frontShoulderPx?: number;
  frontHipPx?: number;
  sideShoulderPx?: number;
  shoulderWidthCm?: number;
  hipWidthCm?: number;
  waistWidthCm?: number;
  chestDepthCm?: number;
  abdomenDepthCm?: number;
  rawChestCm?: number;
  rawWaistCm?: number;
  rawHipCm?: number;
  rawShoulderCm?: number;
};

export type MeasurementSegmentationFeatureVector = {
  model?: string;
  bodyClassIndex?: number;
  frontRawCoverage?: number;
  frontCleanCoverage?: number;
  sideRawCoverage?: number;
  sideCleanCoverage?: number;
  frontChestWidthCm?: number;
  frontWaistWidthCm?: number;
  frontHipWidthCm?: number;
  sideChestDepthCm?: number;
  sideWaistDepthCm?: number;
  sideHipDepthCm?: number;
  chestDepthToWidthRatio?: number;
  waistDepthToWidthRatio?: number;
  hipDepthToWidthRatio?: number;
};

export type MeasurementFeatureVector = {
  version: 1;
  heightCm: number;
  personHeightPx?: number;
  scaleCmPerPx?: number;
  heightSpanFrac?: number;
  frontPoseMeanScore?: number;
  sidePoseMeanScore?: number;
  frontVisibleCoreKeypoints?: number;
  sideVisibleCoreKeypoints?: number;
  frontBodyCenterX?: number;
  sideBodyCenterX?: number;
  frontBodyTopNorm?: number;
  frontBodyBottomNorm?: number;
  frontShoulderPx?: number;
  frontHipPx?: number;
  sideShoulderPx?: number;
  sideToFrontShoulderRatio?: number;
  frontShoulderWidthCm?: number;
  frontHipWidthCm?: number;
  estimatedWaistWidthCm?: number;
  estimatedChestDepthCm?: number;
  estimatedAbdomenDepthCm?: number;
  draftChestCm?: number;
  draftWaistCm?: number;
  draftHipCm?: number;
  draftShoulderCm?: number;
  confidence?: number;
  qualityIssues?: string[];
  failedChecks?: string[];
  segmentation?: MeasurementSegmentationFeatureVector;
};

export type MeasurementDebug = {
  front?: MeasurementDebugImage;
  side?: MeasurementDebugImage;
  personHeightPx?: number;
  scaleCmPerPx?: number;
  heightSpanFrac?: number;
  formula?: MeasurementDebugFormula;
  featureVector?: MeasurementFeatureVector;
  qualityIssues?: string[];
  failedChecks?: string[];
};

type Keypoint = MeasurementDebugKeypoint;
const CORE_FEATURE_KEYPOINTS = [0, 5, 6, 11, 12, 15, 16] as const;

/** Loaded model handle — keep local so we never import fast-tflite types (that can pull the module into the graph early). */
type LoadedTfliteModel = { run(inputs: ArrayBuffer[]): Promise<ArrayBuffer[]> };

const MODEL = require('../../assets/models/movenet_lightning.tflite');

let cachedModel: LoadedTfliteModel | null = null;

/** Shown when the native Nitro runtime is missing (Expo Go, or a dev build made without prebuild). */
const NITRO_NATIVE_MISSING =
  'On-device AI is not available in this install. Do not use Expo Go for this feature. From GoFitMobile run: npx expo prebuild --clean then npx expo run:android (or a new EAS development build). Then start Metro with: npx expo start --dev-client and open the GoFit app you installed — not Expo Go.';

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

/** Resize to 192×192 JPEG and build the UINT8 NHWC RGB tensor expected by the bundled MoveNet model. */
async function preprocessForModel(
  imageUri: string,
): Promise<{ inputBuffer: ArrayBuffer; originalWidth: number; originalHeight: number }> {
  const { width: originalWidth, height: originalHeight } = await getImageSize(imageUri);

  const manipulated = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 192, height: 192 } }],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
  );

  const jpegBytes = new Uint8Array(await new File(manipulated.uri).arrayBuffer());
  const decoded = decodeJpeg(jpegBytes, { useTArray: true });
  const { data, width, height } = decoded;

  const rgb = new Uint8Array(1 * width * height * 3);
  let o = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rgb[o++] = data[idx];
      rgb[o++] = data[idx + 1];
      rgb[o++] = data[idx + 2];
    }
  }

  return { inputBuffer: rgb.buffer, originalWidth, originalHeight };
}

/** Interleaved keypoints: some TFLite exports use [y,x,score] (TF Hub), others [x,y,score]. */
function parseKeypointsInterleaved(outputBuffer: ArrayBuffer, yFirst: boolean): Keypoint[] {
  const floats = new Float32Array(outputBuffer);
  const count = Math.min(17, Math.floor(floats.length / 3));
  const keypoints: Keypoint[] = [];
  for (let i = 0; i < count; i++) {
    const a = floats[i * 3];
    const b = floats[i * 3 + 1];
    keypoints.push({
      y: yFirst ? a : b,
      x: yFirst ? b : a,
      score: floats[i * 3 + 2],
    });
  }
  while (keypoints.length < 17) {
    keypoints.push({ y: 0, x: 0, score: 0 });
  }
  return keypoints;
}

/** If model outputs 0–192 instead of 0–1, scale to ~0–1 for geometry helpers. */
function keypointsTo01Space(kf: Keypoint[]): Keypoint[] {
  let m = 0;
  for (let i = 0; i < 17; i++) {
    const k = kf[i];
    m = Math.max(m, Math.abs(k.x), Math.abs(k.y));
  }
  if (m <= 1.05) return kf;
  const s = 1 / 192;
  return kf.map((k) => ({ x: k.x * s, y: k.y * s, score: k.score }));
}

/** Standing pose: head above hips above feet in image Y (origin top). */
function anatomicalScore(kf: Keypoint[]): number {
  const nose = kf[0];
  const hipY = (kf[11].y + kf[12].y) / 2;
  const ankleY = Math.max(kf[15].y, kf[16].y);
  let s = 0;
  if (nose.score >= 0.2 && kf[11].score >= 0.15 && nose.y < hipY - 0.02) s += 1;
  if (kf[11].score >= 0.15 && ankleY >= hipY - 0.05) s += 1;
  if (nose.score >= 0.2 && ankleY > nose.y + 0.12) s += 1;
  return s;
}

/** Pick [y,x,score] vs [x,y,score] using plausible span + anatomy + confidence. */
function parseKeypointsAuto(outputBuffer: ArrayBuffer): Keypoint[] {
  const yx = keypointsTo01Space(parseKeypointsInterleaved(outputBuffer, true));
  const xy = keypointsTo01Space(parseKeypointsInterleaved(outputBuffer, false));
  const scoreLayout = (kf: Keypoint[]) => {
    const h = estimatePersonHeightPx(kf, 1);
    if (!h) return -1;
    const span = h.bottomNorm - h.topNorm;
    if (span < 0.12 || span > 0.95) return -1;
    const conf =
      (kf[0]?.score ?? 0) +
      (kf[15]?.score ?? 0) +
      (kf[16]?.score ?? 0) +
      (kf[5]?.score ?? 0) +
      (kf[6]?.score ?? 0);
    const anatomy = anatomicalScore(kf);
    return span * 2.2 + conf * 0.18 + anatomy * 1.2;
  };
  const sy = scoreLayout(yx);
  const sx = scoreLayout(xy);
  const picked = sy < 0 && sx < 0 ? 'fallback-yx' : sx > sy ? 'xy' : 'yx';
  // #region agent log
  if (__DEV__) {
    console.log('[DEBUG edb295] parseKeypointsAuto', { sy, sx, picked });
  }
  // #endregion
  if (sy < 0 && sx < 0) return yx;
  return sx > sy ? xy : yx;
}

async function runMoveNet(imageUri: string): Promise<{ keypoints: Keypoint[]; originalWidth: number; originalHeight: number }> {
  const model = await getModel();
  const { inputBuffer, originalWidth, originalHeight } = await preprocessForModel(imageUri);
  const outputs = await model.run([inputBuffer]);
  if (!outputs?.length) {
    throw new Error('Model produced no output');
  }
  const keypoints = parseKeypointsAuto(outputs[0]);
  return { keypoints, originalWidth, originalHeight };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const SANITY_ERROR =
  'Measurements outside expected range — please retake with your full body in frame and even lighting. Mirror photos are okay when your whole body is visible, the phone is away from your torso, and your side photo is fully sideways.';

const EMPTY: MeasurementResult = {
  chest_cm: 0,
  waist_cm: 0,
  hip_cm: 0,
  shoulder_cm: 0,
  confidence: 0,
};

function measurementErrorResult(message: string): MeasurementResult {
  return { ...EMPTY, error: message };
}

function keypointOk(kf: Keypoint[], index: number, minScore = 0.18): boolean {
  const k = kf[index];
  return !!k && k.score >= minScore && k.x >= 0 && k.x <= 1 && k.y >= 0 && k.y <= 1;
}

function anyKeypointOk(kf: Keypoint[], indices: number[], minScore = 0.18): boolean {
  return indices.some((index) => keypointOk(kf, index, minScore));
}

function keypointBounds(kf: Keypoint[], indices: readonly number[], minScore = 0.12) {
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  let count = 0;
  for (const index of indices) {
    const k = kf[index];
    if (!k || k.score < minScore) continue;
    minX = Math.min(minX, k.x);
    maxX = Math.max(maxX, k.x);
    minY = Math.min(minY, k.y);
    maxY = Math.max(maxY, k.y);
    count += 1;
  }
  if (!count) return null;
  return { minX, maxX, minY, maxY, count, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
}

function poseQualityError(issues: string[]): string | undefined {
  if (!issues.length) return undefined;
  return `Retake needed: ${issues.join(' ')}`;
}

function debugImage(run: { keypoints: Keypoint[]; originalWidth: number; originalHeight: number }): MeasurementDebugImage {
  return {
    originalWidth: run.originalWidth,
    originalHeight: run.originalHeight,
    keypoints: run.keypoints.map((k) => ({ x: round2(k.x), y: round2(k.y), score: round2(k.score) })),
  };
}

function meanKeypointScore(kf: Keypoint[], indices = CORE_FEATURE_KEYPOINTS): number {
  let sum = 0;
  let count = 0;
  for (const index of indices) {
    const score = kf[index]?.score;
    if (score == null || !Number.isFinite(score)) continue;
    sum += score;
    count += 1;
  }
  return count ? round2(sum / count) : 0;
}

function visibleKeypointCount(kf: Keypoint[], indices = CORE_FEATURE_KEYPOINTS, minScore = 0.15): number {
  let count = 0;
  for (const index of indices) {
    if ((kf[index]?.score ?? 0) >= minScore) count += 1;
  }
  return count;
}

function assignFeatureQuality(
  debug: MeasurementDebug,
  next: Pick<MeasurementFeatureVector, 'confidence' | 'qualityIssues' | 'failedChecks'>,
) {
  if (!debug.featureVector) return;
  debug.featureVector = {
    ...debug.featureVector,
    ...next,
  };
}

function updateFeatureVector(debug: MeasurementDebug, heightCm: number, next: Partial<MeasurementFeatureVector>) {
  debug.featureVector = {
    version: 1,
    heightCm: round1(heightCm),
    ...(debug.featureVector ?? {}),
    ...next,
  };
}

/** MoveNet y is top=0. Use head top → ankles; also bbox of core joints so EXIF / rotation mismatches don’t shrink height. */
function estimatePersonHeightPx(kf: Keypoint[], fh: number): { px: number; topNorm: number; bottomNorm: number } | null {
  const headIdx = [0, 1, 2] as const;
  let topNorm = 1;
  let anyHead = false;
  for (const i of headIdx) {
    const k = kf[i];
    if (k.score >= 0.25 && k.y < topNorm) {
      topNorm = k.y;
      anyHead = true;
    }
  }
  if (!anyHead && kf[0].score > 0) {
    topNorm = kf[0].y;
    anyHead = true;
  }
  if (!anyHead) return null;

  const la = kf[15];
  const ra = kf[16];
  let bottomNorm = 0;
  if (la.score >= 0.25 && ra.score >= 0.25) {
    bottomNorm = Math.max(la.y, ra.y);
  } else if (la.score >= ra.score && la.score >= 0.2) {
    bottomNorm = la.y;
  } else if (ra.score >= 0.2) {
    bottomNorm = ra.y;
  } else {
    bottomNorm = Math.max(la.y, ra.y);
  }

  const linePx = bottomNorm * fh - topNorm * fh;
  return { px: linePx, topNorm, bottomNorm };
}

/**
 * Pixel extent used for height scaling: max of nose–ankle line (Y) and tight bbox of torso+feet (handles sideways metadata vs upright subject).
 */
function estimateScaleHeightPixels(kf: Keypoint[], fw: number, fh: number): number {
  const est = estimatePersonHeightPx(kf, fh);
  if (!est) return 0;
  const linePx = Math.max(est.px, 1);

  const idx = [0, 5, 6, 11, 12, 15, 16] as const;
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  let any = false;
  for (const i of idx) {
    const k = kf[i];
    if (k.score < 0.12) continue;
    any = true;
    minX = Math.min(minX, k.x);
    maxX = Math.max(maxX, k.x);
    minY = Math.min(minY, k.y);
    maxY = Math.max(maxY, k.y);
  }
  if (!any) return linePx;
  const boxPx = Math.max((maxX - minX) * fw, (maxY - minY) * fh, 1);
  return Math.max(linePx, boxPx);
}

function validateFrontPoseQuality(kf: Keypoint[], heightEst: { topNorm: number; bottomNorm: number }, heightSpanFrac: number): string[] {
  const issues: string[] = [];
  const body = keypointBounds(kf, [0, 5, 6, 11, 12, 15, 16]);

  if (!keypointOk(kf, 0, 0.2)) issues.push('Keep your head visible.');
  if (!keypointOk(kf, 5, 0.16) || !keypointOk(kf, 6, 0.16)) issues.push('Face the camera so both shoulders are visible.');
  if (!keypointOk(kf, 11, 0.16) || !keypointOk(kf, 12, 0.16)) issues.push('Keep your hips visible.');
  if (!anyKeypointOk(kf, [15, 16], 0.18)) issues.push('Show your feet in the frame.');

  if (body && (body.centerX < 0.24 || body.centerX > 0.76)) {
    issues.push('Move into the center of the frame.');
  }
  if (heightEst.topNorm < 0.01) {
    issues.push('Leave a little space above your head.');
  }
  if (heightEst.bottomNorm > 0.99) {
    issues.push('Step back so your feet are not cropped.');
  }
  if (heightSpanFrac < 0.22) {
    issues.push('Step closer so your body fills more of the frame.');
  }
  if (heightSpanFrac > 0.92) {
    issues.push('Step back so your full body fits comfortably.');
  }

  return issues;
}

function validateSidePoseQuality(frontKf: Keypoint[], sideKf: Keypoint[], frontShoulderPx: number, sideShoulderPx: number): string[] {
  const issues: string[] = [];
  const body = keypointBounds(sideKf, [0, 5, 6, 11, 12, 15, 16]);

  if (!keypointOk(sideKf, 0, 0.18)) issues.push('In the side photo, keep your head visible.');
  if (!anyKeypointOk(sideKf, [5, 6], 0.14)) issues.push('In the side photo, keep your shoulder visible.');
  if (!anyKeypointOk(sideKf, [11, 12], 0.14)) issues.push('In the side photo, keep your hip visible.');
  if (!anyKeypointOk(sideKf, [15, 16], 0.16)) issues.push('In the side photo, show your feet.');

  if (body && (body.centerX < 0.2 || body.centerX > 0.8)) {
    issues.push('In the side photo, move into the center of the frame.');
  }

  const shoulderRatio = frontShoulderPx > 1 ? sideShoulderPx / frontShoulderPx : 1;
  if (shoulderRatio > 0.95) {
    issues.push('Turn fully sideways for the second photo.');
  }

  return issues;
}

function shoulderSeparationPx(kf: Keypoint[], fw: number, fh: number): number {
  const ls = kf[5];
  const rs = kf[6];
  const dx = Math.abs(ls.x - rs.x) * fw;
  const dy = Math.abs(ls.y - rs.y) * fh;
  return Math.max(dx, dy, 1);
}

function hipSeparationPx(kf: Keypoint[], fw: number, fh: number): number {
  const lh = kf[11];
  const rh = kf[12];
  const dx = Math.abs(lh.x - rh.x) * fw;
  const dy = Math.abs(lh.y - rh.y) * fh;
  return Math.max(dx, dy, 1);
}

async function analyzeMeasurementsInner(params: {
  frontImageUri: string;
  sideImageUri: string;
  heightCm: number;
}): Promise<MeasurementResult> {
  const { frontImageUri, sideImageUri, heightCm } = params;

  const front = await runMoveNet(frontImageUri);
  const { keypoints: kf, originalWidth: fw, originalHeight: fh } = front;
  const debug: MeasurementDebug = {
    front: debugImage(front),
  };
  const frontBody = keypointBounds(kf, CORE_FEATURE_KEYPOINTS);
  debug.featureVector = {
    version: 1,
    heightCm: round1(heightCm),
    frontPoseMeanScore: meanKeypointScore(kf),
    frontVisibleCoreKeypoints: visibleKeypointCount(kf),
    frontBodyCenterX: frontBody ? round2(frontBody.centerX) : undefined,
    frontBodyTopNorm: frontBody ? round2(frontBody.minY) : undefined,
    frontBodyBottomNorm: frontBody ? round2(frontBody.maxY) : undefined,
  };

  const heightEst = estimatePersonHeightPx(kf, fh);
  const personHeightPx = estimateScaleHeightPixels(kf, fw, fh);
  debug.personHeightPx = round1(personHeightPx);

  if (personHeightPx <= 1 || !heightEst) {
    const qualityIssues = ['Stand farther away so your full body is visible.'];
    debug.qualityIssues = qualityIssues;
    assignFeatureQuality(debug, { confidence: 0, qualityIssues });
    return {
      chest_cm: 0,
      waist_cm: 0,
      hip_cm: 0,
      shoulder_cm: 0,
      confidence: 0,
      error: 'Could not estimate body height from the front photo. Stand farther away so your full body is visible.',
      qualityIssues,
      debug,
    };
  }

  const scale = heightCm / personHeightPx;
  const longEdge = Math.max(fw, fh);
  const heightSpanFrac = personHeightPx / longEdge;
  debug.scaleCmPerPx = round2(scale);
  debug.heightSpanFrac = round2(heightSpanFrac);
  updateFeatureVector(debug, heightCm, {
    personHeightPx: round1(personHeightPx),
    scaleCmPerPx: round2(scale),
    heightSpanFrac: round2(heightSpanFrac),
  });
  /** Normalized span vs long image edge (robust to width/height vs rotation). */
  if (heightSpanFrac < 0.14) {
    const qualityIssues = ['Step back so head-to-feet uses more of the frame, or retake with full body visible.'];
    debug.qualityIssues = qualityIssues;
    assignFeatureQuality(debug, { confidence: 0, qualityIssues });
    return {
      chest_cm: 0,
      waist_cm: 0,
      hip_cm: 0,
      shoulder_cm: 0,
      confidence: 0,
      error:
        'Body height in the photo looks too small — step back so head-to-feet uses more of the frame, or retake with full body visible.',
    };
  }
  /** cm/px — typical phone full-body ~0.06–0.35; higher usually means bad pose scale. */
  if (scale > 0.42) {
    const qualityIssues = ['Use portrait orientation, full body head-to-toe, and check that your profile height is correct.'];
    debug.qualityIssues = qualityIssues;
    assignFeatureQuality(debug, { confidence: 0, qualityIssues });
    return {
      chest_cm: 0,
      waist_cm: 0,
      hip_cm: 0,
      shoulder_cm: 0,
      confidence: 0,
      error:
        'Could not reliably match your profile height to this photo. Use portrait orientation, full body head-to-toe, and even lighting. Check that your profile height is correct (cm).',
    };
  }

  const frontQualityIssues = validateFrontPoseQuality(kf, heightEst, heightSpanFrac);
  if (frontQualityIssues.length) {
    debug.qualityIssues = frontQualityIssues;
    assignFeatureQuality(debug, { confidence: 0, qualityIssues: frontQualityIssues });
    return {
      chest_cm: 0,
      waist_cm: 0,
      hip_cm: 0,
      shoulder_cm: 0,
      confidence: 0,
      error: poseQualityError(frontQualityIssues),
      qualityIssues: frontQualityIssues,
      debug,
    };
  }

  const frontShoulderPx = shoulderSeparationPx(kf, fw, fh);
  const frontHipPx = hipSeparationPx(kf, fw, fh);
  const shoulderWidthCm = frontShoulderPx * scale;
  const hipWidthCm = frontHipPx * scale;
  const waistWidthCm = hipWidthCm * 0.82;
  updateFeatureVector(debug, heightCm, {
    frontShoulderPx: round1(frontShoulderPx),
    frontHipPx: round1(frontHipPx),
    frontShoulderWidthCm: round1(shoulderWidthCm),
    frontHipWidthCm: round1(hipWidthCm),
    estimatedWaistWidthCm: round1(waistWidthCm),
  });

  const side = await runMoveNet(sideImageUri);
  const { keypoints: ks, originalWidth: sw, originalHeight: sh } = side;
  debug.side = debugImage(side);

  const sideShoulderPx = shoulderSeparationPx(ks, sw, sh);
  const sideBody = keypointBounds(ks, CORE_FEATURE_KEYPOINTS);
  updateFeatureVector(debug, heightCm, {
    sidePoseMeanScore: meanKeypointScore(ks),
    sideVisibleCoreKeypoints: visibleKeypointCount(ks),
    sideBodyCenterX: sideBody ? round2(sideBody.centerX) : undefined,
    sideShoulderPx: round1(sideShoulderPx),
    sideToFrontShoulderRatio: round2(sideShoulderPx / Math.max(frontShoulderPx, 1)),
  });
  const sideQualityIssues = validateSidePoseQuality(kf, ks, frontShoulderPx, sideShoulderPx);
  if (sideQualityIssues.length) {
    debug.qualityIssues = sideQualityIssues;
    assignFeatureQuality(debug, { confidence: 0, qualityIssues: sideQualityIssues });
    return {
      chest_cm: 0,
      waist_cm: 0,
      hip_cm: 0,
      shoulder_cm: 0,
      confidence: 0,
      error: poseQualityError(sideQualityIssues),
      qualityIssues: sideQualityIssues,
      debug,
    };
  }

  const chestDepthCm = sideShoulderPx * scale;
  const abdomenDepthCm = chestDepthCm * 0.9;
  updateFeatureVector(debug, heightCm, {
    estimatedChestDepthCm: round1(chestDepthCm),
    estimatedAbdomenDepthCm: round1(abdomenDepthCm),
  });

  const chestCm = Math.PI * (shoulderWidthCm / 2 + chestDepthCm / 2);
  const waistCm = Math.PI * (waistWidthCm / 2 + abdomenDepthCm / 2);
  const hipCm = Math.PI * (hipWidthCm / 2 + (abdomenDepthCm * 0.95) / 2);
  const shoulderCm = Math.PI * (shoulderWidthCm / 2) * 1.15;
  debug.formula = {
    frontShoulderPx: round1(frontShoulderPx),
    frontHipPx: round1(frontHipPx),
    sideShoulderPx: round1(sideShoulderPx),
    shoulderWidthCm: round1(shoulderWidthCm),
    hipWidthCm: round1(hipWidthCm),
    waistWidthCm: round1(waistWidthCm),
    chestDepthCm: round1(chestDepthCm),
    abdomenDepthCm: round1(abdomenDepthCm),
    rawChestCm: round1(chestCm),
    rawWaistCm: round1(waistCm),
    rawHipCm: round1(hipCm),
    rawShoulderCm: round1(shoulderCm),
  };
  updateFeatureVector(debug, heightCm, {
    draftChestCm: round1(chestCm),
    draftWaistCm: round1(waistCm),
    draftHipCm: round1(hipCm),
    draftShoulderCm: round1(shoulderCm),
  });

  let confSum = 0;
  for (const i of CORE_FEATURE_KEYPOINTS) {
    confSum += kf[i]?.score ?? 0;
  }
  let confidence = round2(confSum / CORE_FEATURE_KEYPOINTS.length);

  let chestR = round1(chestCm);
  let waistR = round1(waistCm);
  let hipR = round1(hipCm);
  let shoulderR = round1(shoulderCm);

  const saneChest = chestR >= 60 && chestR <= 160;
  const saneWaist = waistR >= 50 && waistR <= 150;
  const saneHip = hipR >= 60 && hipR <= 160;
  const saneShoulder = shoulderR >= 30 && shoulderR <= 80;
  /** Must match profile/editor limits — DB allows 100–250 cm; old 140–220 zeroed valid users. */
  const saneHeight =
    heightCm >= VALIDATION_LIMITS.HEIGHT_MIN_CM && heightCm <= VALIDATION_LIMITS.HEIGHT_MAX_CM;

  const failedChecks = [
    !saneChest ? 'chest' : null,
    !saneWaist ? 'waist' : null,
    !saneHip ? 'hip' : null,
    !saneShoulder ? 'shoulder' : null,
    !saneHeight ? 'heightCm' : null,
  ].filter(Boolean);
  debug.failedChecks = failedChecks as string[];
  assignFeatureQuality(debug, { confidence, failedChecks: debug.failedChecks });
  // #region agent log
  if (__DEV__) {
    console.log('[DEBUG edb295] pre-sanity', {
      heightCm,
      fw,
      fh,
      personHeightPx,
      scale,
      heightSpanFrac,
      shoulderWidthCm,
      hipWidthCm,
      waistWidthCm,
      chestDepthCm,
      abdomenDepthCm,
      chestR,
      waistR,
      hipR,
      shoulderR,
      saneChest,
      saneWaist,
      saneHip,
      saneShoulder,
      saneHeight,
      failedChecks,
    });
  }
  // #endregion

  let error: string | undefined;
  if (!saneChest || !saneWaist || !saneHip || !saneShoulder || !saneHeight) {
    confidence = 0.3;
    error = SANITY_ERROR;
    assignFeatureQuality(debug, { confidence, failedChecks: debug.failedChecks });
    return {
      chest_cm: 0,
      waist_cm: 0,
      hip_cm: 0,
      shoulder_cm: 0,
      confidence,
      error,
      debug,
    };
  }

  return {
    chest_cm: chestR,
    waist_cm: waistR,
    hip_cm: hipR,
    shoulder_cm: shoulderR,
    confidence,
    error,
    debug,
  };
}

export async function analyzeMeasurements(params: {
  frontImageUri: string;
  sideImageUri: string;
  heightCm: number;
}): Promise<MeasurementResult> {
  try {
    return await analyzeMeasurementsInner(params);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const isNitro = raw.includes('NitroModules') || raw.includes('Nitro runtime');
    return measurementErrorResult(isNitro ? NITRO_NATIVE_MISSING : raw);
  }
}
