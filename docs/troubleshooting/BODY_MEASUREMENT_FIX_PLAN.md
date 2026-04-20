# Body Measurement Fix Plan

## Goal

Make the body measurement feature stop producing impossible values, then move it toward a realistic camera-based measurement workflow.

The current implementation uses MoveNet keypoints and hand-written formulas. That is useful for pose detection, but it is not enough for true chest, waist, hip, and shoulder measurement. The first priority is to make the feature fail safely and reveal exactly where the pipeline breaks.

## Current Problem

Observed results:

- Failed scans show `0 cm` values.
- Bad scans can show impossible values such as `500+ cm` chest.
- The screen still allows saving failed or impossible results.
- Confidence can show `0.3` even when measurements are unusable.

Likely causes:

- The MoveNet TFLite input type may be wrong.
- Pose keypoints are being used as if they were body outline measurements.
- Side-photo depth estimation is unreliable.
- Capture validation is too weak.
- Failed measurement results are rendered like real measurement results.
- Debug network calls still exist in the measurement service.

## Rule For All Work

Every task should have a Markdown entry before or during implementation.

Use this file as the main checklist. If a task becomes large, create a separate Markdown file under `docs/troubleshooting/` or `docs/architecture/` and link it here.

## Phase 1: Stabilize The Existing Feature

Purpose: stop nonsense outputs and identify the exact failure point.

- [x] Confirm the TFLite model input tensor type and shape.
- [x] Confirm whether `movenet_lightning.tflite` expects `uint8` or `float32` input.
- [x] Fix preprocessing if the input buffer type is wrong.
- [x] Remove localhost debug `fetch()` calls from the production measurement service.
- [x] Add a structured local diagnostics object for each scan.
- [ ] Add debug logs for:
  - keypoint scores
  - selected keypoint layout
  - image dimensions
  - estimated person height in pixels
  - scale factor in cm/px
  - front shoulder width
  - front hip width
  - side depth estimate
  - failed sanity checks
- [x] Prevent saving when `result.error` exists.
- [x] Hide measurement values when analysis fails.
- [x] Prevent saving very low-confidence scans.
- [x] Show low-confidence scans as draft results, not trusted saved measurements.
- [x] Confirm decoded image channel stride is correct.
- [x] Add pose/keypoint debug overlay for front and side captures.
- [x] Replace failed result UI with a clear retake state.

Success criteria:

- The app never displays impossible values as valid measurements.
- The app never saves `0 cm` or out-of-range AI values.
- We can inspect why a scan failed.

## Phase 2: Add Capture Quality Gates

Purpose: prevent unusable photos before analysis.

Important finding from phone testing:

- If the capture guide is hard to follow, the model will keep failing even if the math improves.
- The old thin body outline is not friendly enough for real users.
- Capture UX must be improved before more estimator work.

Current task:

- Add first-pass pose quality gates using the existing MoveNet output before adding a heavier silhouette/segmentation model.
- Return specific retake reasons in the result/debug payload.
- Keep the gates conservative so usable scans are not rejected too aggressively.

- [ ] Add front-photo validation before capture.
- [ ] Add side-photo validation before capture.
- [x] Replace the hard-to-follow thin silhouette with a clearer safe-zone guide.
- [x] Add front/side specific capture prompts inside the camera view.
- [x] Require full body visibility:
  - head/nose visible
  - shoulders visible
  - hips visible
  - knees visible
  - ankles visible
- [x] Require minimum keypoint confidence.
- [x] Require person centered in frame.
- [x] Require person height to occupy a target range of the image.
- [ ] Detect cropped/too-close captures and mirror captures with bad geometry where possible.
- [x] Add user guidance messages:
  - `Step back`
  - `Move into the center`
  - `Show your feet`
  - `Turn sideways`
  - `Use fitted clothing`

Success criteria:

- Bad captures are blocked before measurement.
- The user gets specific instructions instead of generic failure text.
- The camera guide is easy to follow without reading the debug overlay.

## Phase 3: Replace Keypoint-Only Measurement Math

Purpose: move from pose estimation to body-outline measurement.

