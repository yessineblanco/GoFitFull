# Nutrition sequence correction

Approved scope applied on 21 October 2026: replace the existing nutrition system and technical sequences, add a separate logging/refresh sequence, and revise their adjacent use-case table, captions, subsection title, and explanatory paragraphs in `main.tex`. No application code or live database state was changed.

## Evidence ledger

| Behavior | Repository evidence | Report correction |
| --- | --- | --- |
| Name search | `GoFitMobile/src/screens/nutrition/AddFoodScreen.tsx:82–109`; `GoFitMobile/src/services/nutrition.ts:115–138` | Remote food-name search with negated name matches from profile allergies/dislikes. No ingredient conflict analysis, contraindication guarantee, or offline device catalog. Search failure clears results. |
| Barcode interaction | `AddFoodScreen.tsx:119–151` | Camera permission check, scan lock, direct service lookup, selected food on success; no-match/failure invites manual catalog search. No arbitrary nutrient-entry form in this path. |
| Initial catalog lookup | `nutrition.ts:141–180` | Normalize barcode candidates; query remote food_items through configured client. Invoke food-barcode-lookup only on no match. |
| Provider fallback | `supabase/functions/food-barcode-lookup/index.ts:34–173` | Function rechecks catalog, fetches names/nutriments from Open Food Facts on a miss, normalizes to 100 g serving label, inserts food item, returns record. Re-query after insertion error can recover concurrent insertion. No ingredient/allergen check. |
| Serving input | `AddFoodScreen.tsx:154–163` | Finite serving multiplier greater than 0 and at most 50. For imported products with 100 g serving basis, 1.5 servings represents 150 g. |
| Meal persistence | `GoFitMobile/src/stores/nutritionStore.ts:116–124`; `nutrition.ts:512–526` | Store delegates to service; authenticated insert into meal_logs with user/food reference/date/meal type/servings. Not nutrition_entries with copied nutrient fields. |
| Refresh and derived totals | `nutritionStore.ts:66–89`; `nutrition.ts:386–418`, `:455–470` | Refresh loads logs joined to food records and related state; computeTotals sums nutrients times servings. Water total is separate. Refresh catches errors after possible successful insert. |
| Display and goals | `GoFitMobile/src/screens/nutrition/NutritionScreen.tsx:60–64`, `:199`; `nutrition.ts:330–356` | Focus triggers refresh; MacroRings receives shared totals/goals. Missing goals can be initialized with defaults. No realtime subscription inferred. |
| Separate supported actions | `NutritionScreen.tsx:245–255`; `nutritionStore.ts:126–136`, `:157–165` | Preserve saved-meal and +250/+500 ml water actions as alternatives outside the selected barcode figures. |

## Figure scope

- `figures/seq_nutrition_ssd.png`: user actor, Add Food/scanner/product journey, successful logging and refresh. Errors and manual name-search alternatives are described in the table.
- `figures/seq_nutrition_detailed.png`: remote catalog match or conditional Edge Function/provider fallback. Nested optional fragments select usable provider data and successful insertion. Invalid code, missing/unusable provider product, provider error, and insertion-race recovery are explained in text rather than expanded in the figure. Data API participant represents authenticated client catalog reads and the function's own configured client operations.
- `figures/seq_nutrition_logging.png`: selected successful meal insertion and refresh. Add Food and Nutrition UI share an explicitly grouped participant. Authentication and insertion are summarized together; refresh service queries are grouped, not a literal trace of every request and pure computation. The computeTotals call is shown separately to identify service ownership. In code, water is read after computeTotals; that query interleaving is intentionally summarized in the figure. The screen's additional focus-triggered refresh is documented in text.

Matching SVG files and `figures/source/build_nutrition_sequence_diagrams.py` accompany the PNGs. All three retain the approved muted palette, thin lines, white background, actor for the system view, and no notation legend.

Verification: all three rendered figures were visually inspected; PNG integrity, SVG parsing, image-reference existence, and unique LaTeX labels were checked. This was a source-based report correction against the previously inspected schema baseline. No fresh live database query, deployed Edge Function execution, device barcode test, nutrition assessment, or report compilation was performed.
