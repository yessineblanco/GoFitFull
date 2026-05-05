# GoFit Saved Meal Management Technical Process

## Scope

This slice added basic management for saved meals:

- Rename a saved meal.
- Delete a saved meal with confirmation.

Item-level saved meal editing remains out of scope for this slice.

## Database

No new migration was needed.

The existing saved meal migration already created:

- `saved_meals_update_own`
- `saved_meals_delete_own`

Deleting a `saved_meals` row removes its `saved_meal_items` through the existing `ON DELETE CASCADE` foreign key.

## Service Layer

File: `GoFitMobile/src/services/nutrition.ts`

Added:

- `renameSavedMeal(id, name)`
  - Requires an authenticated user.
  - Trims and validates the name.
  - Updates only rows matching both saved meal id and current user id.
- `deleteSavedMeal(id)`
  - Requires an authenticated user.
  - Deletes only rows matching both saved meal id and current user id.

## Store

File: `GoFitMobile/src/stores/nutritionStore.ts`

Added:

- `renameSavedMeal(id, name)`
- `deleteSavedMeal(id)`

Both actions reload saved meals after completion so Add Food reflects the latest state.

## UI

File: `GoFitMobile/src/screens/nutrition/AddFoodScreen.tsx`

Saved meal rows now include:

- A pencil action that opens a rename modal.
- A delete action that confirms before deleting.
- Existing tap-to-log behavior remains on the main saved meal row content.

The rename modal is local to Add Food and uses the existing theme colors, typography, and modal pattern already present on the screen.

## Verification

Passed:

- `cd GoFitMobile && npm run type-check`
