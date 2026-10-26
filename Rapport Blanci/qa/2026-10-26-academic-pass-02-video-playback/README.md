# Academic accuracy pass 2: exercise-video performance

26 October 2026. The user's “proceed” accepts the food-filtering correction and authorizes the next single issue: the exercise-video performance passage. This batch revises only the video subsection in Chapter 3 (Sprint 1), originally at source lines 984–989. The preceding offline-completion paragraph and the following workout-sequence paragraph remain unchanged.

## Finding

The original subsection asserted high-definition injury-prevention benefits, severe alternative-hosting costs/latency, a completed upload population of over 90 videos/99 canonical exercises, zero project egress charges, hardware-accelerated playback, automatic loop buffering, smooth seeking, fluid streaming and minimal battery drain. The inspected upload/player code establishes implementation mechanisms. It does not establish that collection of operational, billing and performance outcomes. EXERCISE-04 explicitly retains Partial playback evidence and control issues; S1-T06 remains Partial.

## Evidence inspected

- `admin-panel/lib/r2.ts`: `S3Client` and `PutObjectCommand` upload an object; the helper returns a URL from the configured public base. Configuration names were read; no credentials or environment values were collected.
- `admin-panel/app/api/upload/route.ts`: the administration upload route delegates to `uploadToR2` and returns the URL. This code is not a fresh successful upload observation.
- `GoFitMobile/src/screens/library/ExerciseDetailScreen.tsx`: `useVideoPlayer` consumes `exercise.video_url`, enables looping and time updates, handles status/error/loading, implements play/pause and seeking by changing `currentTime`, and calls fullscreen entry. Control implementations are distinguished from observed usability/performance.
- `GoFitMobile/package.json`: declares `expo-video`.
- `qa/2026-10-22/results.json`, EXERCISE-04: Partial; frames and five-second timeline rendered; play/pause/fullscreen entry reachable; center/upper-edge tap behavior differed; fullscreen control visibility problematic. No native errors captured is not proof of smooth playback or energy efficiency.

## Correction and boundaries

Renamed the subsection **Exercise Video Storage and Playback**. Described the upload/URL/player mechanisms, then the retained observation and absent benchmarks. Removed unsupported injury-prevention, inventory, cost, decoder, buffering, smoothness and battery guarantees rather than inventing measurements. A stored URL need not establish the hosting of every catalog item.

No app/backend changes, uploads, provider billing checks or new tests were performed. Other academic corrections, including offline claims, technical citations and the AI model table, await separate approval. `main-before.txt` preserves the exact starting source; `main-revision.diff` and `verification.json` record the bounded edit and preservation checks. Final build and affected-page inspection are recorded separately.
