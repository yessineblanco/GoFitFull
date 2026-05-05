---
name: GoFit Saved Meal Item Editing
overview: Add item-level editing for saved meals. Follow `.cursor/rules/karpathy-behavioral-guidelines.mdc`: keep scope narrow, add only the RLS policy needed for item updates, and verify with Supabase plus mobile type-check.
todos:
  - id: saved-meal-item-editing-plan
    content: "Create saved-meal item editing plan under .cursor"
    status: completed
  - id: saved-meal-item-editing-rls
    content: "Add owner-only saved_meal_items update policy"
    status: completed
  - id: saved-meal-item-editing-service
    content: "Add service/store methods for item serving update and removal"
    status: completed
  - id: saved-meal-item-editing-ui
    content: "Add saved meal edit modal for name, servings, and item removal"
    status: completed
  - id: saved-meal-item-editing-docs
    content: "Write technical process doc after completion"
    status: completed
isProject: false
---

# GoFit Saved Meal Item Editing

## Assumptions

- V1 should edit saved meal name and item servings in one modal.
- V1 should allow removing foods from a saved meal, but prevent removing the final item.
- Adding new foods into an existing saved meal can follow later.
- Updating item servings requires one additional owner-only RLS policy on `saved_meal_items`.

## Success Criteria

1. Supabase has an owner-only update policy for `saved_meal_items`.
2. Users can edit saved meal item servings.
3. Users can remove non-final saved meal items.
4. Users can rename a saved meal from the same edit modal.
5. `cd GoFitMobile && npm run type-check` passes.

## Living Log

### Done

- [x] Create saved-meal item editing plan under `.cursor`.
- [x] Add and apply saved meal item update RLS policy.
- [x] Add service/store item editing methods.
- [x] Add saved meal edit modal UI.
- [x] Verify mobile type-check and Supabase policy.
- [x] Write technical process doc.

## Verification

- `cd GoFitMobile && npm run type-check` passed.
- Supabase MCP confirmed `saved_meal_items_update_own` exists for `UPDATE`.
