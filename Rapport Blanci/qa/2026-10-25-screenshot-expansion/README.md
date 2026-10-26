# Expanded screenshot coverage

25 October 2026. The user clarified that the earlier mobile coverage contained too few screenshots and that the administration captures were difficult to find. Added **19 retained captures in 10 additional figure groups**, giving **44 screenshot references in 23 screenshot figure groups** overall. Existing diagrams remain in place.

## Finding the administration panel

Chapter 5 now contains a clearly named **Administration Panel: Interface Walkthrough** heading with label `sec:admin-panel-screens`. The existing dashboard capture was relocated to the start of that walkthrough. User management and coach management follow, then the existing exercise catalog, workout editor, approval/audit excerpts, and new saved-view/settings captures. The browser sandbox-transaction excerpt remains beside the payment discussion and is explicitly cross-referenced from the walkthrough.

The screenshot-scope introduction in Chapter 3 links to this heading with an automatically generated page reference. The report's List of Figures continues to list every figure caption and page number. No page number is guessed or hardcoded.

## Additional screens

| Area | Added captures |
| --- | --- |
| Client profile/settings | Profile overview, unit preferences, language selection and notification preferences |
| Client workout creation | Exercise selector and the created disposable workout card |
| Client nutrition | Displayed daily targets, disposable food log and saved-meal entry |
| Client coaching | Existing assigned-program detail |
| Coach follow-up | Dashboard after the query correction, client progress, check-in scheduling, configured unsubmitted program draft and session-pack offer management |
| Administration | User-account management, coach-profile management, disposable saved BI view dialog and corrected settings-page profile-count summary |

The added rows total 19 captures. The existing dashboard is relocated, not counted as a newly captured or additional image. Capture dates remain those of the retained October QA; this expansion performs no new application or provider test.

## Selection and privacy

Candidates were visually inspected before inclusion. Loading-only assigned-program list capture and the misleadingly named dietary-profile capture were excluded. The existing assigned-program detail is a view of retained data, not evidence of a newly completed assignment. The configured program remains an unsaved draft; check-in responses remain empty. Nutrition values are displayed settings, not clinical recommendations. Admin account and profile counts are distinguished.

Original QA images remain unchanged. Report copies mask client identifiers and user/coach names/emails using solid pixel masks. The saved-view and database-summary images are cropped to their relevant content. assets.json records source and report-asset hashes plus exact final crop/mask rectangles. No replacement identities, synthetic screens or invented test results were introduced. expand.py records the initial insertion; final privacy-mask refinements and the saved-view crop are reflected in assets.json.

## Verification

Unique labels, resolving figure paths, balanced figure/minipage/table environments, preserved requirement/sprint/final-QA rows and unchanged General Conclusion were checked. The same authoritative main.tex is compiled through the built-in editor; no replacement report, separate PDF or new tab is created. Full page-by-page PDF visual acceptance is not claimed.

main-before.txt, main-revision.diff, assets.json and figures.json preserve the content transition. Compilation results and verification.json record the final build/check status.
