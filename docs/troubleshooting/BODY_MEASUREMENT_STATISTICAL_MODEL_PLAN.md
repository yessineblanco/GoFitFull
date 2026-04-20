# Body Measurement Statistical Model Plan

## Purpose

Record the research decision after reviewing the paper linked by the user:

- ACM DOI: https://dl.acm.org/doi/fullHtml/10.1145/3606305.3606323
- Title: "Predicting Human Body Measurements from a Front Image"
- Authors: Tzvetomir Vassilev and Metodi Dimitrov
- Venue: CompSysTech 2023

This document explains why the current pose + segmentation + hand-written circumference formula is still producing unstable results, and what the next realistic solution should be.

## Current Decision

The current GoFit measurement engine should not be treated as a true body-measurement system.

It is useful as:

- a capture-quality checker
- a body pose detector
- a rough progress-estimate prototype
- a feature extractor for a future model

It is not reliable enough as:

- a tailoring measurement tool
- a clothing-size recommendation engine
- a raw pixel-to-centimeter circumference calculator

The next serious fix is to move from direct geometry formulas to a statistical measurement estimator.

## What The Linked Paper Changes

The linked ACM paper points toward the correct product direction.

The important idea is not "measure pixels and multiply by scale." The important idea is:

1. Use a smartphone front image.
2. Use the user's real height as scale.
3. Extract a small set of linear body features from the image.
4. Use a dataset of 3D body scans and manual measurements.
5. Train statistical models, including PCA-based models, to predict real body measurements.

That means the final body values come from a learned/statistical body model, not directly from one silhouette width or one side depth line.

## Why Our Current Results Still Fail

### 1. A 2D photo does not contain true circumference

Chest, waist, and hip are 3D circumferences. A normal phone photo gives only a 2D projection.

The current formula tries to rebuild circumference from:

- front mask width
- side mask depth
- estimated pixel scale from height

That can work as a draft, but it is very sensitive to small errors.

### 2. Side depth is the weakest measurement

The side photo often creates the biggest error because:

- arms overlap the torso
- the phone covers part of the body in mirror photos
- the body is not perfectly side-on
- segmentation includes clothing, shadow, or background
- camera perspective changes the apparent depth

If side depth is wrong by only a few centimeters, the circumference estimate can become very wrong.

### 3. Selfie segmentation is not a body-measurement model

The current bundled segmentation model is useful for finding a person-like mask, but it was not trained to find anatomical measurement lines.

It does not know:

- the true waist line
- the true chest line
- the body under loose clothes
- whether a phone is occluding the torso
- where clothing ends and body shape begins

So it can create a visually reasonable mask while still producing bad measurements.

### 4. Mirror photos should be supported, but not blindly trusted

Mirror photos are a real user behavior, especially in gyms.

Mirror capture should stay supported when:

- full body is visible
- phone is not covering waist/chest/hip
- mirror is flat and not angled strongly
- camera is not too close
- lighting is usable

Mirror capture should still be flagged when:

- the phone covers measurement areas
- the mirror angle changes body proportions
- the user stands rotated
- the reflection crops feet/head
- foreground objects cover the person

So the problem is not "mirror is bad." The problem is occlusion, perspective, and missing 3D information.

### 5. Threshold tuning will not solve the core issue

Changing confidence thresholds can make the app accept or reject more scans, but it cannot make the measurement formula truly accurate.

If we tune rules to pass one user's photos, it may fail for other users.

The fix must generalize across:

- body sizes
- heights
- clothing
- mirror/direct capture
- camera distances
- Android devices
- room backgrounds

## What The Final Product Should Look Like

### User-facing behavior

The app should say:

- "Good scan" only when capture quality and model certainty are acceptable.
- "Usable estimate" when values are plausible but still should be reviewed.
- "Review carefully" when image geometry is suspicious.
- "Retake needed" when the photo cannot support a useful estimate.

The app should not claim exact tape-measure accuracy unless a validated body model proves it.

### Measurement flow

Recommended flow:

1. User enters height.
2. App asks for front photo.
3. App optionally asks for side photo when confidence needs improvement.
4. Pose model checks body visibility and alignment.
5. Segmentation model extracts silhouette/body features.
6. Statistical estimator predicts measurements.
7. User reviews and corrects values before saving.
8. Saved corrections improve that user's future estimates only if calibration is enabled.

## Recommended Technical Architecture

```text
Photos
  -> Pose model
  -> Segmentation / human parsing model when reliable
  -> Feature extractor
  -> Statistical measurement estimator
  -> Plausibility + uncertainty scoring
  -> Editable review UI
  -> Saved progress
```

### Feature extractor

The feature extractor should output stable numbers, not final measurements.

Candidate features:

- user height in cm
- person height in pixels
- front shoulder width in pixels and cm
- front chest width in pixels and cm
- front waist width in pixels and cm
- front hip width in pixels and cm
- side chest depth in pixels and cm
- side waist depth in pixels and cm
- side hip depth in pixels and cm
- torso length ratio
- leg length ratio
- shoulder-to-hip ratio
- waist-to-hip ratio
- mask coverage
- mask fragmentation score
- pose confidence
- side/front body-height scale difference

### Statistical estimator

The estimator should predict:

- chest_cm
- waist_cm
- hip_cm
- shoulder_cm
- confidence or uncertainty per value

Possible model types:

- simple linear/ridge regression for the first prototype
- gradient boosted trees if training data exists
- small neural network if enough examples exist
- SMPL/body-shape model if we move to a stronger server-side pipeline

