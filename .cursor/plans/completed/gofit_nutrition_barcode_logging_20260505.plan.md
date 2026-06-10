---
name: GoFit Nutrition Barcode Logging
overview: Add a small barcode logging slice for faster nutrition entry after the market-retention roadmap. Follow `.cursor/rules/karpathy-behavioral-guidelines.mdc`: keep the change narrow, avoid dependency churn, and verify with Supabase schema checks plus mobile type-check.
todos:
  - id: barcode-schema
    content: "Add barcode support to food_items with an index for lookup"
    status: done
  - id: barcode-service
    content: "Thread barcode through nutrition types and lookup service"
    status: done
  - id: barcode-ui
    content: "Add Expo Camera barcode scanning to Add Food with graceful fallback"
    status: done
  - id: barcode-provider-cache
    content: "Add provider fallback and Supabase cache for unknown barcodes"
    status: done
  - id: imported-food-attribution
    content: "Add imported food source attribution and review note"
    status: done
isProject: false
---

# GoFit Nutrition Barcode Logging

## Assumptions

- `expo-camera` is already installed, so barcode scanning can be added without dependency changes.
- The current food catalog is local/Supabase-backed; this slice does not add an external food database API.
- A scanned barcode should only pick a food if the catalog has a matching barcode.
- No-match behavior should keep manual search available.

## Success Criteria

1. `food_items.barcode` exists in Supabase and is indexed.
2. Mobile nutrition service can look up foods by barcode.
3. Add Food screen can scan EAN/UPC barcodes and select matching foods.
4. Missing barcode matches show a non-blocking fallback.
5. `cd GoFitMobile && npm run type-check` passes.

## Next Phase: Provider Fallback and Cache

Goal: make real-world scans useful even when `food_items.barcode` is not populated yet.

Recommended approach:

1. Add a Supabase Edge Function: `food-barcode-lookup`.
2. Mobile sends the scanned barcode to the Edge Function when local Supabase lookup has no match.
3. Edge Function checks `food_items` first.
4. If missing, Edge Function fetches Open Food Facts by barcode.
5. Edge Function normalizes product nutrition into GoFit's `food_items` shape.
6. Edge Function inserts the normalized food into `food_items` with the barcode.
7. Mobile receives the cached/created food and reuses the existing picked-food flow.

Provider decision:

- Start with Open Food Facts because it is free/open and supports barcode product lookup.
- Treat imported values as suggested catalog data because coverage and quality vary.
- Keep USDA FoodData Central or a paid provider such as Nutritionix as later improvements if barcode coverage or data quality is not strong enough.

Verification:

- Scanning an unknown but valid Open Food Facts barcode creates one `food_items` row.
- Scanning the same barcode again returns the cached Supabase row without a duplicate.
- Failed provider lookups show the current manual-search fallback.
- Mobile type-check passes.

## Living Log

### Done

- [x] Add barcode schema migration and apply it to Supabase.
- [x] Add barcode lookup service support.
- [x] Add Add Food barcode scanner UI.
- [x] Verify mobile type-check.
- [x] **Provider fallback and cache:** add `food-barcode-lookup` Edge Function using Open Food Facts first, cache successful lookups into `food_items`, and call it from Add Food when direct barcode lookup misses.
- [x] **Imported food attribution:** add source fields to `food_items`, populate Open Food Facts imports, and show a review note before logging imported food.

### Completed

- [x] **2026-05-05 - Barcode schema:** added `food_items.barcode` and a partial unique index, then applied `add_food_item_barcodes_v1` through Supabase MCP.
- [x] **2026-05-05 - Barcode lookup service:** added `FoodItem.barcode`, barcode-aware selects, and `findFoodByBarcode()` with UPC/EAN normalization.
- [x] **2026-05-05 - Add Food scanner:** added an Expo Camera scanner button and modal to Add Food. Matching barcodes select the food; missing matches fall back to manual search with a clear message.
- [x] **2026-05-05 - Verification:** `cd GoFitMobile && npm run type-check` passed; Supabase confirmed `food_items.barcode` and `idx_food_items_barcode_unique`.
- [x] **2026-05-05 - Provider fallback and cache:** added `supabase/functions/food-barcode-lookup/index.ts`, deployed it with JWT verification enabled, and updated mobile barcode lookup to call the function when local catalog lookup misses. The function checks cache first, fetches Open Food Facts by barcode when needed, normalizes per-100g nutrition, inserts one cached `food_items` row, and returns it to the app. Verification: `cd GoFitMobile && npm run type-check` passed; Supabase Edge Function `food-barcode-lookup` deployed as version 1.
- [x] **2026-05-05 - Imported food attribution:** added `database/migrations/add_food_item_source_attribution_v1.sql`, threaded source fields through the nutrition service and Edge Function, redeployed `food-barcode-lookup` as version 2, and added a review note when selected food comes from Open Food Facts. Verification: `cd GoFitMobile && npm run type-check` passed; Supabase migration applied.