- [x] Choose a first person segmentation model candidate.
- [x] Inspect the first segmentation model input/output tensors.
- [x] Add a separate segmentation inference helper.
- [x] Render segmentation class candidates in the debug overlay.
- [x] Add debug-only Class 4 mask width/depth measurements.
- [x] Add first Class 4 mask cleanup pass.
- [x] Decide that the current selfie segmentation mask is not satisfying enough for production measurement.
- [x] Choose MediaPipe Pose Landmarker Full as the next model candidate.
- [x] Scaffold cross-platform MediaPipe Pose Landmarker native module.
- [x] Remove approved unused generated view/web boilerplate.
- [x] Implement Android MediaPipe Pose Landmarker native bridge.
- [x] Compile-check Android MediaPipe Pose Landmarker native bridge with a JDK.
- [x] Wire Android MediaPipe Pose Landmarker into the debug-only comparison overlay.
- [ ] Implement iOS MediaPipe Pose Landmarker native bridge.
- [ ] Test whether it can run on-device with acceptable performance.
- [ ] Extract a clean body silhouette mask from front and side photos.
- [ ] Use pose keypoints only to locate anatomical levels:
  - shoulder
  - chest
  - waist
  - hip
- [ ] Measure front widths from the silhouette mask.
- [ ] Measure side depths from the silhouette mask.
- [ ] Estimate circumferences using front width and side depth.
- [ ] Create confidence scoring based on:
  - pose confidence
  - segmentation quality
  - front/side consistency
  - plausible human ratios
  - height scale stability

Success criteria:

- Measurements are based on body outline, not only joint distance.
- Bad silhouette or inconsistent photos produce a failed scan, not fake numbers.

Research:

- [Body Measurement Segmentation Research](./BODY_MEASUREMENT_SEGMENTATION_RESEARCH.md)
- [Body Measurement MediaPipe Pose Landmarker Spike](./BODY_MEASUREMENT_MEDIAPIPE_POSE_LANDMARKER_SPIKE.md)

### Phase 3 Notes

#### 2026-04-19

Added first segmentation candidate:

- `GoFitMobile/assets/models/selfie_multiclass_256x256.tflite`

Confirmed by direct FlatBuffer inspection:

- File identifier: `TFL3`
- Model version: `3`
- File size: `16,371,837` bytes
- Input tensor: `input_29`
- Input shape: `[1, 256, 256, 3]`
- Input type: `FLOAT32`
- Output tensor: `Identity`
- Output shape: `[1, 256, 256, 6]`
- Output type: `FLOAT32`

Decision:

- This is good enough for the first free/on-device segmentation prototype.
- Because the output has 6 channels, the next code task is to run the model in a separate segmentation helper and render candidate class masks in the debug overlay before changing measurement formulas.
- Do not replace the current measurement math until the mask is visually confirmed on real front and side photos.

Implemented:

- Added `GoFitMobile/src/services/bodySegmentationService.ts`.
- Wired segmentation analysis into `BodyMeasurementScreen.tsx` after the existing pose measurement completes.
- The pose/keypoint measurement result remains the source of displayed and saved measurements.
- The debug drawer now shows all 6 segmentation output classes for both front and side photos.
- The sampled mask preview is intentionally diagnostic only; it does not affect confidence, save gating, or formulas yet.
- After the first phone test, Class 4 looked like the best full-body mask candidate.
- Added debug-only Class 4 scan lines for chest, waist, and hip on both front and side photos.
- The debug drawer now reports those mask widths/depths in image pixels and centimeters using the current height scale.
- Added first cleanup pass before measuring Class 4:
  - keep the largest connected Class 4 component
  - ignore smaller disconnected mask noise
  - select the continuous row segment nearest the torso center
  - show raw vs cleaned mask coverage and row segment count in the debug UI
- Phone testing found an important flaw: some mirror photos can look like a `Good scan` because MoveNet pose confidence is high, while direct side-profile photos can fail because the old keypoint formula treats side shoulder separation as body depth.
- Product decision: mirror photos must be supported because many gym users will take progress photos in a mirror. The app should reject bad geometry, phone/body occlusion, or unusable side poses, not mirrors as a category.
- Added a segmentation geometry warning:
  - compares cleaned side chest/waist depth against cleaned front chest/waist width
  - shows advisory warnings for mildly wide/thin side geometry
  - blocks saving only when side/front geometry is extreme enough to be clearly broken
  - prevents high pose confidence alone from producing a trusted `Good scan`
  - no longer frames mirrors as automatically invalid