## Free Path

There is a free path, but it must be treated as a staged research project.

### Stage 1: Stop improving the direct formula as if it were final

Status: needed now.

Actions:

- Keep current formula as a draft fallback only.
- Keep user review/edit before saving.
- Keep debug overlay for feature inspection.
- Do not tune rules only around one person's photos.
- Replace the weak selfie segmentation experiment with a stronger pose/body candidate before investing in another formula pass.

Current model decision:

- [Body Measurement MediaPipe Pose Landmarker Spike](./BODY_MEASUREMENT_MEDIAPIPE_POSE_LANDMARKER_SPIKE.md)

### Stage 2: Log feature vectors

Add a debug feature vector for every scan:

- raw pose features
- segmentation features
- formula estimate
- final saved/corrected value
- scan state
- retake/review reasons

This gives us the dataset needed for a better estimator.

### Stage 3: Build a local baseline estimator

Start with a simple model that uses:

- height
- front widths
- side depths
- body ratios
- current estimate
- plausibility constraints

The first target is not perfection. The first target is to reduce wild errors and make outputs stable.

### Stage 4: Add optional calibration

When users know a real measurement, they can enter it.

Important rule:

- A user's correction should calibrate that user only.
- It must not change the global estimator for every user.

This avoids overfitting the app to one person's body.

### Stage 5: Research open training data

Look for datasets or models that can legally support training.

Candidate research areas:

- anthropometry from images
- SMPL body shape estimation
- DensePose / human parsing
- body measurement regression
- dressed-human body reconstruction

If no usable free dataset/model is available, the free path can still improve stability but may not reach clothing-size accuracy.

## Paid Or Server-Side Path

If GoFit needs Zara/Zalando-style sizing accuracy, the realistic path may be:

- commercial body-measurement SDK
- server-side 3D body reconstruction
- body-shape model such as SMPL-style fitting
- trained proprietary measurement model

This can be more accurate, but it adds:

- cost
- privacy review
- infrastructure
- upload/security requirements
- harder mobile integration

## What Not To Do

- Do not hardcode one user's correct body measurements into the global formula.
- Do not tune thresholds until one person's screenshots look good.
- Do not call the current values "true measurements."
- Do not reject all mirror photos.
- Do not trust a green mask if it covers clothing, phone, or background.
- Do not rely only on MoveNet confidence.
- Do not ship clothing-fit claims without real validation.

## Next Implementation Tasks

- [x] Research the linked ACM paper direction.
- [x] Record the decision that a statistical estimator is the next serious fix.
- [x] Add a typed measurement feature-vector object in `bodyMeasurementService.ts`.
- [x] Return the feature vector in the debug payload.
- [x] Show the feature vector in the debug drawer.
- [x] Save the feature vector in `manual_overrides` for scans that users save.
- [ ] Add a small offline CSV/export path for validation scans.
- [ ] Build a baseline statistical estimator prototype outside the production flow.
- [ ] Compare baseline estimator output against the current direct formula.
- [ ] Only replace the production formula after validation shows lower error.

## Implementation Notes

### 2026-04-19

Next step completed: add the first model-ready feature vector without changing the measurement formula.

What this gives us:

- a stable debug object for future statistical estimation
- pose geometry features from the front and side photos
- segmentation width/depth features when the mask is available
- save metadata that ties user-corrected values back to the scan features

What this does not do yet:

- it does not train a model
- it does not change displayed measurement math
- it does not make the current estimator more accurate by itself

Reason:

Before replacing the formula, we need to collect the exact inputs that a statistical estimator would learn from. This avoids guessing and avoids tuning the app around one user's photos.

### 2026-04-20

Current measurement work is now past the first Android MediaPipe runtime blocker, but it is still not ready for a statistical estimator code change.

Status:

- EAS reports a finished Android development build at `3c3a3c1`, which includes the MediaPipe debug comparison commit `2695f2c`.
- Android phone testing now confirms MediaPipe returns `33 pts | 1 pose` for both mirror captures and direct photos taken by another person.
- Direct-capture testing still returned `9/9` visible core points for front and side, but the side score was lower at about `0.81`, so future feature vectors should preserve visibility/quality details rather than treating all `33 pts` results as equal.
- The next validation step is repeat testing across more mirror and direct front/side captures, comparing MoveNet, segmentation, and MediaPipe overlays on the same photos.
- Do not replace the production formula or train a baseline estimator until MediaPipe proves stable across repeat captures and its feature vectors are logged cleanly enough to be a trustworthy input source.

## Sources

- ACM paper page: https://dl.acm.org/doi/fullHtml/10.1145/3606305.3606323
- DBLP entry confirming title, authors, venue, and pages: https://dblp.org/db/conf/compsystech/compsystech2023
- Researchr entry confirming the same publication: https://researchr.org/publication/VassilevD23
- Metadata mirror for author/paper discovery: https://www.bohrium.com/en/scholar/T10298851/Metodi_Dimitrov
- 2D image body-measurement review: https://journals.sagepub.com/doi/abs/10.1177/00405175251318629
- Open research direction for learned anthropometry: https://arxiv.org/abs/2101.02515

## Bottom Line

The paper does not give us a drop-in model, but it confirms the right direction.

For GoFit, the next reliable path is:

1. use pose and segmentation to extract body features,
2. train or build a statistical estimator,
3. keep user review/edit,
4. validate against real measurements before claiming accuracy.
