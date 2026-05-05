-- Migration: Add food item source attribution
-- Date: 2026-05-05
-- Purpose: Distinguish GoFit/local foods from imported barcode provider data.

ALTER TABLE public.food_items
ADD COLUMN IF NOT EXISTS food_source TEXT NOT NULL DEFAULT 'gofit',
ADD COLUMN IF NOT EXISTS source_id TEXT,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS source_checked_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'food_items_food_source_check'
      AND conrelid = 'public.food_items'::regclass
  ) THEN
    ALTER TABLE public.food_items
    ADD CONSTRAINT food_items_food_source_check
    CHECK (food_source IN ('gofit', 'open_food_facts'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_food_items_food_source
ON public.food_items (food_source);
