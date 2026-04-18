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
- [ ] Add a structured local diagnostics object for each scan.
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
- [ ] Replace failed result UI with a clear retake state.

Success criteria:

- The app never displays impossible values as valid measurements.
- The app never saves `0 cm` or out-of-range AI values.
- We can inspect why a scan failed.

## Phase 2: Add Capture Quality Gates

Purpose: prevent unusable photos before analysis.

- [ ] Add front-photo validation before capture.
- [ ] Add side-photo validation before capture.
- [ ] Require full body visibility:
  - head/nose visible
  - shoulders visible
  - hips visible
  - knees visible
  - ankles visible
- [ ] Require minimum keypoint confidence.
- [ ] Require person centered in frame.
- [ ] Require person height to occupy a target range of the image.
- [ ] Detect likely mirror/cropped/too-close captures where possible.
- [ ] Add user guidance messages:
  - `Step back`
  - `Move into the center`
  - `Show your feet`
  - `Turn sideways`
  - `Use fitted clothing`

Success criteria:

- Bad captures are blocked before measurement.
- The user gets specific instructions instead of generic failure text.

## Phase 3: Replace Keypoint-Only Measurement Math

Purpose: move from pose estimation to body-outline measurement.

- [ ] Choose a person segmentation model or body parsing model.
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

## Phase 4: Manual Correction And Trust UX

Purpose: make results useful even when AI is approximate.

- [x] Add saved body measurement history/progress view.
- [ ] Add result states:
  - success
  - low confidence
  - failed
- [ ] Add manual edit fields for AI-generated measurements.
- [ ] Save whether each value was AI-only or user-corrected.
- [ ] Show confidence labels instead of only numeric confidence.
- [ ] Add copy that says values are estimates for progress tracking.

Success criteria:

- Users can correct imperfect AI measurements.
- Saved data is trustworthy enough for progress history.

## Phase 5: Validation Set

Purpose: stop guessing and measure accuracy.

- [ ] Create a small test protocol.
- [ ] Collect real tape measurements for test users:
  - chest
  - waist
  - hip
  - shoulder
- [ ] Capture front and side photos under good conditions.
- [ ] Capture bad-condition examples:
  - mirror selfie
  - cropped feet
  - loose clothes
  - bad lighting
  - too close
- [ ] Compare AI estimates to tape measurements.
- [ ] Track average error per measurement.

Target:

- Reject obviously bad photos.
- Keep controlled-capture error within a practical range for fitness progress tracking.
- Do not claim clinical or tailoring accuracy.

## Phase 6: Option B Research

Purpose: decide whether to build or integrate a true body measurement system.

- [ ] Research commercial body-scan SDKs.
- [ ] Research open-source server-side body model options.
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

Start with the free/on-device path through segmentation and manual correction. Move to a commercial or server-side body model only if clothing-fit accuracy becomes a core product requirement.

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

Verification:

- Confirmed no `127.0.0.1` debug fetch calls remain in `bodyMeasurementService.ts`.
- Ran `npm run type-check` in `GoFitMobile`.
- Type-check did not report errors in the measurement files.
- Type-check still fails on existing unrelated TypeScript issues in navigation, marketplace, profile weight/height, notification routing, and deep-link store typing.
