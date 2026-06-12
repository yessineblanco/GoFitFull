-- Preserve nutrition-goal owner access while caching auth.uid() once per
-- statement. The update policy keeps its existing implicit WITH CHECK behavior.

DROP POLICY IF EXISTS "nutrition_goals_select_own" ON public.nutrition_goals;
CREATE POLICY "nutrition_goals_select_own"
  ON public.nutrition_goals
  FOR SELECT
  TO public
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "nutrition_goals_insert_own" ON public.nutrition_goals;
CREATE POLICY "nutrition_goals_insert_own"
  ON public.nutrition_goals
  FOR INSERT
  TO public
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "nutrition_goals_update_own" ON public.nutrition_goals;
CREATE POLICY "nutrition_goals_update_own"
  ON public.nutrition_goals
  FOR UPDATE
  TO public
  USING ((SELECT auth.uid()) = user_id);
