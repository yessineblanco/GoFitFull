# Body Measurement Fix Plan

## Goal

Make the body measurement feature stop producing impossible values, then move it toward a realistic camera-based measurement workflow.

The current implementation now prefers MediaPipe pose landmarks on Android, with MoveNet kept as a fallback and compatibility path. The formulas are still hand-written and still not enough for true chest, waist, hip, and shoulder measurement. The first priority is to make the feature fail safely and reveal exactly where the pipeline breaks.

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
- [x] Test Android MediaPipe Pose Landmarker on-device with acceptable performance.
- [x] Promote Android body measurement pose sourcing to MediaPipe first, with MoveNet kept as fallback and comparison.
- [x] Reuse service-returned MediaPipe results in the debug overlay instead of running MediaPipe twice per scan.
- [ ] Implement iOS MediaPipe Pose Landmarker native bridge.
- [ ] Test iOS MediaPipe Pose Landmarker on-device after the iOS bridge is implemented.
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
- [ ] Decide whether to retire MoveNet after MediaPipe is validated on Android and iOS.
- [ ] Decide whether to keep, replace, or remove the current selfie segmentation model after a better body-outline source is proven.

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
- EAS runtime test failed with `Cannot find native module 'MediaPipePoseLandmarker'`.
- Root cause: the local module folder was still untracked by git, so EAS cloud build did not upload it.
- Added a defensive JS wrapper so missing native module shows a debug error instead of crashing.
- Next EAS build must include tracked local module files, especially:
  - `GoFitMobile/modules/mediapipe-pose-landmarker/expo-module.config.json`
  - Android Kotlin bridge and `build.gradle`
  - `pose_landmarker_full.task`
  - TypeScript wrapper/types
  - iOS placeholder files
- 2026-04-20 build status check:
  - local git worktree is clean
  - direct GitHub check shows `origin/master` at `4524391`, which includes `2695f2c`
  - `master` is one commit ahead of `origin/master` with `3c3a3c1 fix(eas): move .easignore to EAS project root with anchored native-build patterns`
  - EAS reports the newest Android development build finished from `3c3a3c1`, so that build includes the MediaPipe module commit and the EAS upload-ignore fix
  - if the next build is started from GitHub/remote instead of local EAS upload, push `3c3a3c1` first because GitHub does not have that `.easignore` fix yet
  - next phone test is to install the newest `3c3a3c1` Android dev-client APK, fully close the old app, run body measurement, open `Pose debug overlay`, and confirm the MediaPipe panel returns `33 pts` instead of `Cannot find native module`
- 2026-04-20 Android phone test result:
  - MediaPipe native module is present in the installed dev-client build; the previous `Cannot find native module 'MediaPipePoseLandmarker'` failure is resolved.
  - The debug panel returned `33 pts | 1 pose` for both front and side photos.
  - Front score was about `0.99`; side score was about `0.98`.
  - Front and side core points both reported `9/9`.
  - Reported native inference timing was about `38 ms` for the front photo and `65 ms` for the side photo.
  - Visual overlay appears to follow the body substantially better than the previous unreliable path for shoulders, hips, knees, and ankles on the tested mirror photos.
  - The test photos still include phone/hand occlusion over the torso, so the next step is repeat testing across mirror and direct captures before any measurement formula or save-gating changes.
- 2026-04-20 direct-capture phone test result:
  - A second person took the front and side photos directly, without mirror/phone-in-frame occlusion.
  - MediaPipe again returned `33 pts | 1 pose` for both front and side photos.
  - Front score was about `0.99`; side score was about `0.81`.
  - Front and side core points both reported `9/9`.
  - Reported native inference timing was about `130 ms` for the front photo and `74 ms` for the side photo.
  - Visual overlay still tracks shoulders, hips, knees, and ankles well enough for debug comparison.
  - This strengthens the case that MediaPipe is a better pose feature source than the current MoveNet-only path, but the side score drop means we still need repeat tests before changing formulas or save gating.