- Added the first segmentation-based draft formula:
  - if cleaned front/side mask lines are available, chest/waist/hip are estimated from front width plus side depth
  - circumference uses an ellipse approximation from cleaned mask width/depth
  - this replaces the old side-shoulder-depth failure path for draft results
  - save gating still uses segmentation geometry warnings
- Added the first plausibility score layer:
  - suspicious but editable numbers become `Review carefully`
  - mild geometry issues stay `Usable estimate`
  - extreme geometry or impossible ratios remain `Retake needed`
  - save is blocked only for true blockers, not advisory review warnings
- Added the local Expo native module for MediaPipe Pose Landmarker:
  - Android uses `com.google.mediapipe:tasks-vision:0.10.33`
  - Android bundles `pose_landmarker_full.task`
  - Android `analyzePoseFromImage(uri)` decodes/rotates the photo and returns 33 landmarks, world landmarks, pose count, and inference time
  - iOS still has the placeholder bridge and must be implemented before production replacement
- Set up the local Android build environment:
  - installed Microsoft OpenJDK 17
  - installed Android SDK command-line tools
  - installed Android SDK Platform 36, Build-Tools 36.0.0, and Platform-Tools
  - Gradle auto-installed required NDK packages during verification
  - added local SDK pointer at `GoFitMobile/android/local.properties`
  - saved `JAVA_HOME` and `ANDROID_HOME` for future terminals
- Verified the Android bridge compiles:
  - `.\gradlew.bat :mediapipe-pose-landmarker:compileDebugKotlin`
- Wired the Android MediaPipe bridge into `BodyMeasurementScreen.tsx` as a debug-only comparison path:
  - runs on the same front/side photos after the existing MoveNet analysis
  - renders a separate MediaPipe Pose Landmarker diagnostics panel
  - shows front/side landmark counts, average visibility score, visible core points, and inference timing
  - draws a 33-landmark body overlay beside the existing MoveNet and segmentation debug views
  - does not change displayed measurements, saved measurements, confidence, or save gating yet

## Phase 4: Manual Correction And Trust UX

Purpose: make results useful even when AI is approximate.

Current task:

- Replace raw confidence-only UX with clear result states and save guidance.
- Keep numeric confidence visible as secondary detail.
- Make it explicit that values are estimates for progress tracking.

- [x] Add saved body measurement history/progress view.
- [x] Add result states:
  - success
  - low confidence
  - failed
- [x] Add manual edit fields for AI-generated measurements.
- [x] Save whether each value was AI-only or user-corrected.
- [x] Show confidence labels instead of only numeric confidence.
- [x] Add copy that says values are estimates for progress tracking.

Success criteria:

- Users can correct imperfect AI measurements.
- Saved data is trustworthy enough for progress history.

## Phase 5: Validation Set

Purpose: stop guessing and measure accuracy.

- [x] Create a small test protocol.
- [ ] Collect real tape measurements for test users:
  - chest
  - waist
  - hip
  - shoulder
- [ ] Capture front and side photos under good conditions.
- [ ] Capture bad-condition examples:
  - mirror selfie with phone covering torso
  - angled mirror/reflection distortion
  - cropped feet
  - loose clothes
  - bad lighting
  - too close
- [ ] Compare AI estimates to tape measurements.
- [ ] Track average error per measurement.

Protocol:

- [Body Measurement Validation Protocol](./BODY_MEASUREMENT_VALIDATION_PROTOCOL.md)

Target:

- Reject obviously bad photos.
- Keep controlled-capture error within a practical range for fitness progress tracking.
- Do not claim clinical or tailoring accuracy.

## Phase 6: Option B Research

Purpose: decide whether to build or integrate a true body measurement system.

- [x] Research the linked ACM paper direction for statistical body-measurement prediction.
- [ ] Research commercial body-scan SDKs.
- [ ] Research open-source server-side body model options.
- [ ] Decide whether the next production estimator should be:
  - local statistical regression
  - server-side body-shape model
  - commercial SDK
- [ ] Compare:
  - accuracy
  - cost
  - privacy requirements
  - on-device feasibility
  - implementation time
