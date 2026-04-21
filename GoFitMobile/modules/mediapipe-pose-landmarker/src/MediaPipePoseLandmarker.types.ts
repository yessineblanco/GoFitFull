export type MediaPipePoseLandmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
};

export type MediaPipePoseSegmentationMask = {
  width: number;
  height: number;
  valuesBase64?: string;
};

export type MediaPipeImageSegmenterMask = {
  width: number;
  height: number;
  valuesBase64?: string;
};

export type MediaPipeImageSegmenterResult = {
  imageWidth: number;
  imageHeight: number;
  labels?: string[];
  qualityScores?: number[];
  confidenceMasks?: MediaPipeImageSegmenterMask[];
  categoryMask?: MediaPipeImageSegmenterMask;
  inferenceMs?: number;
};

export type MediaPipePoseResult = {
  imageWidth: number;
  imageHeight: number;
  landmarks: MediaPipePoseLandmark[];
  worldLandmarks?: MediaPipePoseLandmark[];
  segmentationMask?: MediaPipePoseSegmentationMask;
  inferenceMs?: number;
  poseCount?: number;
};

export type MediaPipePoseLandmarkerModuleEvents = Record<string, never>;
