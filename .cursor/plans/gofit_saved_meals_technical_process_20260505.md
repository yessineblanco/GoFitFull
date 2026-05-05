# GoFit Saved Meals Technical Process

## Scope

This slice added a narrow saved-meals workflow for nutrition retention:

- Save a non-empty logged meal section from the Nutrition screen.
- Show saved meals in Add Food when search is empty.
- Log a saved meal into the selected meal/date by inserting each saved item into `meal_logs`.

Editing, renaming, deleting, and custom naming are intentionally left for a later slice.

## Database

Migration: `database/migrations/create_saved_meals_v1.sql`

Created:

- `public.saved_meals`
  - `id`, `user_id`, `name`, `created_at`, `updated_at`
  - User-owned parent record for a reusable meal.
- `public.saved_meal_items`
  - `id`, `saved_meal_id`, `food_item_id`, `servings`, `item_order`, `created_at`
  - Ordered food rows belonging to a saved meal.

Indexes:

- `idx_saved_meals_user_created`
- `idx_saved_meal_items_meal_order`

Security:

- RLS enabled on both tables.
- `saved_meals` policies allow users to select, insert, update, and delete their own meals.
- `saved_meal_items` policies allow users to select, insert, and delete items only through saved meals they own.

The migration was applied through Supabase MCP to project `rdozeaacwaisgkpxjycn`.

## Mobile Service Layer

File: `GoFitMobile/src/services/nutrition.ts`

Added shared food select fields so barcode/source attribution remains available across food search, logs, recent foods, and saved meals.

Added types:

- `SavedMealItem`
- `SavedMeal`

Added service methods:

- `getSavedMeals(limit)`
  - Loads user-owned saved meals and nested saved meal items with food nutrition data.
- `saveMealFromLogs(name, logs)`
  - Creates one saved meal from existing `MealLogWithFood` rows.
  - Inserts item rows in their current order.
  - Deletes the parent saved meal if item insertion fails.
- `addSavedMealLog(savedMeal, mealType, date)`
  - Inserts one `meal_logs` row for each saved item.

## Mobile Store

File: `GoFitMobile/src/stores/nutritionStore.ts`

Added state:

- `savedMeals`

Added actions:

- `loadSavedMeals`
- `saveMeal`
- `addSavedMeal`

`refresh` now loads saved meals along with logs, recent foods, goals, water, and weekly nutrition summary.

## UI

File: `GoFitMobile/src/components/nutrition/MealSection.tsx`

Added an optional save action:

- Shows a bookmark-plus icon only when a meal section has logged foods.
- Calls `onSave(mealType, logs)` without changing existing add/delete behavior.

File: `GoFitMobile/src/screens/nutrition/NutritionScreen.tsx`

Added save-current-meal behavior:

- Builds a simple V1 name like `Breakfast - Tue, May 5`.
- Confirms with an alert before saving.
- Uses the nutrition store `saveMeal` action.

File: `GoFitMobile/src/screens/nutrition/AddFoodScreen.tsx`

Added saved-meal replay:

- Loads saved meals with recent foods.
- Shows saved meals above recent foods when search is empty.
- Tapping a saved meal logs all saved items to the currently selected meal/date and returns to Nutrition.

## Verification

Passed:

- `cd GoFitMobile && npm run type-check`
- Supabase MCP table existence check for `saved_meals` and `saved_meal_items`
- Supabase MCP policy check for saved meal RLS policies
- `git diff --check` with CRLF conversion warnings only

Supabase security advisors were also reviewed. They reported existing unrelated warnings in legacy schema/functions and auth configuration, but no saved-meal-specific warning.
