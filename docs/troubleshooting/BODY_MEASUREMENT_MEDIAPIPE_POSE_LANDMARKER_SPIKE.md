# Body Measurement MediaPipe Pose Landmarker Spike

## Purpose

Decide the next model stack for GoFit body measurements after phone testing showed that the current silhouette is hard to use and the current `selfie_multiclass_256x256.tflite` mask is not reliable enough.

This is a planning/spike document. It does not delete any existing model or replace production behavior yet.

## Decision

Use **MediaPipe Pose Landmarker Full** as the next candidate.

Test **MediaPipe Pose Landmarker Heavy** only if Full works and device performance is acceptable.

Do not continue treating `selfie_multiclass_256x256.tflite` as the final body silhouette model.

## Current Stack In The App

Current app code already has:

- `expo-camera` for photo capture.
- `react-native-fast-tflite` for raw TFLite inference.
- `movenet_lightning.tflite` for 17-keypoint pose detection.
- `selfie_multiclass_256x256.tflite` for experimental 6-class segmentation.
- JavaScript mask cleanup and draft circumference formulas.

Current weakness:

- MoveNet is acceptable for rough pose, but it only gives 17 2D keypoints.
- The selfie segmentation model is not a true full-body measurement model.
- The green body mask is unstable in real mirror/direct capture.
- Users are forced into repeated retakes when the model cannot produce a clean silhouette.

## Proposed Stack

```text
expo-camera photo
  -> native MediaPipe Pose Landmarker
  -> 33 pose landmarks
  -> world landmarks when available
  -> optional segmentation mask
  -> GoFit feature vector
  -> draft measurements + manual review
  -> saved progress
```

## Why This Is Better Than The Current Mask

MediaPipe Pose Landmarker is a full-body pose solution. It is a better fit for a fitness app than a selfie/background segmentation model.

Expected advantages:

- 33 landmarks instead of MoveNet's 17 landmarks.
- Better body coverage for fitness poses.
- Visibility/presence scores per landmark.
- Optional segmentation mask from the same pose pipeline.
- Better front/side pose quality checks.
- A stronger feature vector for the future statistical estimator.

What it will not solve alone:

- It will not produce true tape-measure circumferences by itself.
- It will not see the body under loose clothing.
- It will not perfectly solve mirror occlusion.
- It still needs validation and manual review.

## Integration Route

### Preferred route

Create a local Expo native module that wraps MediaPipe Tasks Vision on Android and iOS.

Reason:

- The project already uses an Expo dev client and has generated Android native code.
- Official MediaPipe Pose Landmarker support is native on Android and iOS.
- A thin native bridge is cleaner than trying to force MediaPipe Tasks through JavaScript.
- GoFit targets both Android and iOS, so this cannot ship as an Android-only feature.

Native module shape:

```text
GoFitMobile/modules/mediapipe-pose-landmarker/
  android/
    build.gradle
    src/main/java/expo/modules/mediapipeposelandmarker/
      MediaPipePoseLandmarkerModule.kt
  ios/
    MediaPipePoseLandmarkerModule.swift
    MediaPipePoseLandmarker.podspec
  src/
    MediaPipePoseLandmarker.ts
    MediaPipePoseLandmarker.types.ts
  expo-module.config.json
```

The module should expose one async function first:

```ts
analyzePoseFromImage(uri: string): Promise<MediaPipePoseResult>
```

Initial result type:

```ts
type MediaPipePoseResult = {
  imageWidth: number;
  imageHeight: number;
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number; presence?: number }>;
  worldLandmarks?: Array<{ x: number; y: number; z: number; visibility?: number; presence?: number }>;
  segmentationMask?: {
    width: number;
    height: number;
    valuesBase64?: string;
  };
  inferenceMs?: number;
};
```

### Platform requirement

The spike can be implemented and tested on Android first because the current local development device is Android, but the feature cannot be considered production-ready until the iOS bridge is implemented too.

Android path:

- Add the MediaPipe Tasks Vision Gradle dependency.
- Load `pose_landmarker_full.task` from the Android app assets.
- Convert a captured image URI into the MediaPipe image type.
- Return 33 landmarks and timing to TypeScript.

iOS path:

- Add the `MediaPipeTasksVision` pod to the module podspec.
- Bundle the same `pose_landmarker_full.task` model.
- Convert a captured image URI into a `UIImage` / `MPImage`.
- Return the same TypeScript result shape as Android.

### Why not a pure JS package first?

The current app already runs raw TFLite, but MediaPipe Pose Landmarker `.task` files include task-specific metadata and post-processing. Running the `.task` file through `react-native-fast-tflite` directly is unlikely to be as clean as using the official Tasks runtime.

The safest spike is the native Android bridge.

## Model Candidate

Start with:

- `pose_landmarker_full.task`

Then compare:

- `pose_landmarker_heavy.task`

Only keep Heavy if:

- results are visibly better,
- inference time is acceptable on the target Android phone,
- app memory stays stable.

## Product Behavior During The Spike

Do not make users fail repeatedly.

During this migration:

- Keep editable review before saving.
- Treat AI values as draft estimates.
- Allow saving corrected values when pose is readable.
- Block only truly unusable captures:
  - no person detected
  - head/feet missing
  - impossible scale
  - no front or side body pose

This keeps the feature useful while the model improves.

## Implementation Plan

