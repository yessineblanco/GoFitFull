-- Migration: Add exercise image URLs
-- This migration adds image URLs to exercises in the database
-- Uses Unsplash and other free image sources for exercise illustrations
-- Date: 2024

-- ============================================
-- UPDATE EXERCISES WITH IMAGE URLS
-- ============================================

-- Update exercises with image URLs
-- Using placeholder images from a free CDN service
-- You can replace these with your own image URLs or upload to Supabase Storage
UPDATE public.exercises
SET image_url = CASE name
  -- Chest Exercises
  WHEN 'Bench Press' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&q=80'
  WHEN 'Incline Dumbbell Press' THEN 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=800&fit=crop&q=80'
  WHEN 'Chest Fly' THEN 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=800&fit=crop&q=80'
  
  -- Back Exercises
  WHEN 'Deadlift' THEN 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&h=800&fit=crop&q=80'
  WHEN 'Pull Up' THEN 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=800&fit=crop&q=80'
  WHEN 'Barbell Rows' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&q=80'
  
  -- Leg Exercises
  WHEN 'Squat' THEN 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&h=800&fit=crop&q=80'
  WHEN 'Leg Press' THEN 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=800&fit=crop&q=80'
  
  -- Shoulder Exercises
  WHEN 'Shoulder Press' THEN 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=800&fit=crop&q=80'
  WHEN 'Lateral Raise' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&q=80'
  
  -- Arm Exercises
  WHEN 'Bicep Curl' THEN 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=800&fit=crop&q=80'
  WHEN 'Tricep Extension' THEN 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=800&fit=crop&q=80'
  
  ELSE image_url -- Keep existing image_url if exercise name doesn't match
END,
updated_at = TIMEZONE('utc'::text, NOW())
WHERE name IN (
  'Bench Press',
  'Incline Dumbbell Press',
  'Chest Fly',
  'Deadlift',
  'Pull Up',
  'Barbell Rows',
  'Squat',
  'Leg Press',
  'Shoulder Press',
  'Lateral Raise',
  'Bicep Curl',
  'Tricep Extension'
);

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this query to verify the images were added:
-- SELECT name, image_url FROM public.exercises WHERE image_url IS NOT NULL ORDER BY name;

-- ============================================
-- NOTES
-- ============================================
-- The image URLs above use Unsplash, which provides free high-quality images.
-- These are placeholder URLs - you may want to replace them with more specific exercise images.
-- 
-- To add more exercises, simply add more WHEN clauses to the CASE statement.
-- 
-- RECOMMENDED: Upload your own exercise images to Supabase Storage for better control:
-- 1. Create a storage bucket called 'exercise-images' in Supabase
-- 2. Upload images with descriptive filenames (e.g., 'bench-press.jpg')
-- 3. Make the bucket public
-- 4. Update the URLs to: 'https://[your-project-id].supabase.co/storage/v1/object/public/exercise-images/[filename].jpg'
--
-- Alternative free image sources:
-- - Unsplash: https://unsplash.com/s/photos/[exercise-name]
-- - Pexels: https://www.pexels.com/search/[exercise-name]/
-- - Pixabay: https://pixabay.com/images/search/[exercise-name]/
--
-- To find better Unsplash images, search for specific exercises and use the direct image URL.

