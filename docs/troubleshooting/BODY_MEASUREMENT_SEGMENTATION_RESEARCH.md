# Body Measurement Segmentation Research

## Goal

Move GoFit body measurement from keypoint-only estimates toward body-outline measurements.

The current MoveNet flow can find joints, but it cannot see the real body silhouette. That is why a good scan can still produce weak width/depth estimates, especially for hip and chest.

## Why Segmentation Matters

For a better measurement system, pose keypoints should locate body levels:

- shoulder line
- chest line
- waist line
- hip line

Segmentation should provide the person mask:

- front body width at each level
- side body depth at each level
- body visibility and mask quality

Then circumference can be estimated from front width plus side depth, instead of using joint distances as body width.

## Current Project Fit

The mobile app already uses:

- Expo dev client, not Expo Go, for native ML.
- `react-native-fast-tflite`.
- A bundled TFLite MoveNet model in `GoFitMobile/assets/models/`.
- JPEG preprocessing with `expo-image-manipulator`, `expo-file-system`, and `jpeg-js`.

That means the easiest first experiment is another local model that can run through the same TFLite path.

## Options

### Option A: TFLite Person Segmentation Model

Use a TFLite segmentation model and run it through `react-native-fast-tflite`.

Pros:

- Free.
- On-device.
- Keeps privacy story simple.
- Fits the existing MoveNet architecture.
- Avoids new native SDK bridges if the model works with raw TFLite tensors.

Cons:

- We must find a model with usable person-only masks.
- We must manually inspect tensor shapes and output format.
- We must write mask post-processing ourselves.
- Some segmentation models classify many categories, so person mask extraction may be heavier than needed.

Useful sources:

- TensorFlow Lite segmentation overview: https://www.tensorflow.org/lite/examples/segmentation/overview
- TensorFlow image segmentation tutorial: https://www.tensorflow.org/tutorials/images/segmentation
- React Native Fast TFLite: https://github.com/mrousavy/react-native-fast-tflite

Fit for GoFit:

Best first path.

### Option B: MediaPipe Selfie Segmentation Model

Use a lightweight person/background segmentation model similar to MediaPipe Selfie Segmentation.

Pros:

- Designed for real-time person/background masks.
- Small model family.
- Outputs a person mask, which is closer to what we need than generic multi-class segmentation.
- MediaPipe documentation says the general model uses a `256x256x3` input and outputs a `256x256x1` mask.

Cons:

- The original intended use case is selfie/video conferencing and close-range people.
- Full-body front/side fitness photos may be less accurate than portrait selfies.
- Need to confirm model license and exact deployable TFLite file.
- Need to test if it handles full body, feet, and side profile well enough.

Useful sources:

- MediaPipe Selfie Segmentation: https://chuoling.github.io/mediapipe/solutions/selfie_segmentation.html
- Qualcomm AI Hub MediaPipe Selfie Segmentation model card: https://aihub.qualcomm.com/models/mediapipe_selfie

Fit for GoFit:

Strong candidate for a quick prototype, but must be tested on full-body photos.

### Option C: Google ML Kit Selfie Segmentation Native SDK

Use Google ML Kit's native selfie segmentation SDK on Android/iOS.

Pros:

- Optimized native SDK.
- Cross-platform Android/iOS support.
- Produces a mask where each pixel indicates person confidence.
- Supports raw-size masks.
- Google docs report real-time mobile performance.

Cons:

- Requires native integration/bridge work in React Native.
- API is beta and may change.
- Android and iOS integration paths differ.
- Adds native SDK size.
- Not as simple as dropping in a `.tflite` file.

Useful sources:

- ML Kit Selfie Segmentation overview: https://developers.google.com/ml-kit/vision/selfie-segmentation
- Android guide: https://developers.google.com/ml-kit/vision/selfie-segmentation/android
- iOS guide: https://developers.google.com/ml-kit/vision/selfie-segmentation/ios

Fit for GoFit:

Good fallback if raw TFLite models are too hard or too low quality.

### Option D: MediaPipe Image Segmenter Tasks

Use MediaPipe Tasks native Image Segmenter.

Pros:

- Official Android/iOS guides exist.
- Supports still images, video, and live stream modes.
- Can output category or confidence masks depending on model/task.

Cons:

- Requires native integration.
- More moving parts than the current TFLite-only approach.
- Need a model that gives a clean person mask for full-body photos.

Useful sources:

- Android Image Segmenter guide: https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter/android
- iOS Image Segmenter guide: https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter/ios

Fit for GoFit:

Potential later native path, not the first experiment.

## Recommendation

Start with **Option B through the existing TFLite path** if we can get a usable deployable model file.

Reason:

- It is free.
- It is on-device.
- It is aligned with the existing `react-native-fast-tflite` setup.
- It gives a direct person mask rather than only pose joints.
- It lets us prototype without building a custom native bridge first.

If MediaPipe-style selfie segmentation fails on full-body photos, test a generic TFLite person segmentation model.

If both TFLite paths are weak, then consider ML Kit native segmentation.

## Candidate 1: MediaPipe Selfie Multiclass 256x256

Added model:

- `GoFitMobile/assets/models/selfie_multiclass_256x256.tflite`

Source:

- `https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite`

Inspection result:

- File identifier: `TFL3`
- Model version: `3`
- File size: `16,371,837` bytes
- Input tensor: `input_29`
- Input shape: `[1, 256, 256, 3]`
- Input type: `FLOAT32`
- Output tensor: `Identity`
- Output shape: `[1, 256, 256, 6]`
- Output type: `FLOAT32`
- Tensor count: `373`
- Operator count: `175`

