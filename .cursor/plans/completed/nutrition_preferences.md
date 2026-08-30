# Nutrition Preferences & Client Info Collection

## Goal Description
Expand the nutrition module to track dietary preferences, explicitly exclude foods the client dislikes, and ensure this information is loaded from the client.

## Steps & Verification

1. **Database Schema Expansion**
   - [x] Add new columns to `user_profiles`: `dietary_preferences` (TEXT[]), `food_allergies` (TEXT[]), `food_dislikes` (TEXT[]).
   - [x] Create migration: `database/migrations/add_user_dietary_preferences_v1.sql`.
   - *Verify*: Run migration and confirm columns exist in Supabase SQL editor.

2. **Client App Store/Service Updates**
   - [x] Update `profileStore.ts` and API layers to fetch and sync the new arrays (`food_dislikes`, etc.).
   - *Verify*: Saving preferences in the app persists to the database.

3. **Onboarding Integration**
   - [x] Add a step to `OnboardingScreen` to prompt for dietary preferences and explicitly ask for "foods you dislike".
   - *Verify*: A new user completing onboarding saves this data correctly.

4. **Nutrition Screen Prompts**
   - [x] On the `NutritionScreen`, check if `food_dislikes` is `null`.
   - [x] If not available, render a prompt/card asking the client to fill out their nutrition profile.
   - *Verify*: Users without preferences see the prompt; clicking it allows them to enter data.

5. **Food Filtering Logic**
   - [x] When generating AI meal recommendations (or filtering searches), inject the `food_dislikes` arrays to explicitly exclude those foods.
   - [x] *Verify*: Food search or AI recommendations omit disliked ingredients.