- 2026-04-20 README update:
  - Root `README.md` now summarizes the body measurement focus, the debug-only MediaPipe Android status, the unchanged saved-measurement behavior, and links to the current troubleshooting/planning docs.
- 2026-04-20 migration/removal decision:
  - Do not remove MoveNet or the current segmentation model yet.
  - MediaPipe can become the primary pose feature source if repeat Android tests remain stable and the iOS bridge returns the same result shape.
  - MoveNet should stay as a fallback/comparison path until MediaPipe is cross-platform, logged in feature vectors, and validated against enough real captures.
  - Segmentation/body-outline logic is still needed because pose landmarks alone do not produce true chest, waist, or hip circumferences.
  - Only remove old models/code after the production estimator no longer references them and a new build proves saved measurements, debug overlays, and failure states still work.
- 2026-04-21 Android primary pose-source rollout:
  - `bodyMeasurementService.ts` now uses MediaPipe as the primary pose source on Android and maps the 33-landmark result into the existing 17-keypoint contract so the current quality gates, segmentation diagnostics, and draft formulas continue to run.
  - `BodyMeasurementScreen.tsx` now reuses the raw MediaPipe result returned by the measurement service, so Android scans no longer run a second MediaPipe pass just to populate the debug panel.
  - The MediaPipe debug panel now tells us whether MediaPipe was the primary pose source for the scan or whether a fallback happened.
  - MoveNet remains in place as fallback/comparison and must not be removed yet.
  - Saved measurements, formulas, confidence, and save gating are still on the existing estimator path; this change only switches the primary Android pose source.
- 2026-04-21 Android mirror retest after MediaPipe-primary rollout:
  - The debug overlay now correctly reports that Android used MediaPipe as the primary pose source for the scan.
  - MediaPipe still looks strong on the same mirror workflow: front `33 pts | 1 pose`, side `33 pts | 1 pose`, front score about `0.99`, side score about `0.97`, and both front/side core counts at `9/9`.
  - Final measurement output is still not trustworthy for this scan even though pose is good: chest `76.1 cm`, waist `61.0 cm`, hip `62.3 cm`, shoulder `77.8 cm` for a `175 cm` user.
  - The trust banner correctly says `Review carefully`, but the numeric confidence still showed `1.00`, which is misleading because the final estimator is clearly less certain than the pose model.
  - Segmentation debug still looks weak: front Class 4 cleaned coverage was about `7%`, side cleaned coverage about `5%`, and the mask widths/depths are too narrow/inconsistent to justify a near-perfect final confidence.
  - This narrows the problem: pose source is no longer the main blocker; the remaining reliability issue is the measurement estimator plus confidence synthesis.
- 2026-04-21 planned next implementation order before more code changes:
  - Stage 1: make confidence honest.
    - Separate pose confidence from final measurement confidence.
    - Penalize final confidence using segmentation coverage, side/front geometry mismatch, implausible draft outputs, and warning severity.
    - Keep the current review UX, but stop showing `1.00` when the scan is obviously only advisory quality.
  - Stage 2: make the feature vector explicit about why confidence dropped.
    - Record pose score, segmentation coverage, geometry penalties, plausibility penalties, and final confidence separately in debug/feature-vector output.
  - Stage 3: revisit the current formulas.
    - Reduce dependence on shoulder-based depth/circumference heuristics.
    - Re-check chest/waist/hip computation against segmentation widths/depths and MediaPipe-aligned anatomical levels.
  - Stage 4: only after confidence and formula cleanup, revisit save gating thresholds.