Meaning:

- This is a multiclass segmentation model, not a simple single-channel person mask.
- The output has 6 channels per pixel, so post-processing must choose the person/body class instead of treating the output as `[1, 256, 256, 1]`.
- It still fits the existing on-device TFLite architecture because the input/output tensors are plain `FLOAT32`.
- The first app integration should only run inference and render the chosen mask in the debug overlay. Measurement math should stay unchanged until the mask is visually confirmed on front and side photos.

## Prototype Plan

### Step 1: Add A Segmentation Model

- Download or add a small person segmentation `.tflite` model.
- Store it under `GoFitMobile/assets/models/`.
- Confirm model license before shipping.
- Confirm input tensor shape and type.
- Confirm output mask shape and value range.

Status:

- Candidate 1 has been added and inspected.
- License/distribution terms still need a final shipping review before release.
- Output value range and class-channel mapping still need runtime testing in the app.

### Step 2: Build Mask Inference Helper

Create a service separate from the current measurement service:

- `bodySegmentationService.ts`

Responsibilities:

- preprocess photo to model input
- run segmentation model
- produce normalized mask
- expose mask dimensions
- expose mask confidence summary

Status:

- Added `GoFitMobile/src/services/bodySegmentationService.ts`.
- The helper loads `selfie_multiclass_256x256.tflite` through `react-native-fast-tflite`.
- It preprocesses each image to `FLOAT32 [1, 256, 256, 3]` RGB normalized `0..1`.
- It parses the `FLOAT32 [1, 256, 256, 6]` output as an argmax class map for debugging.
- It returns a lightweight 32x32 sampled class grid plus per-class coverage and bounds instead of storing the full output tensor in React state.

### Step 3: Debug Overlay

Add mask debug display:

- show person mask over front photo
- show person mask over side photo
- show body width/depth scan lines
- show rejected mask areas

Status:

- The result debug drawer now includes segmentation mask candidates for front and side photos.
- It shows all 6 output classes so we can identify which channel follows the body.
- Class 4 is now treated as the first body-mask candidate based on the first real phone screenshot.
- The debug drawer now shows Class 4 chest, waist, and hip mask widths/depths in image pixels and centimeters.
- Class 4 measurement now uses the largest connected component instead of every Class 4 pixel.
- Each chest/waist/hip scan line now selects the continuous body segment nearest the MoveNet torso center.
- Added a first geometry warning based on side/front mask ratios so high MoveNet confidence alone cannot mark suspicious scans as good.
- Measurement formulas and saved values are still unchanged until the mask is visually confirmed.

### Step 4: Extract Widths

Use MoveNet keypoints only to locate vertical body levels.

From the front mask:

- shoulder width from silhouette
- chest width from silhouette
- waist width from silhouette
- hip width from silhouette

From the side mask:

- chest depth from silhouette
- waist depth from silhouette
- hip depth from silhouette

Status:

- Added debug-only Class 4 mask line extraction.
- Current body levels use MoveNet shoulder/hip keypoints to pick scan rows:
  - chest: 28% from shoulder line to hip line
  - waist: 68% from shoulder line to hip line
  - hip: hip line
- Added first cleanup pass:
  - build a binary mask from Class 4
  - keep only the largest connected component
  - select the continuous scan-line segment closest to torso center
  - report segment count for debugging
- Added side/front geometry warning:
  - side mask too wide compared with front mask can indicate phone/body occlusion, crossed arms, or not fully sideways
  - side mask too thin compared with front mask can indicate broken depth detection
  - mild ratio issues are advisory so mirror photos can still be saved after review
  - extreme ratio issues remain blocking
- Added first formula fallback from cleaned mask widths/depths:
  - chest circumference from front chest width + side chest depth
  - waist circumference from front waist width + side waist depth
  - hip circumference from front hip width + side hip depth
  - ellipse approximation is used for the draft circumference
- Added first plausibility layer:
  - high waist relative to chest/hip creates a review warning
  - unusually high chest/waist values create a review warning
  - extreme waist or shoulder ratios can still block saving
  - review warnings do not block saving because the user can correct the values
- The debug output still reports cleaned front mask widths and side mask depths so the formula can be inspected.

### Step 5: Estimate Circumference

Start with ellipse approximation:

```text
circumference ~= pi * (front_width / 2 + side_depth / 2)
```

Then tune only after validation scans.

### Step 6: Quality Gates

Reject scans when:

- mask is too small
- mask touches top/bottom frame edges
- mask is fragmented
- front/side body height scale differs too much
- side depth is too close to front width
- keypoint levels fall outside the mask

## Definition Of Done For Prototype

The first segmentation prototype is done when:

- front and side masks render in debug overlay
- mask width/depth values appear in diagnostics
- circumference formula can use mask values instead of joint distance
- failed masks produce retake guidance
- no photo is uploaded for AI processing

## Risks

- Selfie segmentation may not detect full-body legs/feet well.
- Loose clothes will still distort the silhouette.
- Mirror photos are a supported capture mode, but phone/body occlusion, angled mirrors, and reflection distortion can still confuse the mask.
- Side photos may still be hard if arms overlap torso.
- Model output post-processing may be slow in JavaScript if the mask is large.

## Open Questions

- Which exact TFLite model file should be bundled?
- Does the chosen model support full-body front/side photos well enough?
- Can mask processing run fast enough on mid-range Android phones?
- Do we need a native resize/mask-processing helper later?
