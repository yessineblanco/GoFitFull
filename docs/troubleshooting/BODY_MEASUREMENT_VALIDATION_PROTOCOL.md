# Body Measurement Validation Protocol

## Goal

Measure how close the GoFit AI body measurement flow is to real tape measurements, and decide which fixes actually improve accuracy.

Use this protocol before changing the measurement formula again.

## What To Record

For each test scan, record:

- Real tape measurements.
- AI result before correction.
- Corrected value saved by the user.
- Photo quality notes.
- Whether the app accepted or rejected the scan.
- Any retake guidance shown by the app.

## Required Tape Measurements

Measure in centimeters:

- Chest.
- Waist.
- Hip.
- Shoulder.

Use the same measuring method each time:

- Chest: around the fullest chest line, tape level.
- Waist: around the natural waist, relaxed.
- Hip: around the fullest hip line, tape level.
- Shoulder: straight across shoulder width if comparing to the app shoulder value.

## Photo Capture Rules

Good-condition scan:

- Back camera or one flat mirror.
- Mirror photos are allowed when the full body is visible and the phone does not cover torso, waist, or hips.
- Full body visible, head to feet.
- Person centered.
- Even lighting.
- Fitted clothing.
- Front photo facing the camera.
- Side photo turned about 90 degrees.
- Similar camera distance in both photos.

Bad-condition examples to keep:

- Mirror selfie with phone covering torso.
- Angled mirror/reflection distortion.
- Feet cropped.
- Head cropped.
- Loose clothes.
- Bad lighting.
- Too close.
- Too far.
- Side photo not turned enough.

## Test Table

| Test ID | Date | Condition | Tape Chest | AI Chest | Saved Chest | Chest Error | Tape Waist | AI Waist | Saved Waist | Waist Error | Tape Hip | AI Hip | Saved Hip | Hip Error | Tape Shoulder | AI Shoulder | Saved Shoulder | Shoulder Error | Confidence | App State | Notes |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BM-001 |  | Good |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Error Calculation

Use absolute error:

```text
error_cm = absolute(app_value_cm - tape_value_cm)
```

Track errors for:

- AI value vs tape.
- Saved corrected value vs tape.

The AI value tells us model/formula accuracy.

The saved corrected value tells us progress-history trust after user review.

## Current Practical Targets

These targets are for fitness progress tracking, not tailoring or medical use.

- Good scan accepted by the app.
- Bad scan rejected with specific retake guidance.
- AI chest error: ideally under 8 cm.
- AI waist error: ideally under 6 cm.
- AI hip error: ideally under 6 cm.
- AI shoulder error: ideally under 5 cm.
- Corrected saved values should match tape within the user's manual entry accuracy.

## Pass Or Fail

A scan passes if:

- Good-condition photos are accepted.
- Measurements are plausible.
- User can correct values before saving.
- Saved progress shows the corrected values.

A scan fails if:

- Bad photos are accepted without warning.
- Good photos are rejected too often.
- Any value is wildly wrong and still saveable.
- Saved progress does not match the corrected values.

## Next Decisions

After collecting at least 5 good-condition scans and 5 bad-condition scans:

- Tune capture quality thresholds if good scans are rejected.
- Tune formula constants only if AI error is consistent in one direction.
- Move to silhouette or segmentation work if keypoint-only math cannot meet the practical targets.