- 2026-04-21 four-scan log review after MediaPipe-primary rollout:
  - All four scans used MediaPipe for both front and side pose, so this log is good evidence about the current estimator path rather than the old MoveNet pose source.
  - Low-level scale and front geometry were relatively stable across scans: scale stayed at about `0.07 cm/px`, front shoulder width stayed about `616 px` to `657 px`, and front hip width stayed about `325 px` to `346 px`.
  - Final torso outputs still swung too much for that level of pose stability: chest ranged `70.4 cm` to `114.8 cm`, waist `52.7 cm` to `89.9 cm`, hip `52.3 cm` to `96.9 cm`.
  - Shoulder is now mostly in a believable band (`46.0 cm` to `48.5 cm`) but still produced one extreme outlier at `82.2 cm`, so the estimator is not yet robust.
  - Numeric confidence still does not track cross-scan reliability: the four scans came back at `0.52`, `1.00`, `0.71`, and `0.70`, even though the measurement spread is still too large for a trusted production result.
  - Scan `#1` also exposed a debug-transparency problem: `rawChestCm` was `110.3` while `draftChestCm` and the final chest output were `70.4`, with similar drops for waist and hip. That means the estimator is applying later-stage adjustments that are not obvious enough in the current debug story.
  - Planning implication: do not touch save gating or remove segmentation yet. First make final confidence honest, then expose every estimator stage clearly in debug output, then tighten the formulas with repeat testing against those new signals.
- 2026-04-21 nine-scan review with the first statistical-depth-model runs:
  - Scans `#1-#4` still used the old depth path (`depth model: --`), while scans `#5-#9` used `depth model: statistical-male`. That gives a useful A/B split inside the same day on the same subject.
  - The statistical-depth-model group is much more stable than the first four scans:
    - chest tightened to `100.2 cm` to `103.9 cm`
    - waist tightened to `75.6 cm` to `77.7 cm`
    - hip tightened to `82.9 cm` to `85.5 cm`
    - shoulder stayed in a believable band at `45.8 cm` to `47.5 cm`
  - Depth estimates also became stable in the statistical group: chest depth about `24.2 cm` to `25.2 cm`, abdomen depth about `21.3 cm` to `22.1 cm`.
  - That stability is materially better than the first four scans and strongly suggests the new statistical depth branch is a better direction than the old heuristic depth path.
  - But `detection quality` is still not calibrated correctly. The statistical runs are the most stable/plausible measurements in the set, yet they only reported about `0.47` to `0.71`, while one weaker pre-statistical scan reported `1.00`.
  - Planning implication:
    - keep treating numeric quality as a temporary internal signal, not a user-trust signal
    - make the estimator branch explicit in debug output and UI/dev logs
    - use the statistical-depth-model branch as the current preferred direction for formula work
    - do not remove the old path yet until repeat testing and manual-baseline comparison confirm the improvement
- 2026-04-21 accuracy-ceiling review:
  - The two biggest remaining limits are now explicit:
    - depth is statistical, not measured per person
    - waist is derived from hip/depth priors rather than directly measured from the image
  - That means the pipeline is now optimized for stability over individual precision. This was the right move for the current noisy data, but it creates a real ceiling on how accurate one scan can be for different body compositions.
  - The current side photo is mostly acting as gating/validation, not as a true numeric measurement input. That means we are still asking the user for a strict side pose even though the side pixels no longer carry most of the torso-depth math.
  - `detection quality` is measuring capture cleanliness more than measurement truth. It should not be treated as a user-facing accuracy claim in its current form.
  - The segmentation path is now close to fallback-only behavior. That is a sign to either:
    - defer running it until the pose path fails or asks for help
    - or explicitly reinstate it as a depth source when mask health is strong enough
  - The current ranking of next measurement-ceiling improvements is:
    - short term: gated segmentation-derived depth with statistical fallback
    - medium term: per-user calibration from one real tape measurement
    - long term: a learned body model / mesh-fitting approach from the two images
- 2026-04-21 pose-engine retention decision:
  - Do not remove MoveNet yet.
  - iOS still depends on MoveNet as the only shipped pose path.
  - Android still benefits from MoveNet as a crash/fallback safety net if the MediaPipe native module fails or is unavailable.
  - MediaPipe has earned primary-pose status on Android, but MoveNet is still real infrastructure, not dead weight.
  - Revisit removal only after iOS has MediaPipe parity and Android fallback history suggests the extra safety net is no longer worth the bundle cost.
