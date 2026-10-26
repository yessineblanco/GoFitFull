# Body-measurement sequence correction

Approved scope applied on 21 October 2026: the two existing measurement figures, a new review/save figure, and their adjacent use-case table, captions, and explanatory paragraphs in `main.tex`. Application code, database state, unrelated diagrams, and broader AI-accuracy claims elsewhere in the report were not changed.

## Evidence ledger

| Behavior | Repository evidence | Report correction |
| --- | --- | --- |
| Calibration | `GoFitMobile/src/screens/profile/BodyMeasurementScreen.tsx:169–173` | Height comes from the profile; profile gender selects a depth preset or neutral behavior. No height-entry interaction invented on this screen. |
| Capture and validation | `BodyMeasurementScreen.tsx:276–325`; `GoFitMobile/src/services/bodyMeasurementService.ts:720–773` | Front capture must pass validation before side capture. Side validation analyzes both images. Camera returns local URIs. |
| Native interface | `GoFitMobile/modules/mediapipe-pose-landmarker/android/src/main/java/expo/modules/mediapipeposelandmarker/MediaPipePoseLandmarkerModule.kt:34–56` | Kotlin bridge with per-image `analyzePoseFromImage` and `analyzeSegmentationFromImage`, not a two-buffer processFrame interface. |
| Platform selection | `bodyMeasurementService.ts:394–408`; iOS `MediaPipePoseLandmarkerModule.swift` | Android attempts MediaPipe pose, then MoveNet fallback; other platforms select MoveNet, requiring its runtime. Supplied iOS MediaPipe methods throw unimplemented errors. No cross-platform runtime success inferred. |
| Base estimate and segmentation | `bodyMeasurementService.ts:775–1105`; `BodyMeasurementScreen.tsx:327–366`, `:1411–1607`; `GoFitMobile/src/services/bodySegmentationService.ts:525–556` | Base estimate uses height and statistical priors. Segmentation is separately requested; eligible refinement, then rescue, then base retention. Segmentation calls for both images use Promise.all. |
| Review and save gates | `BodyMeasurementScreen.tsx:46`, `:415–444` | Error, minimum result confidence 0.25, blocking warnings, parse and range checks. Quality/confidence is not accuracy. |
| Actual persistence | `BodyMeasurementScreen.tsx:445–489` | Auth user lookup, insert corrected chest/waist/hip/shoulder values with height, raw result confidence, source and manual-overrides metadata. No photo upload, encrypted-photo step, or is_verified flag. |
| History and reset | `BodyMeasurementScreen.tsx:207–234`, `:477–489` | Reload latest measurement history, clear capture/result state, return to introduction. History failure can be caught after a successful insertion. |
| Camera denial | `BodyMeasurementScreen.tsx:550–563` | Permission request and access-required alert, not an invented settings-redirection modal. |

## Selected figure scope

- `figures/seq_measurement_ssd.png`: successful user journey, with an actor and visible capture/review states. Accepted captures and successful persistence are assumed; alternatives and exceptions are described in the adjacent table.
- `figures/seq_measurement_detailed.png`: Android analysis path where MediaPipe calls succeed. Repeated per-image calls are summarized; the capture-validation loop and main analysis both perform pose inference. Service internal numerical steps, diagnostic comparison, and local scan logging are omitted explicitly. Screen-level orchestration replaces the unsupported MeasurementStore participant.
- `figures/seq_measurement_save.png`: user review, passing save checks, authenticated insertion, and history reload. Supabase Auth and Data API are grouped as remote capabilities used through the configured client; no direct database connection is implied. A missing user or failed insert does not follow the successful continuation shown.

Matching SVG files and `figures/source/build_measurement_sequence_diagrams.py` accompany the PNGs. Pale blue software headers, dark blue text, charcoal actors/arrows/lifelines, gray frame borders, and white backgrounds match the approved sequence style; there is no notation legend.

All three figures were rendered and visually inspected. PNG integrity, SVG parsing, referenced-image existence, and unique report labels were checked. This was a source-based content correction against the previously verified schema baseline, not a new live query, device test, anthropometric accuracy study, or LaTeX compilation. Original estimated values can also enter the local diagnostic scan log before user review; this is distinct from the explicit save to the remote measurement table.
