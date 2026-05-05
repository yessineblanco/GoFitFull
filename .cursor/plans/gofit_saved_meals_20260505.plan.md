---
name: GoFit Saved Meals
overview: Add saved meals as the next nutrition retention slice after barcode logging. Follow `.cursor/rules/karpathy-behavioral-guidelines.mdc`: keep scope narrow, reuse existing nutrition services/screens, and verify with Supabase schema checks plus mobile type-check.
todos:
  - id: saved-meals-schema
    content: "Create saved_meals and saved_meal_items with user-owned RLS"
    status: completed
  - id: saved-meals-service
    content: "Add saved meal service/store methods for save, load, and log"
    status: completed
  - id: saved-meals-ui
    content: "Add save-current-meal and log-saved-meal UI"
    status: completed
isProject: false
---

# GoFit Saved Meals

## Assumptions

- Users often repeat full meals, not only individual foods.
- V1 can save an existing logged meal section with an auto-generated name.
- V1 can log a saved meal into the currently selected meal/date from Add Food.
- Renaming, editing saved meal contents, and deleting saved meals can follow later.

## Success Criteria

1. Supabase has user-owned saved meal tables with RLS.
2. A non-empty meal section can be saved.
3. Saved meals appear in Add Food when search is empty.
4. Logging a saved meal inserts each saved item into `meal_logs`.
5. `cd GoFitMobile && npm run type-check` passes.

## Living Log

### Done

- [x] Add saved meal schema migration and apply it.
- [x] Add saved meal service/store support.
- [x] Add Nutrition and Add Food UI.
- [x] Verify mobile type-check and Supabase schema.

## Verification

- `cd GoFitMobile && npm run type-check` passed.
- Supabase MCP confirmed `saved_meals` and `saved_meal_items` exist.
- Supabase MCP confirmed RLS policies for select/insert/update/delete on `saved_meals` and select/insert/delete on `saved_meal_items`.
- `git diff --check` passed with existing CRLF conversion warnings only.
- Supabase security advisors were checked; new saved-meal tables were not called out. Existing unrelated warnings remain for legacy functions, one RLS-enabled table without policies, permissive service-role insert policies, a public storage listing policy, and leaked-password protection.