- 2026-04-21 review of the binary-segmentation model swap:
  - The TypeScript swap from `selfie_multiclass_256x256.tflite` to `selfie_segmenter.tflite` is internally consistent in the local code paths reviewed.
  - Repo-state update: the new asset `GoFitMobile/assets/models/selfie_segmenter.tflite` is now tracked/staged.
  - Remaining decision: the previously tracked asset `GoFitMobile/assets/models/selfie_multiclass_256x256.tflite` is still marked deleted, and that removal should stay pending explicit approval.
  - Do not treat this change as merge-ready until the old asset removal is explicitly approved/decided.
  - After that repo-state fix, the next validation should be a fresh-checkout style run/build to prove segmentation still loads outside the current local working tree.
- 2026-04-21 build-readiness call:
  - The new segmentation asset is staged, so the main reproducibility blocker for the binary-mask swap is fixed.
  - User decision: retire `selfie_multiclass_256x256.tflite` rather than keep carrying a failing model as rollback baggage.
  - Build implication: the next Android EAS build should use the binary `selfie_segmenter.tflite` path only.
  - Local build command from `C:\Users\yessi\Desktop\work\GoFit\GoFitMobile`:
    - `eas build --profile development --platform android`
  - After that, do a new Android EAS build for phone validation of the binary person-mask path.
- 2026-04-21 repo instruction update:
  - The Karpathy behavioral guidelines are now stored in the project itself, not only in chat context.
  - Added repo-wide guidance in `AGENTS.md` so project-local agents have an always-on instruction source inside the repo.
  - Updated `.cursor/rules/karpathy-behavioral-guidelines.mdc` to match the requested wording and removed the previous encoding artifacts.
  - Normalized punctuation to ASCII in both files to keep the rule stable across editors and terminals.
- 2026-04-21 review of the unresolved-ops segmentation follow-up:
  - The new diagnosis is coherent: the previous `selfie_segmenter.tflite` failure was a runtime/model-compatibility problem in `react-native-fast-tflite`, not a bug in the mask-decoding code.
  - The service now points at `selfie_segmentation.tflite`, and the screen/debug metadata were updated to match that asset name.
  - Current repo blocker: `GoFitMobile/assets/models/selfie_segmentation.tflite` is still untracked, so a fresh checkout or remote EAS build from git will not contain the model that the code now requires.
  - Secondary repo note: `GoFitMobile/assets/models/selfie_segmentation_legacy.tflite` is present locally with the same hash as `selfie_segmentation.tflite`, so it should either be explained as an intentional backup or removed later once the tracked asset is settled.
- 2026-04-21 build guidance for the new selfie segmentation asset:
  - No native code or plugin wiring changed for this swap; the project already supports `.tflite` assets in Metro and already includes `react-native-fast-tflite`.
  - For an existing installed development client connected to Metro, a JS reload plus restarting Expo/Metro is enough to pick up the new model asset.
  - For a self-contained APK or any build that should work without Metro, do a new Android EAS build after `selfie_segmentation.tflite` is tracked in the repo state you are building from.
- 2026-04-21 stale-bundle diagnosis for segmentation retest:
  - The phone screenshot still shows `selfie_segmenter.tflite` and `sigmoid person probability`.
  - The current source tree no longer contains those runtime strings in the active segmentation path; it now says `selfie_segmentation.tflite` and `person confidence`.
  - That means the device is still executing an older JS bundle / older installed build, so the latest segmentation swap has not actually been tested yet.
  - Until the on-device debug text changes to the new strings, any segmentation failure seen on the phone should be treated as evidence about the old path, not the new `selfie_segmentation.tflite` path.
- 2026-04-21 Metro-log correction to the stale-bundle theory:
  - New Expo/Metro logs show the current dev session resolving `./assets/models/selfie_segmentation.tflite` with a Metro asset URL and hash.
  - That proves the running app did fetch the new JS path at least for the latest scan attempt, so the earlier stale-bundle theory is no longer the primary explanation.
  - The remaining likely root cause is runtime compatibility of the current segmentation model with `react-native-fast-tflite` / the bundled LiteRT on this Android build.
  - Secondary observation: the segmentation model is being requested twice in quick succession (front + side `Promise.all`), so duplicate model creation is happening during one scan; this is worth keeping in mind, but the specific `unresolved-ops` status still points more strongly to operator support than to pure memory pressure.
