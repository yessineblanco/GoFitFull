import { NativeModule, requireOptionalNativeModule } from 'expo';

import { MediaPipePoseLandmarkerModuleEvents, MediaPipePoseResult } from './MediaPipePoseLandmarker.types';

declare class MediaPipePoseLandmarkerModule extends NativeModule<MediaPipePoseLandmarkerModuleEvents> {
  analyzePoseFromImage(uri: string): Promise<MediaPipePoseResult>;
}

const nativeModule = requireOptionalNativeModule<MediaPipePoseLandmarkerModule>('MediaPipePoseLandmarker');

export const isMediaPipePoseLandmarkerAvailable = nativeModule != null;

const MediaPipePoseLandmarker = {
  async analyzePoseFromImage(uri: string): Promise<MediaPipePoseResult> {
    if (!nativeModule) {
      throw new Error(
        'MediaPipePoseLandmarker native module is unavailable in this build. Rebuild the dev client after tracking the local module files in git.',
      );
    }
    return nativeModule.analyzePoseFromImage(uri);
  },
};

export default MediaPipePoseLandmarker;
