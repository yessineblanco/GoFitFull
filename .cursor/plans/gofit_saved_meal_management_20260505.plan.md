---
name: GoFit Saved Meal Management
overview: Add basic saved-meal rename and delete actions. Follow `.cursor/rules/karpathy-behavioral-guidelines.mdc`: keep scope narrow, reuse the Add Food saved-meals surface, and verify with mobile type-check.
todos:
  - id: saved-meal-management-plan
    content: "Create saved-meal management plan under .cursor"
    status: completed
  - id: saved-meal-management-service
    content: "Add service/store methods for rename and delete"
    status: completed
  - id: saved-meal-management-ui
    content: "Add saved-meal row actions for rename and delete"
    status: completed
  - id: saved-meal-management-docs
    content: "Write technical process doc after completion"
    status: completed
isProject: false
---

# GoFit Saved Meal Management

## Assumptions

- V1 management belongs in Add Food because that is where saved meals are currently visible.
- V1 only needs rename and delete; editing saved meal items can follow later.
- Existing saved-meal RLS policies already allow update/delete on owned `saved_meals`.

## Success Criteria

1. Users can rename a saved meal from Add Food.
2. Users can delete a saved meal from Add Food with confirmation.
3. Store state refreshes after rename/delete.
4. `cd GoFitMobile && npm run type-check` passes.

## Living Log

### Done

- [x] Create saved-meal management plan under `.cursor`.
- [x] Add saved meal service/store management methods.
- [x] Add saved meal row rename/delete UI.
- [x] Verify mobile type-check.
- [x] Write technical process doc.

## Verification

- `cd GoFitMobile && npm run type-check` passed.
- No new Supabase migration was needed; existing saved meal RLS supports owner-only update/delete on `saved_meals`.
