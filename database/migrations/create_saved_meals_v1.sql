-- Migration: Create saved meals
-- Date: 2026-05-05
-- Purpose: Let users save and quickly re-log repeated meals.

CREATE TABLE IF NOT EXISTS public.saved_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.saved_meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_meal_id UUID NOT NULL REFERENCES public.saved_meals(id) ON DELETE CASCADE,
  food_item_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
  servings NUMERIC NOT NULL DEFAULT 1 CHECK (servings > 0 AND servings <= 50),
  item_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_meals_user_created
ON public.saved_meals (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_meal_items_meal_order
ON public.saved_meal_items (saved_meal_id, item_order);

ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_meal_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_meals_select_own ON public.saved_meals;
CREATE POLICY saved_meals_select_own
ON public.saved_meals
FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_meals_insert_own ON public.saved_meals;
CREATE POLICY saved_meals_insert_own
ON public.saved_meals
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_meals_update_own ON public.saved_meals;
CREATE POLICY saved_meals_update_own
ON public.saved_meals
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_meals_delete_own ON public.saved_meals;
CREATE POLICY saved_meals_delete_own
ON public.saved_meals
FOR DELETE
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_meal_items_select_own ON public.saved_meal_items;
CREATE POLICY saved_meal_items_select_own
ON public.saved_meal_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.saved_meals sm
    WHERE sm.id = saved_meal_items.saved_meal_id
      AND sm.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS saved_meal_items_insert_own ON public.saved_meal_items;
CREATE POLICY saved_meal_items_insert_own
ON public.saved_meal_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.saved_meals sm
    WHERE sm.id = saved_meal_items.saved_meal_id
      AND sm.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS saved_meal_items_delete_own ON public.saved_meal_items;
CREATE POLICY saved_meal_items_delete_own
ON public.saved_meal_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.saved_meals sm
    WHERE sm.id = saved_meal_items.saved_meal_id
      AND sm.user_id = (SELECT auth.uid())
  )
);
