# GoFit Saved Meal Item Editing Technical Process

## Scope

This slice completed the saved-meal loop by letting users edit the contents of an existing saved meal:

- Rename the saved meal from the edit modal.
- Change servings for each saved meal item.
- Remove foods from a saved meal while keeping at least one item.

Adding new foods into an existing saved meal is intentionally left for a later slice.

## Database

Migration: `database/migrations/add_saved_meal_item_update_policy_v1.sql`

Added one RLS policy:

- `saved_meal_items_update_own`

The policy allows `UPDATE` only when the saved meal item belongs to a `saved_meals` row owned by the current authenticated user.

The migration was applied through Supabase MCP to project `rdozeaacwaisgkpxjycn`.

## Service Layer

File: `GoFitMobile/src/services/nutrition.ts`

Added:

- `updateSavedMealItemServings(itemId, servings)`
  - Requires an authenticated user.
  - Validates servings as greater than 0 and no more than 50.
  - Updates `saved_meal_items.servings`; ownership is enforced by RLS.
- `deleteSavedMealItem(itemId)`
  - Requires an authenticated user.
  - Deletes a saved meal item; ownership is enforced by RLS.

## Store

File: `GoFitMobile/src/stores/nutritionStore.ts`

Added:

- `updateSavedMealItemServings(itemId, servings)`
- `deleteSavedMealItem(itemId)`

Both actions reload saved meals after completion so the Add Food screen stays current.

## UI

File: `GoFitMobile/src/screens/nutrition/AddFoodScreen.tsx`

The saved meal pencil action now opens an edit modal instead of a rename-only modal.

The modal includes:

- Saved meal name field.
- One row per saved meal food.
- Servings input per item.
- Remove action per item, guarded so the final item cannot be removed.
- Save/cancel actions.

On save, the screen applies the rename, removals, and serving changes through the nutrition store.

## Verification

Passed:

- `cd GoFitMobile && npm run type-check`
- Supabase MCP policy check for `saved_meal_items_update_own`
