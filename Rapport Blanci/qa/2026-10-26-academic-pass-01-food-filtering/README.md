# Academic accuracy pass 1: food-filtering contradiction

26 October 2026. The user approved proceeding one issue at a time after the assistant proposed starting with contradictory claims. This batch changes only the client nutrition preferences/name-filtering subsection of the authoritative `main.tex`. It does not proceed to other performance claims, technical citations, AI model-table repairs or length restructuring.

## Issue and location

Before revision, the Chapter 4 (Sprint 2) subsection at source lines 1347–1358 called the implementation an intelligent dietary exclusion engine, claimed enforcement in both search and recommendations, and guaranteed that results would not contain unsafe allergens. That contradicted the narrower implementation description elsewhere in the chapter, pending scenario S2-T04 and the FR-05 evidence matrix limitation.

## Supporting evidence

- `GoFitMobile/src/screens/nutrition/AddFoodScreen.tsx`, lines 95–99: combines profile `food_dislikes` and `food_allergies`, then passes them into `searchFoods`.
- `GoFitMobile/src/services/nutrition.ts`, lines 115–139: searches `food_items.name` with a case-insensitive pattern and adds a negated case-insensitive name pattern for each non-empty exclusion. This path does not query ingredient lists or verify allergen content.
- `qa/2026-10-22/results.json`: NUTRITION-02 records ordinary banana search; the retained nutrition scenarios do not demonstrate controlled allergy/dislike exclusion coverage. The report's S2-T04 remains Pending.
- Existing report text immediately before the nutrition sequence discussion already distinguishes name matching from ingredient verification and barcode retrieval. The revised subsection now agrees with that boundary and Table `tab:implementation-evidence`.
- The official Supabase `.not()` reference was consulted for operator semantics: https://supabase.com/docs/reference/javascript/not . The changelog Markdown fetch was attempted but the browser rejected its content type. No SDK, query, database or API change is made here.

## Correction

Renamed the subsection to **Client Nutrition Preferences and Name-Based Food Filtering**. Replaced the unsupported comparison with other fitness trackers and the blanket safety/recommendation claim with the source-defined search behavior, name/ingredient limitations and unchanged pending validation status. The existing profile-storage/onboarding description is preserved for a later independent review; this batch does not certify its database-index or routing details.

## Scope and verification

`main-before.txt` is a complete recoverable snapshot. `main-revision.diff` shows the exact edit. `verification.json` checks that everything outside this subsection, all QA matrix rows, figure references and bibliography source remain unchanged. No application tests, live database changes or new validation outcomes are claimed. The existing editor stays open; the built-in compiler result is retained separately. A source-matched review render is used only to inspect affected pages under the user's previously granted PDF-review authorization.
