# GoFit Migration Audit Technical Process

## Scope

This audit checked whether the recent database migrations affected the current app or created replay risk for future environments.

Reviewed migrations included:

- Nutrition fiber and water tracking.
- Workout wellness categories and wellness seed data.
- Food barcode and source attribution.
- Saved meals and saved meal item editing policies.

## Live Supabase Checks

Project: `rdozeaacwaisgkpxjycn`

Confirmed migration history includes:

- `extend_nutrition_water_fiber_v1`
- `extend_workouts_wellness_categories_v1`
- `seed_wellness_native_workouts_v1`
- `add_food_item_barcodes_v1`
- `add_food_item_source_attribution_v1`
- `create_saved_meals_v1`
- `add_saved_meal_item_update_policy_v1`

Confirmed expected columns exist:

- `food_items.fiber_g`
- `food_items.barcode`
- `food_items.food_source`
- `food_items.source_id`
- `food_items.source_url`
- `food_items.source_checked_at`
- `nutrition_goals.fiber_g`
- `nutrition_goals.water_ml_goal`
- `workouts.wellness_category`
- `water_logs` columns
- `saved_meals` columns
- `saved_meal_items` columns

Confirmed expected policies exist:

- `water_logs_select_own`
- `water_logs_insert_own`
- `water_logs_delete_own`
- `saved_meals_select_own`
- `saved_meals_insert_own`
- `saved_meals_update_own`
- `saved_meals_delete_own`
- `saved_meal_items_select_own`
- `saved_meal_items_insert_own`
- `saved_meal_items_update_own`
- `saved_meal_items_delete_own`

Confirmed expected indexes exist:

- `idx_food_items_barcode_unique`
- `idx_food_items_food_source`
- `idx_water_logs_user_date`
- `idx_saved_meals_user_created`
- `idx_saved_meal_items_meal_order`
- `idx_workouts_type_wellness_category`

Confirmed wellness seed data has exercises attached:

- `Balance and Core Basics`: 3 exercises
- `Functional Fitness Starter`: 4 exercises
- `Mobility Reset`: 3 exercises
- `Older Adult Strength Start`: 4 exercises
- `Recovery Strength Flow`: 4 exercises
- `Stress Reduction Circuit`: 4 exercises

## Local Migration Fix

File: `database/migrations/seed_wellness_native_workouts_v1.sql`

Fixed a replay-safety typo:

- Changed inserted column `target_workout_id` to live schema column `workout_id`.
- Changed inserted value `workout_id` to the PL/pgSQL variable `target_workout_id`.

The live database was already okay, but this fix makes future migration replay safer.

## Verification

Passed:

- `cd GoFitMobile && npm run type-check`
- `git diff --check` with CRLF conversion warnings only
