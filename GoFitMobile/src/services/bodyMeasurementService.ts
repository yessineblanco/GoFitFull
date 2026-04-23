import { Image, Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { decode as decodeJpeg } from 'jpeg-js';
import { VALIDATION_LIMITS } from '@/constants';
import type { MediaPipePoseLandmark, MediaPipePoseResult } from '../../modules/mediapipe-pose-landmarker';

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

export type PoseModelSource = 'movenet' | 'mediapipe';

export type MeasurementMediaPipeDebug = {
  front?: MediaPipePoseResult;
  side?: MediaPipePoseResult;
  error?: string;
};

export type MeasurementDebugKeypoint = { y: number; x: number; score: number };

export type MeasurementDebugImage = {
  originalWidth: number;
  originalHeight: number;
  keypoints: MeasurementDebugKeypoint[];
  source?: PoseModelSource;
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
  frontPoseModel?: PoseModelSource;
  sidePoseModel?: PoseModelSource;
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
  /** Which depth preset the service used (sex-aware statistical model). */
  depthModel?: 'statistical-male' | 'statistical-female' | 'statistical-neutral';
  chestDepthOverShoulder?: number;
  abdomenDepthOverChest?: number;
  /**
   * Where the final chest/waist depth came from. `statistical` = priors only
   * (default). `segmentation` = segmentation mask depth passed all health +
   * sanity gates and overrode the priors for this scan.
   */
  depthSource?: 'statistical' | 'segmentation';
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
  mediaPipe?: MeasurementMediaPipeDebug;
  personHeightPx?: number;
  scaleCmPerPx?: number;
  heightSpanFrac?: number;
  formula?: MeasurementDebugFormula;
  featureVector?: MeasurementFeatureVector;
  qualityIssues?: string[];
  failedChecks?: string[];
};

export type MeasurementCaptureValidation = {
  ok: boolean;
  issues: string[];
};

type Keypoint = MeasurementDebugKeypoint;
type PoseRun = {
  keypoints: Keypoint[];
  originalWidth: number;
  originalHeight: number;
  source: PoseModelSource;
  mediaPipe?: MediaPipePoseResult;
};
type MediaPipePoseLandmarkerModuleShape = {
  analyzePoseFromImage(uri: string): Promise<MediaPipePoseResult>;
};
type MediaPipePoseLandmarkerExports = {
  default?: MediaPipePoseLandmarkerModuleShape;
  isMediaPipePoseLandmarkerAvailable?: boolean;
};
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

async function runMoveNet(imageUri: string): Promise<PoseRun> {
  const model = await getModel();
  const { inputBuffer, originalWidth, originalHeight } = await preprocessForModel(imageUri);
  const outputs = await model.run([inputBuffer]);
  if (!outputs?.length) {
    throw new Error('Model produced no output');
  }
  const keypoints = parseKeypointsAuto(outputs[0]);
  return { keypoints, originalWidth, originalHeight, source: 'movenet' };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function mediaPipeLandmarkScore(landmark?: MediaPipePoseLandmark): number {
  if (!landmark) return 0;
  if (typeof landmark.visibility === 'number' && Number.isFinite(landmark.visibility)) {
    return landmark.visibility;
  }
  if (typeof landmark.presence === 'number' && Number.isFinite(landmark.presence)) {
    return landmark.presence;
  }
  return 1;
}

function mediaPipeLandmarkToKeypoint(landmark?: MediaPipePoseLandmark): Keypoint {
  if (!landmark || !Number.isFinite(landmark.x) || !Number.isFinite(landmark.y)) {
    return { x: 0, y: 0, score: 0 };
  }
  return {
    x: clamp01(landmark.x),
    y: clamp01(landmark.y),
    score: mediaPipeLandmarkScore(landmark),
  };
}

function averageMediaPipeLandmarks(landmarks: Array<MediaPipePoseLandmark | undefined>): Keypoint {
  let sumX = 0;
  let sumY = 0;
  let sumScore = 0;
  let count = 0;
  for (const landmark of landmarks) {
    if (!landmark || !Number.isFinite(landmark.x) || !Number.isFinite(landmark.y)) continue;
    sumX += landmark.x;
    sumY += landmark.y;
    sumScore += mediaPipeLandmarkScore(landmark);
    count += 1;
  }
  if (!count) return { x: 0, y: 0, score: 0 };
  return {
    x: clamp01(sumX / count),
    y: clamp01(sumY / count),
    score: sumScore / count,
  };
}

function mediaPipeToKeypoints(result: MediaPipePoseResult): Keypoint[] {
  const landmarks = result.landmarks ?? [];
  return [
    mediaPipeLandmarkToKeypoint(landmarks[0]),
    averageMediaPipeLandmarks([landmarks[1], landmarks[2], landmarks[3]]),
    averageMediaPipeLandmarks([landmarks[4], landmarks[5], landmarks[6]]),
    mediaPipeLandmarkToKeypoint(landmarks[7]),
    mediaPipeLandmarkToKeypoint(landmarks[8]),
    mediaPipeLandmarkToKeypoint(landmarks[11]),
    mediaPipeLandmarkToKeypoint(landmarks[12]),
    mediaPipeLandmarkToKeypoint(landmarks[13]),
    mediaPipeLandmarkToKeypoint(landmarks[14]),
    mediaPipeLandmarkToKeypoint(landmarks[15]),
    mediaPipeLandmarkToKeypoint(landmarks[16]),
    mediaPipeLandmarkToKeypoint(landmarks[23]),
    mediaPipeLandmarkToKeypoint(landmarks[24]),
    mediaPipeLandmarkToKeypoint(landmarks[25]),
    mediaPipeLandmarkToKeypoint(landmarks[26]),
    mediaPipeLandmarkToKeypoint(landmarks[27]),
    mediaPipeLandmarkToKeypoint(landmarks[28]),
  ];
}

async function runMediaPipe(imageUri: string): Promise<PoseRun> {
  const mediaPipeModule = require('../../modules/mediapipe-pose-landmarker') as MediaPipePoseLandmarkerExports;
  if (!mediaPipeModule?.default?.analyzePoseFromImage || mediaPipeModule.isMediaPipePoseLandmarkerAvailable === false) {
    throw new Error('MediaPipe Pose Landmarker native module is unavailable in this build.');
  }
  const mediaPipe = await mediaPipeModule.default.analyzePoseFromImage(imageUri);
  if (!mediaPipe?.landmarks?.length) {
    throw new Error('MediaPipe Pose Landmarker produced no landmarks.');
  }
  return {
    keypoints: mediaPipeToKeypoints(mediaPipe),
    originalWidth: mediaPipe.imageWidth,
    originalHeight: mediaPipe.imageHeight,
    source: 'mediapipe',
    mediaPipe,
  };
}

function setMediaPipeDebugResult(debug: MeasurementDebug, phase: 'front' | 'side', result: MediaPipePoseResult) {
  debug.mediaPipe = {
    ...(debug.mediaPipe ?? {}),
    [phase]: result,
  };
}

function appendMediaPipeDebugError(debug: MeasurementDebug, phase: 'front' | 'side', error: string) {
  const nextError = `${phase}: ${error}`;
  debug.mediaPipe = {
    ...(debug.mediaPipe ?? {}),
    error: debug.mediaPipe?.error ? `${debug.mediaPipe.error} | ${nextError}` : nextError,
  };
}

async function runPrimaryPose(imageUri: string, debug: MeasurementDebug, phase: 'front' | 'side'): Promise<PoseRun> {
  if (Platform.OS !== 'android') {
    return runMoveNet(imageUri);
  }

  try {
    const mediaPipeRun = await runMediaPipe(imageUri);
    if (mediaPipeRun.mediaPipe) {
      setMediaPipeDebugResult(debug, phase, mediaPipeRun.mediaPipe);
    }
    return mediaPipeRun;
  } catch (error) {
    appendMediaPipeDebugError(debug, phase, error instanceof Error ? error.message : String(error));
    return runMoveNet(imageUri);
  }
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

function dedupeIssues(issues: string[]): string[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    if (seen.has(issue)) return false;
    seen.add(issue);
    return true;
  });
}

function debugImage(run: PoseRun): MeasurementDebugImage {
  return {
    originalWidth: run.originalWidth,
    originalHeight: run.originalHeight,
    keypoints: run.keypoints.map((k) => ({ x: round2(k.x), y: round2(k.y), score: round2(k.score) })),
    source: run.source,
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

  return dedupeIssues(issues);
}

function validateSidePoseQuality(
  sideKf: Keypoint[],
  frontShoulderPx: number,
  sideShoulderPx: number,
  sideHeightEst: { topNorm: number; bottomNorm: number } | null,
  sideHeightSpanFrac: number,
  sideScale: number,
): string[] {
  const issues: string[] = [];
  const body = keypointBounds(sideKf, [0, 5, 6, 11, 12, 15, 16]);

  if (!keypointOk(sideKf, 0, 0.18)) issues.push('In the side photo, keep your head visible.');
  if (!anyKeypointOk(sideKf, [5, 6], 0.14)) issues.push('In the side photo, keep your shoulder visible.');
  if (!anyKeypointOk(sideKf, [11, 12], 0.14)) issues.push('In the side photo, keep your hip visible.');
  if (!anyKeypointOk(sideKf, [15, 16], 0.16)) issues.push('In the side photo, show your feet.');
  if (!sideHeightEst) {
    issues.push('In the side photo, show your full body from head to feet.');
  }

  if (body && (body.centerX < 0.2 || body.centerX > 0.8)) {
    issues.push('In the side photo, move into the center of the frame.');
  }
  if (sideHeightEst && sideHeightEst.topNorm < 0.01) {
    issues.push('In the side photo, leave a little space above your head.');
  }
  if (sideHeightEst && sideHeightEst.bottomNorm > 0.99) {
    issues.push('In the side photo, step back so your feet are not cropped.');
  }
  if (sideHeightSpanFrac > 0 && sideHeightSpanFrac < 0.22) {
    issues.push('In the side photo, step closer so your body fills more of the frame.');
  }
  if (sideHeightSpanFrac > 0.92) {
    issues.push('In the side photo, step back so your full body fits comfortably.');
  }
  if (Number.isFinite(sideScale) && sideScale > 0.42) {
    issues.push('In the side photo, use portrait orientation, full body head-to-toe, and check that your profile height is correct.');
  }

  // At a true 90° profile, shoulder-depth is only ~30–45 % of shoulder-width
  // (anatomically ~15 cm depth vs ~42 cm width). Anything above ~0.60 means
  // the user is < 75° rotated and the projected "side shoulder" pixels pick
  // up side-to-side width, which inflates chest/waist/hip depths by double
  // digits. Reject below that threshold and force a retake.
  const shoulderRatio = frontShoulderPx > 1 ? sideShoulderPx / frontShoulderPx : 1;
  if (shoulderRatio > 0.6) {
    issues.push('Turn fully sideways for the second photo.');
  }

  return dedupeIssues(issues);
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

/**
 * Canonical biological-sex buckets used by the measurement model. Accepts
 * the same vocabulary as the user profile so the screen can forward
 * `profile.gender` directly. Non-binary / undisclosed values resolve to a
 * neutral preset halfway between the male and female presets.
 */
export type MeasurementSex = 'male' | 'female' | 'other' | 'prefer_not_to_say';

/**
 * Sex-aware anthropometric constants for deriving body depths from the
 * already-measured shoulder width. Values are averages of adult standing
 * anthropometry datasets (NHANES, CAESAR, WorldEngineer).
 *
 *   chestDepthOverShoulder  — chest depth (sternum → spine) / shoulder width
 *   abdomenDepthOverChest   — waist depth / chest depth (torso taper)
 *
 * The "neutral" preset sits at the midpoint of the male/female ratios so
 * users who haven't disclosed sex still get a sensible answer.
 */
const SEX_DEPTH_CONSTANTS: Record<
  'male' | 'female' | 'neutral',
  { chestDepthOverShoulder: number; abdomenDepthOverChest: number }
> = {
  male: { chestDepthOverShoulder: 0.54, abdomenDepthOverChest: 0.88 },
  female: { chestDepthOverShoulder: 0.5, abdomenDepthOverChest: 0.8 },
  neutral: { chestDepthOverShoulder: 0.52, abdomenDepthOverChest: 0.84 },
};

function resolveDepthPreset(sex?: MeasurementSex): {
  key: 'male' | 'female' | 'neutral';
  chestDepthOverShoulder: number;
  abdomenDepthOverChest: number;
} {
  const key = sex === 'male' ? 'male' : sex === 'female' ? 'female' : 'neutral';
  return { key, ...SEX_DEPTH_CONSTANTS[key] };
}

export async function validateMeasurementCapture(params: {
  imageUri: string;
  phase: 'front' | 'side';
  heightCm: number;
  frontImageUri?: string;
}): Promise<MeasurementCaptureValidation> {
  const { imageUri, phase, heightCm, frontImageUri } = params;

  if (phase === 'front') {
    const debug: MeasurementDebug = {};
    const front = await runPrimaryPose(imageUri, debug, 'front');
    const { keypoints, originalWidth, originalHeight } = front;
    const heightEst = estimatePersonHeightPx(keypoints, originalHeight);
    const personHeightPx = estimateScaleHeightPixels(keypoints, originalWidth, originalHeight);
    const heightSpanFrac = personHeightPx > 1 ? personHeightPx / Math.max(originalWidth, originalHeight) : 0;
    const scale = personHeightPx > 1 ? heightCm / personHeightPx : Number.NaN;
    const issues =
      personHeightPx <= 1 || !heightEst
        ? ['Stand farther away so your full body is visible.']
        : validateFrontPoseQuality(keypoints, heightEst, heightSpanFrac);
    if (Number.isFinite(scale) && scale > 0.42) {
      issues.push('Use portrait orientation, full body head-to-toe, and check that your profile height is correct.');
    }
    const nextIssues = dedupeIssues(issues);
    return { ok: nextIssues.length === 0, issues: nextIssues };
  }

  if (!frontImageUri) {
    return {
      ok: false,
      issues: ['Take the front photo first.'],
    };
  }

  const frontDebug: MeasurementDebug = {};
  const sideDebug: MeasurementDebug = {};
  const front = await runPrimaryPose(frontImageUri, frontDebug, 'front');
  const side = await runPrimaryPose(imageUri, sideDebug, 'side');
  const frontShoulderPx = shoulderSeparationPx(front.keypoints, front.originalWidth, front.originalHeight);
  const sideShoulderPx = shoulderSeparationPx(side.keypoints, side.originalWidth, side.originalHeight);
  const sideHeightEst = estimatePersonHeightPx(side.keypoints, side.originalHeight);
  const sidePersonHeightPx = estimateScaleHeightPixels(side.keypoints, side.originalWidth, side.originalHeight);
  const sideHeightSpanFrac = sidePersonHeightPx > 1 ? sidePersonHeightPx / Math.max(side.originalWidth, side.originalHeight) : 0;
  const sideScale = sidePersonHeightPx > 1 ? heightCm / sidePersonHeightPx : Number.NaN;
  const issues = validateSidePoseQuality(
    side.keypoints,
    frontShoulderPx,
    sideShoulderPx,
    sideHeightEst,
    sideHeightSpanFrac,
    sideScale,
  );
  return { ok: issues.length === 0, issues };
}

async function analyzeMeasurementsInner(params: {
  frontImageUri: string;
  sideImageUri: string;
  heightCm: number;
  sex?: MeasurementSex;
}): Promise<MeasurementResult> {
  const { frontImageUri, sideImageUri, heightCm, sex } = params;

  const debug: MeasurementDebug = {};
  const front = await runPrimaryPose(frontImageUri, debug, 'front');
  const { keypoints: kf, originalWidth: fw, originalHeight: fh } = front;
  debug.front = debugImage(front);
  const frontBody = keypointBounds(kf, CORE_FEATURE_KEYPOINTS);
  debug.featureVector = {
    version: 1,
    heightCm: round1(heightCm),
    frontPoseModel: front.source,
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
  // MediaPipe/MoveNet hip landmarks sit near the hip sockets (acetabulum),
  // which are narrower than the trochanteric hip breadth a tape measure would
  // follow. Empirical ratio across standing-anthropometry datasets is ~1.30–
  // 1.40×; use 1.35 so the draft hip width lands in a plausible range.
  const HIP_LANDMARK_TO_TROCHANTER = 1.35;
  const hipWidthCm = frontHipPx * scale * HIP_LANDMARK_TO_TROCHANTER;
  const waistWidthCm = hipWidthCm * 0.82;
  updateFeatureVector(debug, heightCm, {
    frontShoulderPx: round1(frontShoulderPx),
    frontHipPx: round1(frontHipPx),
    frontShoulderWidthCm: round1(shoulderWidthCm),
    frontHipWidthCm: round1(hipWidthCm),
    estimatedWaistWidthCm: round1(waistWidthCm),
  });

  const side = await runPrimaryPose(sideImageUri, debug, 'side');
  const { keypoints: ks, originalWidth: sw, originalHeight: sh } = side;
  debug.side = debugImage(side);

  const sideShoulderPx = shoulderSeparationPx(ks, sw, sh);
  const sideHeightEst = estimatePersonHeightPx(ks, sh);
  const sidePersonHeightPx = estimateScaleHeightPixels(ks, sw, sh);
  const sideHeightSpanFrac = sidePersonHeightPx > 1 ? sidePersonHeightPx / Math.max(sw, sh) : 0;
  const sideScale = sidePersonHeightPx > 1 ? heightCm / sidePersonHeightPx : Number.NaN;
  const sideBody = keypointBounds(ks, CORE_FEATURE_KEYPOINTS);
  updateFeatureVector(debug, heightCm, {
    sidePoseModel: side.source,
    sidePoseMeanScore: meanKeypointScore(ks),
    sideVisibleCoreKeypoints: visibleKeypointCount(ks),
    sideBodyCenterX: sideBody ? round2(sideBody.centerX) : undefined,
    sideShoulderPx: round1(sideShoulderPx),
    sideToFrontShoulderRatio: round2(sideShoulderPx / Math.max(frontShoulderPx, 1)),
  });
  const sideQualityIssues = validateSidePoseQuality(
    ks,
    frontShoulderPx,
    sideShoulderPx,
    sideHeightEst,
    sideHeightSpanFrac,
    sideScale,
  );
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

  // The earlier `sideShoulderPx * scale` formula mis-measured chest depth:
  // in a true 90° profile the two shoulder landmarks overlap so the pixel
  // distance approaches 0 (depth → ~15 cm, too small), and in a partial
  // rotation the distance explodes (depth → ~33 cm, too large). There's no
  // rotation angle where that distance equals anatomic chest depth.
  //
  // We now derive depth statistically from the (much more reliable) front
  // shoulder-width measurement, using sex-specific anthropometric constants.
  // The resulting depth is independent of how well the user rotated for the
  // side photo, so two scans of the same body now converge to the same
  // circumference regardless of small rotation differences.
  const depthPreset = resolveDepthPreset(sex);
  const chestDepthCm = shoulderWidthCm * depthPreset.chestDepthOverShoulder;
  const abdomenDepthCm = chestDepthCm * depthPreset.abdomenDepthOverChest;
  updateFeatureVector(debug, heightCm, {
    estimatedChestDepthCm: round1(chestDepthCm),
    estimatedAbdomenDepthCm: round1(abdomenDepthCm),
    depthModel:
      depthPreset.key === 'male'
        ? 'statistical-male'
        : depthPreset.key === 'female'
          ? 'statistical-female'
          : 'statistical-neutral',
    depthSource: 'statistical',
    chestDepthOverShoulder: round2(depthPreset.chestDepthOverShoulder),
    abdomenDepthOverChest: round2(depthPreset.abdomenDepthOverChest),
  });

  // Chest: approximate ellipse perimeter. Shoulder biacromial width is wider
  // than actual chest (under-armpit) width, so scale it down by ~0.88 before
  // using it as the ellipse's major axis.
  const chestWidthCm = shoulderWidthCm * 0.88;
  const chestCm = Math.PI * (chestWidthCm / 2 + chestDepthCm / 2);
  const waistCm = Math.PI * (waistWidthCm / 2 + abdomenDepthCm / 2);
  const hipCm = Math.PI * (hipWidthCm / 2 + (abdomenDepthCm * 0.95) / 2);
  // Shoulder circumference on a progress screen is a LINEAR across-shoulders
  // tape measurement, not a wrap-around circumference. Previously this used
  // π·(w/2)·1.15 which inflated 45 cm shoulders to 82 cm. Use the biacromial
  // width plus a small soft-tissue allowance (~2 %) instead.
  const shoulderCm = shoulderWidthCm * 1.02;
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

  // Composite detection/measurement quality score.
  //
  // Historically `confidence` was just the mean of the pose keypoint scores,
  // which meant a perfectly-detected pose on a cropped, tilted, or oddly-
  // framed photo still reported 1.0 and misled the user into trusting
  // unreliable measurements. The new score multiplies four independent
  // signals that each plateau at 1.0 for an ideal capture:
  //   * poseVisibility    — pose detector's own visibility (0..1)
  //   * heightSpanQuality — how well the body fills the frame vertically
  //   * sideGeometryQuality — whether the side view is a realistic profile
  //   * sanityFactor      — whether the raw measurements land in plausible
  //                         ranges (applied after sanity checks below).
  let confSum = 0;
  for (const i of CORE_FEATURE_KEYPOINTS) {
    confSum += kf[i]?.score ?? 0;
  }
  const poseVisibility = round2(confSum / CORE_FEATURE_KEYPOINTS.length);
  // Empirically, scans that fill ~70 % of the frame already produce stable
  // measurements (see log scans #5–#9). Saturating at 0.70 (instead of 0.85)
  // stops this factor from single-handedly dragging accurate scans below 0.5.
  // Floor raised from 0.40 → 0.55 so no single sub-signal can collapse the
  // composite score when the other two are strong.
  const heightSpanQuality = Math.max(0.55, Math.min(1, heightSpanFrac / 0.7));
  // Anatomical shoulder-depth:shoulder-width ≈ 0.30–0.45 for a true 90°
  // profile. `validateSidePoseQuality` already rejects anything above 0.60,
  // so by the time we reach here the capture is usable — but 0.25–0.55 is
  // ideal, and we give a light 30 % penalty outside that window.
  const sideShoulderRatio = sideShoulderPx / Math.max(frontShoulderPx, 1);
  // Floor matches heightSpanQuality — no single sub-signal should be able to
  // push the composite below ~0.5 on an otherwise valid scan.
  const sideGeometryQuality =
    sideShoulderRatio >= 0.25 && sideShoulderRatio <= 0.55 ? 1 : 0.8;
  let confidence = round2(poseVisibility * heightSpanQuality * sideGeometryQuality);

  let chestR = round1(chestCm);
  let waistR = round1(waistCm);
  let hipR = round1(hipCm);
  let shoulderR = round1(shoulderCm);

  const saneChest = chestR >= 60 && chestR <= 160;
  const saneWaist = waistR >= 50 && waistR <= 150;
  const saneHip = hipR >= 60 && hipR <= 160;
  const saneShoulder = shoulderR >= 30 && shoulderR <= 60;
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
  /**
   * User's biological sex from their profile. Used to pick anthropometric
   * depth constants — pass `undefined` / `'other'` / `'prefer_not_to_say'`
   * for the neutral preset.
   */
  sex?: MeasurementSex;
}): Promise<MeasurementResult> {
  try {
    return await analyzeMeasurementsInner(params);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const isNitro = raw.includes('NitroModules') || raw.includes('Nitro runtime');
    return measurementErrorResult(isNitro ? NITRO_NATIVE_MISSING : raw);
  }
}