- [ ] Decide whether GoFit needs:
  - fitness progress estimates
  - clothing size recommendations
  - tailoring-grade measurements

Recommendation:

Keep the current free/on-device pose + segmentation flow as a feature extractor and draft fallback, but do not treat direct pixel circumference as the final solution. The next serious fix is a statistical estimator trained or calibrated from body features and validated measurements.

Research decision:

- [Body Measurement Statistical Model Plan](./BODY_MEASUREMENT_STATISTICAL_MODEL_PLAN.md)

## First Task To Do

Start with Phase 1.

The first concrete task is:

> Confirm the MoveNet model input tensor type and fix preprocessing if needed.

Reason:

If the model expects `uint8` but the app sends `float32`, every later measurement will be unreliable no matter how good the formulas are.

## Phase 1 Notes

### 2026-04-18

Confirmed by direct FlatBuffer inspection of `GoFitMobile/assets/models/movenet_lightning.tflite`:

- File identifier: `TFL3`
- Model version: `3`
- Input tensor: `serving_default_input:0`
- Input shape: `[1, 192, 192, 3]`
- Input type: `UINT8`
- Output tensor: `StatefulPartitionedCall:0`
- Output shape: `[1, 1, 17, 3]`
- Output type: default `FLOAT32`

Fix applied:

- `bodyMeasurementService.ts` now builds a `Uint8Array` RGB tensor instead of `Float32Array`.
- Localhost debug `fetch()` calls were removed.
- `BodyMeasurementScreen.tsx` now blocks saving when `result.error` exists.
- Failed scans no longer show the `0 cm` measurements or the save button.
- Low-confidence scans under `0.25` remain visible as draft estimates but cannot be saved.
- `jpeg-js` decoded data is RGBA. The preprocessing loop now reads source pixels with a 4-byte stride and writes RGB bytes to the model tensor.
- Measurement results now include a debug payload with normalized front/side keypoints, image dimensions, scale, person-height pixels, and failed sanity checks.
- `BodyMeasurementScreen.tsx` now includes an expandable pose debug overlay for front and side captures.
- The overlay draws the scale estimate, shoulder line, hip line, and keypoints used by the current formula.
- Saved AI scans now return the user to the measurement intro screen instead of leaving the flow.
- The intro screen now loads the last 10 `body_measurements` rows for the signed-in user.
- The intro screen shows the latest saved chest, waist, hip, shoulder, confidence, source, and recent scans for progress tracking.
- Added first-pass pose quality gates to `bodyMeasurementService.ts`.
- The measurement service now blocks scans with missing head/shoulder/hip/feet keypoints, off-center pose, too-small/too-close body framing, or side photos that still look front-facing.
- Failed quality gates return `qualityIssues` so the result screen can show specific retake instructions.
- The result screen now lists the exact retake reasons under the failure message.
- The result screen now shows editable chest, waist, hip, and shoulder fields before saving.
- Saved rows use the edited values in `chest_cm`, `waist_cm`, `hip_cm`, and `shoulder_cm`.
- The original AI values, confidence, corrected fields, and correction timestamp are stored in `manual_overrides`.
- The result screen now shows trust states: `Good scan`, `Usable estimate`, `Low confidence`, or `Retake needed`.
- Confidence is now secondary detail inside the trust banner instead of the only user-facing quality signal.
- Result copy now states that values are estimates for progress tracking and should be corrected before saving.
- Failed result screens now show a direct `Retake photos` action instead of sharing the normal save/result flow.
- Debug results now include formula inputs: front shoulder pixels, front hip pixels, side depth pixels, width/depth cm estimates, raw circumference outputs, quality issues, and failed sanity checks.
- The pose debug overlay now displays the formula diagnostics alongside the front/side keypoint images.
- Added a validation protocol document for comparing AI estimates, corrected saved values, and real tape measurements before changing the formula again.
- Added segmentation research for moving from keypoint-only math to body-outline/mask-based measurement.

Verification:

- Confirmed no `127.0.0.1` debug fetch calls remain in `bodyMeasurementService.ts`.
- Ran `npm run type-check` in `GoFitMobile`.
- Type-check did not report errors in the measurement files.
- Type-check still fails on existing unrelated TypeScript issues in navigation, marketplace, profile weight/height, notification routing, and deep-link store typing.
