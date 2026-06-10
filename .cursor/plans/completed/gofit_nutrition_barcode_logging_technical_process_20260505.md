# GoFit Nutrition Barcode Logging Technical Process

Date: 2026-05-05

## Scope

This follow-up adds barcode scanning to nutrition logging without adding dependencies or external food APIs. The scanner looks up foods that already exist in the Supabase catalog.

## Database

Migration: `database/migrations/add_food_item_barcodes_v1.sql`

- Added nullable `food_items.barcode`.
- Added partial unique index `idx_food_items_barcode_unique` for non-empty barcodes.
- Applied the migration through Supabase MCP.

Migration: `database/migrations/add_food_item_source_attribution_v1.sql`

- Added `food_items.food_source` with default `gofit`.
- Added `source_id`, `source_url`, and `source_checked_at`.
- Added a check constraint for supported sources.
- Added an index on `food_source`.

## Mobile Service

Updated `GoFitMobile/src/services/nutrition.ts`.

- Added optional `barcode` to `FoodItem`.
- Included `barcode` in food search, meal log, and recent food selects.
- Added `findFoodByBarcode()`.
- Normalizes UPC/EAN variants by checking the scanned code, adding a leading zero for UPC-A to EAN-13, and stripping a leading zero from EAN-13 when appropriate.
- Threaded source attribution fields through all food item reads.

## Mobile UI

Updated `GoFitMobile/src/screens/nutrition/AddFoodScreen.tsx`.

- Added a scan button inside the existing search field.
- Uses `expo-camera` `CameraView` and `useCameraPermissions`.
- Scans EAN-13, EAN-8, UPC-A, and UPC-E.
- If a barcode matches a catalog item, the existing picked-food flow is reused.
- If no local match exists, the screen calls the provider/cache Edge Function.
- If the selected food is imported from Open Food Facts, the screen shows a review note before logging.
- If no provider match exists, the screen shows a fallback message and keeps manual search available.

## Provider Fallback

Added `supabase/functions/food-barcode-lookup/index.ts`.

- Deployed as Supabase Edge Function `food-barcode-lookup` with JWT verification enabled.
- Checks `food_items` first by normalized UPC/EAN candidates.
- Uses Open Food Facts v2 product lookup when the barcode is missing locally.
- Requests a narrow field set: product names, brands, and nutriments.
- Normalizes imported nutrition to GoFit's current per-100g catalog shape.
- Inserts one cached `food_items` row with `barcode`.
- Populates `food_source`, `source_id`, `source_url`, and `source_checked_at` for imported rows.
- Handles duplicate/race inserts by re-reading the cached barcode row.

## Verification

- `cd GoFitMobile && npm run type-check` passed.
- Supabase confirmed `food_items.barcode` exists.
- Supabase confirmed `idx_food_items_barcode_unique` exists.
- Supabase deployed `food-barcode-lookup` as version 1.
- Supabase deployed attribution-aware `food-barcode-lookup` as version 2.

## Follow-Ups

- Add a controlled admin/import workflow for barcode-enriched foods.
- Consider an external food database only after deciding data quality, cost, and privacy constraints.
- Add provider attribution/quality labels if imported food data is shown outside the logging flow.
