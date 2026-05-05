-- Migration: Add barcode lookup support to food items
-- Date: 2026-05-05
-- Purpose: Enable nutrition barcode scanning against the local food catalog.

ALTER TABLE public.food_items
ADD COLUMN IF NOT EXISTS barcode TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_food_items_barcode_unique
ON public.food_items (barcode)
WHERE barcode IS NOT NULL AND barcode <> '';
