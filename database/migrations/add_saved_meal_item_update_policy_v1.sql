CREATE POLICY saved_meal_items_update_own
  ON public.saved_meal_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.saved_meals sm
      WHERE sm.id = saved_meal_items.saved_meal_id
        AND sm.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.saved_meals sm
      WHERE sm.id = saved_meal_items.saved_meal_id
        AND sm.user_id = (SELECT auth.uid())
    )
  );