- 2026-04-21 internet research on `unresolved-ops`:
  - The strongest external explanation is custom-op incompatibility, not preprocessing or asset resolution.
  - `react-native-fast-tflite` documents standard TFLite model loading and delegates, but does not document MediaPipe custom-op registration.
  - TensorFlow Lite docs state that unresolved custom ops require explicit operator registration in the runtime.
  - External runtime evidence from `flutter_litert` is especially relevant: it explicitly bundles MediaPipe's `Convolution2DTransposeBias` custom op and says this is required for MediaPipe Selfie Segmentation models such as `selfie_segmenter.tflite`.
  - Official MediaPipe issue logs for image/selfie segmentation also show `Found Custom Op: Convolution2DTransposeBias`, which fits the above.
  - Current planning conclusion: no further JS-only model swapping inside the MediaPipe selfie-segmentation family should be expected to fix this by itself.
  - The realistic solution paths are:
    - use MediaPipe Tasks `ImageSegmenter` natively for segmentation, as documented by Google AI Edge
    - or add/register the required MediaPipe custom op in the native TFLite runtime used by `react-native-fast-tflite`
    - or switch to a segmentation model that is verified to use only built-in TFLite ops

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

2026-04-21 follow-up research:

- Confirmed from Metro logs that the current dev session is loading `selfie_segmentation.tflite`, so the newer failure is not explained by stale JS bundle / asset caching alone.
- Confirmed by inspecting the actual `.tflite` bytes in this repo that both `selfie_segmenter.tflite` and `selfie_segmentation.tflite` contain the custom op name `Convolution2DTransposeBias`; the older `selfie_multiclass_256x256.tflite` does not expose that string.
- Official LiteRT docs state that models using custom operators still fail on the default interpreter until the operator is created and registered in the runtime.
- The `flutter_litert` package docs explicitly call out MediaPipe Selfie Segmentation as requiring MediaPipe's `Convolution2DTransposeBias` custom op, and show that they bundle/register it as a special case.
- Current working inference: `react-native-fast-tflite` is loading the model asset correctly, but its bundled Android LiteRT runtime does not currently register the MediaPipe custom op used by the newer selfie-segmentation models.

Implication:

- More JS-only swapping within the MediaPipe selfie-segmentation family is unlikely to fix `Status: unresolved-ops`.
- Real solution paths are:
  - use native MediaPipe Image Segmenter / Tasks for segmentation,
  - extend the native TFLite runtime with the needed MediaPipe custom op registration,
  - or switch to a segmentation model verified to use only builtin LiteRT ops.

2026-04-21 native segmenter implementation:

- Chosen path: native MediaPipe Image Segmenter on Android.
- Reused the existing local Expo module `mediapipe-pose-landmarker` instead of creating a second bridge.
- Added `analyzeSegmentationFromImage()` to the module, backed by `com.google.mediapipe:tasks-vision:0.10.33` `ImageSegmenter`.
- The native bridge now loads `selfie_segmenter.tflite` from Android assets, requests both confidence masks and category mask, and resizes output to `256x256` so the existing JS torso-mask heuristics can stay intact.
- `bodySegmentationService.ts` no longer uses `react-native-fast-tflite` for segmentation. It now consumes the native MediaPipe mask output and keeps the old pose-anchored cleanup and torso-width measurement logic.
- `BodyMeasurementScreen.tsx` debug fallback text was updated to reflect the native MediaPipe segmenter path.

Verification:

- `npm run type-check` still fails only on the same unrelated repo issues in navigation / marketplace / profile / deep-link files. No new segmentation-specific TS error surfaced.
- `android\\gradlew :mediapipe-pose-landmarker:compileDebugKotlin` succeeded after targeting the correct local module project path.

Operational note:

- Because this is a native Expo module change plus a new Android asset, testing requires a rebuilt Android dev client / EAS dev build. Metro reload alone is not enough for this step.
