# Mobile App – Video Interface Plan (Local Testing)

This document is the **planning phase** for the exercise video interface in the GoFit mobile app, to be tested locally before storage (e.g. R2) is in place.

---

## 1. Current State

### Where videos are used

| Location | Role of video / image |
|----------|------------------------|
| **ExerciseDetailScreen** | Main video playback: thumbnail/image by default, tap Play to open `expo-av` Video; supports `.mp4`, `.mov`, `.avi`, `.webm`, `.m3u8`; `.gif` shown as image. Close (X) returns to thumbnail. |
| **EnhancedRestTimer** | Uses `image_url` only (thumbnails during rest). No video playback here. |
| **WorkoutSessionScreen, MyWorkouts, TopWorkouts, YourPrograms, LibraryScreen, ExerciseSelectionScreen** | Use `image_url` (or mapped `image`) for thumbnails/cards only. |

So the **only screen that plays video** today is **ExerciseDetailScreen**.

### Current behavior (ExerciseDetailScreen)

- If `exercise.video_url` is a direct video URL (e.g. `.mp4`): show image/thumbnail, overlay Play button; tap Play → full-width video with native controls and Close (X).
- If `exercise.video_url` is a GIF: show GIF as image (no Play).
- If video fails to load: `onError` sets `videoError` and hides player (fallback to image).
- No loading indicator while the video is buffering; no explicit “Retry” when error occurs.

---

## 2. Goals for Local Testing

- Test the **video UI** (play, pause, close, controls) with **real or sample URLs** on device/simulator.
- Improve **feedback** (loading, error, retry) so behavior is clear when testing.
- Optionally support **local test data** (e.g. sample exercise with a known `video_url`) so you can test without backend storage.

---

## 3. Proposed Changes (Interface + Local Testing)

### 3.1 ExerciseDetailScreen – Video UX

- **Video loading state**  
  - While the video is loading/buffering, show a small spinner (or skeleton) over the video area so the user knows something is happening.
- **Error state**  
  - When `videoError` is true, show a short message (e.g. “Video couldn’t load”) and a **Retry** button that clears `videoError` and tries again (same URL). Keep fallback to `image_url` as today.
- **Optional: fullscreen**  
  - If useful for local testing, consider a fullscreen toggle (expo-av supports fullscreen). Can be deferred.

Use existing i18n keys where they exist (e.g. `playVideo`, `noVideo`); add keys for “Loading…”, “Video couldn’t load”, “Retry” if needed.

### 3.2 Local testing without storage

- **Option A – URL testing**  
  - In the admin panel, use the **Image URL** and **Video URL** fields to paste public test URLs (e.g. a sample MP4 from the web). Sync to Supabase as now; open the exercise in the app and test playback. No mobile code change.
- **Option B – Mock/sample exercise in app**  
  - Add a **dev-only** path: e.g. a “Test video” exercise or a small dev menu that opens ExerciseDetailScreen with a **hardcoded** exercise object whose `video_url` points to a known test MP4 (and `image_url` to a thumbnail). Use a public sample URL (e.g. a short Big Buck Bunny or similar). This allows testing the video UI even when the backend has no exercises with videos yet.
- **Option C – Local file (advanced)**  
  - For true “local” files, you’d need to either bundle a sample video in the app or use a file-picker and pass a `file://` URI. expo-av can support `file://` on device. This can be a later step if you need offline/local-file testing.

Recommendation: implement **3.1** (loading + error/retry), then use **Option A** or **Option B** for local testing.

### 3.3 Screens to verify (no code change required)

Confirm that when `image_url` / `video_url` are set (from URL fields or later from R2):

- **ExerciseDetailScreen**: Video plays, loading appears, error + retry work, close returns to thumbnail.
- **EnhancedRestTimer, WorkoutSessionScreen, MyWorkouts, TopWorkouts, YourPrograms, LibraryScreen, ExerciseSelectionScreen**: Thumbnails/cards still show correctly (they only use URLs, no change needed).

---

## 4. Suggested implementation order

1. **ExerciseDetailScreen**
   - Add loading state for video (spinner/skeleton).
   - Add error message + Retry button when `videoError` is true; on Retry, clear `videoError` and re-show the video (same `video_url`).
   - Add/use i18n for “Loading…”, “Video couldn’t load”, “Retry”.
2. **Local testing**
   - Prefer **Option A** (paste test video URL in admin, test in app).  
   - If you want to test without backend: implement **Option B** (dev-only “Test video” or dev menu with hardcoded sample exercise and `video_url`).
3. **Optional**
   - Fullscreen toggle for video.
   - Option C (local file) only if you need offline/local-file tests.

---

## 5. Out of scope for this plan

- Changes to how videos are **stored** (R2, etc.) – that stays in the admin/backend.
- In-app **recording** or **upload** of videos (future feature).
- Other screens already only use `image_url`; no change unless we add video playback there later.

---

## 6. Summary

| Item | Action |
|------|--------|
| **Admin upload** | When R2 is not configured, upload API returns 503 and message to use URL fields (already implemented). |
| **Video UI (ExerciseDetailScreen)** | Add loading state, error message + Retry; optional fullscreen. |
| **Local testing** | Use admin URL fields with public sample video URL (Option A), or dev-only sample exercise (Option B). |
| **Other screens** | No code change; verify thumbnails when URLs are set. |

After this plan is implemented, you can test the video interface locally using URL-based or dev-only sample data, and later plug in R2 (or other storage) without changing the mobile video flow.