- [x] Decide that the current selfie segmentation model is not satisfying enough.
- [x] Choose MediaPipe Pose Landmarker Full as the next candidate.
- [x] Create local Expo native module scaffold for Android.
- [x] Add MediaPipe Tasks Vision Android dependency.
- [ ] Add MediaPipeTasksVision iOS pod dependency.
- [x] Bundle `pose_landmarker_full.task`.
- [x] Add `analyzePoseFromImage(uri)` native function on Android.
- [x] Return 33 landmarks and inference time to TypeScript on Android.
- [x] Compile-check the Android bridge with a local JDK.
- [ ] Implement the same `analyzePoseFromImage(uri)` function on iOS.
- [x] Render a MediaPipe debug overlay beside the existing MoveNet overlay.
- [ ] Compare on the same real front/side photos:
  - MoveNet 17 keypoints
  - MediaPipe 33 landmarks
  - current selfie segmentation mask
- [ ] Only after comparison, decide whether to replace MoveNet and/or the current segmentation mask.

## Success Criteria For The Spike

The Android part of the spike succeeds if:

- Android build succeeds in the Expo dev client.
- A real captured image returns 33 landmarks.
- Inference is stable on repeated scans.
- Landmarks match the body better than the current MoveNet overlay.
- The result is good enough to improve capture validation and feature extraction.

The full cross-platform spike succeeds only when:

- Android and iOS both build.
- Android and iOS both return the same TypeScript result shape.
- A missing native implementation never silently falls back to bad measurements.

The spike fails if:

- the native dependency cannot build cleanly with Expo SDK 54 / RN 0.81,
- inference is too slow or unstable,
- segmentation masks are not exposed or are too low quality,
- the bridge adds too much native maintenance for the benefit.

## Risks

- This can be Android-first for local testing, but iOS needs a Swift bridge before production.
- Native module scaffolding touches build files and requires a dev-client rebuild.
- MediaPipe Tasks may increase app size.
- Segmentation mask output may still not be accurate enough for circumference.
- The measurement formula still needs a statistical estimator later.

## Sources

- MediaPipe Pose Landmarker overview: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
- MediaPipe Pose Landmarker Android guide: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/android
- MediaPipe Pose Landmarker iOS guide: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/ios
- MediaPipe Tasks Vision package reference for Android dependency direction: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/android#dependencies
- Expo native module guidance: use `create-expo-module` local module scaffold before implementing native bridge.

## Next Code Step

Scaffold status:

- Created local Expo module scaffold at `GoFitMobile/modules/mediapipe-pose-landmarker`.
- Expo generated the folder as `modules/my-module` in CI mode, then it was renamed inside the workspace to `modules/mediapipe-pose-landmarker`.
- User approved deleting unused generated boilerplate.
- Removed generated native view/web boilerplate.
- Kept both platform module files:
  - Android: `MediaPipePoseLandmarkerModule.kt`
  - iOS: `MediaPipePoseLandmarkerModule.swift`
- Replaced generated demo API with a module-only `analyzePoseFromImage(uri)` placeholder on both platforms.

Current implementation status:

- Android dependency added: `com.google.mediapipe:tasks-vision:0.10.33`.
- Android EXIF dependency added: `androidx.exifinterface:exifinterface:1.4.1`.
- Android model bundled at `GoFitMobile/modules/mediapipe-pose-landmarker/android/src/main/assets/pose_landmarker_full.task`.
- Android native bridge now decodes image URIs, applies EXIF rotation, runs `PoseLandmarker.detect(...)`, and returns:
  - rotated image width/height
  - pose count
  - 33 normalized landmarks
  - 33 world landmarks when MediaPipe returns them
  - inference time in milliseconds
- The bridge intentionally does not expose MediaPipe segmentation masks yet. First prove landmark stability, then add mask output if it is useful.

Build setup completed:

- Installed Microsoft OpenJDK 17.
- Installed Android SDK command-line tools.
- Installed Android SDK Platform 36, Build-Tools 36.0.0, and Platform-Tools.
- Gradle auto-installed the NDK packages it needed during the compile check.
- Added local SDK pointer at `GoFitMobile/android/local.properties`.
- Saved `JAVA_HOME` and `ANDROID_HOME` for future terminals.
- Verified `:mediapipe-pose-landmarker:compileDebugKotlin` succeeds.

Next implementation step:

- Compare MediaPipe 33-landmark output against the existing MoveNet overlay on the same front/side photos.
- Check whether MediaPipe stays stable on mirror captures, direct front captures, and direct side captures.
- Then implement the matching iOS bridge before production replacement.

Debug overlay wiring completed:

- `BodyMeasurementScreen.tsx` now lazy-loads the local MediaPipe module only when the Android debug path runs.
- The same front and side images are sent to `analyzePoseFromImage(uri)`.
- The debug drawer now shows:
  - front and side landmark counts
  - average landmark visibility score
  - visible core body points
  - native inference time
  - separate MediaPipe front and side overlays
- This is intentionally comparison-only. It does not replace MoveNet, segmentation, saved measurements, confidence scoring, or save gating.

Original scaffold command used:

```bash
npx create-expo-module@latest --local --name MediaPipePoseLandmarker --description "GoFit MediaPipe pose landmarker bridge" --package expo.modules.mediapipeposelandmarker
```

Do not ship this feature as Android-only. Android can land first as a spike, but iOS must be implemented before production replacement.
