import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { decode as decodeJpeg } from 'jpeg-js';

export type MeasurementResult = {
  chest_cm: number;
  waist_cm: number;
  hip_cm: number;
  shoulder_cm: number;
  confidence: number;
  error?: string;
};

type Keypoint = { y: number; x: number; score: number };

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

/** Resize to 192×192 JPEG, build float32 NHWC tensor with RGB in 0–255; returns original image dimensions. */
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

  const floats = new Float32Array(1 * width * height * 3);
  let o = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      floats[o++] = data[idx];
      floats[o++] = data[idx + 1];
      floats[o++] = data[idx + 2];
    }
  }

  return { inputBuffer: floats.buffer, originalWidth, originalHeight };
}

function parseKeypoints(outputBuffer: ArrayBuffer): Keypoint[] {
  const floats = new Float32Array(outputBuffer);
  const count = Math.min(17, Math.floor(floats.length / 3));
  const keypoints: Keypoint[] = [];
  for (let i = 0; i < count; i++) {
    keypoints.push({
      y: floats[i * 3],
      x: floats[i * 3 + 1],
      score: floats[i * 3 + 2],
    });
  }
  while (keypoints.length < 17) {
    keypoints.push({ y: 0, x: 0, score: 0 });
  }
  return keypoints;
}

async function runMoveNet(imageUri: string): Promise<{ keypoints: Keypoint[]; originalWidth: number; originalHeight: number }> {
  const model = await getModel();
  const { inputBuffer, originalWidth, originalHeight } = await preprocessForModel(imageUri);
  const outputs = await model.run([inputBuffer]);
  if (!outputs?.length) {
    throw new Error('Model produced no output');
  }
  const keypoints = parseKeypoints(outputs[0]);
  return { keypoints, originalWidth, originalHeight };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const SANITY_ERROR =
  'Measurements outside expected range — please retake photos with your full body in frame and even lighting.';

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

async function analyzeMeasurementsInner(params: {
  frontImageUri: string;
  sideImageUri: string;
  heightCm: number;
}): Promise<MeasurementResult> {
  const { frontImageUri, sideImageUri, heightCm } = params;

  const front = await runMoveNet(frontImageUri);
  const { keypoints: kf, originalWidth: fw, originalHeight: fh } = front;

  const nose = kf[0];
  const leftAnkle = kf[15];
  const rightAnkle = kf[16];

  const noseYpx = nose.y * fh;
  const ankleYpx = (leftAnkle.y * fh + rightAnkle.y * fh) / 2;
  const personHeightPx = ankleYpx - noseYpx;

  if (personHeightPx <= 1) {
    return {
      chest_cm: 0,
      waist_cm: 0,
      hip_cm: 0,
      shoulder_cm: 0,
      confidence: 0,
      error: 'Could not estimate body height from the front photo. Stand farther away so your full body is visible.',
    };
  }

  const scale = heightCm / personHeightPx;

  const leftShoulderX = kf[5].x * fw;
  const rightShoulderX = kf[6].x * fw;
  const leftHipX = kf[11].x * fw;
  const rightHipX = kf[12].x * fw;

  const shoulderWidthCm = Math.abs(leftShoulderX - rightShoulderX) * scale;
  const hipWidthCm = Math.abs(leftHipX - rightHipX) * scale;
  const waistWidthCm = hipWidthCm * 0.82;

  const side = await runMoveNet(sideImageUri);
  const { keypoints: ks, originalWidth: sw } = side;

  const sideLeftShoulderX = ks[5].x * sw;
  const sideRightShoulderX = ks[6].x * sw;
  const chestDepthCm = Math.abs(sideLeftShoulderX - sideRightShoulderX) * scale;
  const abdomenDepthCm = chestDepthCm * 0.9;

  const chestCm = Math.PI * (shoulderWidthCm / 2 + chestDepthCm / 2);
  const waistCm = Math.PI * (waistWidthCm / 2 + abdomenDepthCm / 2);
  const hipCm = Math.PI * (hipWidthCm / 2 + (abdomenDepthCm * 0.95) / 2);
  const shoulderCm = Math.PI * (shoulderWidthCm / 2) * 1.15;

  const usedIdx = [0, 5, 6, 11, 12, 15, 16] as const;
  let confSum = 0;
  for (const i of usedIdx) {
    confSum += kf[i]?.score ?? 0;
  }
  let confidence = round2(confSum / usedIdx.length);

  let chestR = round1(chestCm);
  let waistR = round1(waistCm);
  let hipR = round1(hipCm);
  let shoulderR = round1(shoulderCm);

  const saneChest = chestR >= 60 && chestR <= 160;
  const saneWaist = waistR >= 50 && waistR <= 150;
  const saneHip = hipR >= 60 && hipR <= 160;
  const saneShoulder = shoulderR >= 30 && shoulderR <= 80;
  const saneHeight = heightCm >= 140 && heightCm <= 220;

  let error: string | undefined;
  if (!saneChest || !saneWaist || !saneHip || !saneShoulder || !saneHeight) {
    confidence = 0.3;
    error = SANITY_ERROR;
  }

  return {
    chest_cm: chestR,
    waist_cm: waistR,
    hip_cm: hipR,
    shoulder_cm: shoulderR,
    confidence,
    error,
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
