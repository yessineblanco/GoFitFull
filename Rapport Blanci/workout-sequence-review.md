# Workout sequence correction

Status: approved and applied, 21 October 2026. Scope: the workout system sequence, technical online sequence, an added offline continuation, and their adjacent use-case table and explanatory text in `main.tex`. Only authoritative report files were edited.

## Evidence and corrections

| Behavior | Repository evidence | Result in report |
| --- | --- | --- |
| Start action creates a remote session | `GoFitMobile/src/screens/library/WorkoutSessionScreen.tsx:401–443`; `GoFitMobile/src/services/workouts.ts:726–795` | Separate selection and start; creation INSERT precedes execution. Existing incomplete-session handling is explained in prose, outside the selected diagram messages. |
| Local set input | `WorkoutSessionScreen.tsx:531–595` | Weight and completion flags; no claim of independent performed-repetition or RPE capture. |
| Rest timer and feedback | `WorkoutSessionScreen.tsx:600–645`, `:1940–1953` | Local rest-timer state and display; completion haptic feedback. No precise background-alarm guarantee. |
| Feedback before final save | `WorkoutSessionScreen.tsx:737–790` | Finish opens feedback; submission prepares completion payload. |
| Completion persistence | `GoFitMobile/src/services/workouts.ts:802–850` | UPDATE existing session, filtered by session ID and user ID, including embedded exercise snapshots. No separate workout_sets INSERT or IN_PROGRESS status field. Supabase Data API is the remote participant. |
| Summary | `GoFitMobile/src/screens/library/WorkoutSummaryScreen.tsx:163–187` | Duration, marked-complete sets, calculated volume from configured repetitions and recorded weights. No personal-record badges claimed. |
| Disconnected fallback | `WorkoutSessionScreen.tsx:851–902` | Failed completion followed by disconnected NetInfo result; successful local enqueue permits summary. Queue failure displays retry error. Offline notes omit the online difficulty prefix. |
| Queue persistence and retry | `GoFitMobile/src/services/offlineQueue.ts:23–83`; `GoFitMobile/App.tsx:187–199` | AsyncStorage queue; application connectivity listener triggers syncAll; retry existing-session UPDATE, then remove successful entry. Failed remote updates remain queued. |

The database comparison baseline is the previously inspected live schema snapshot in `deployed-schema-check.json`. No new live query or runtime test was performed for this correction. The source establishes the depicted implementation, not successful execution on every device or immunity to data loss.

## Diagram scope

- `figures/seq_workout_ssd.png`: successful online user/system interaction.
- `figures/seq_workout_detailed.png`: selected technical creation, local execution, and online completion path. Exercise retrieval, intermediate saves, optional calendar updates, and store housekeeping are summarized or omitted explicitly in the text.
- `figures/seq_workout_offline.png`: disconnected fallback after a session already exists, followed by a later successful synchronization. Screen and application listener share an application lifeline; message labels distinguish callers. Failure branches are described in the text.
- Matching editable SVG files and `figures/source/build_workout_sequence_diagrams.py` accompany the PNG figures.

All three figures were visually inspected after rendering. Labels, image references, and SVG parsing were checked. The approved color follow-up uses pale blue participant headers, dark blue header text, charcoal actors/arrows/lifelines, gray frame borders, and a white background, with no notation legend. The report was not compiled, and no application code or database was changed.
