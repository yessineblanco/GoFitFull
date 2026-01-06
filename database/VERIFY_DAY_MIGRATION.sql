-- Quick verification script to check if day migration was applied
-- Run this to verify the day column exists and has data

-- Check if day column exists
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'workout_exercises' 
AND column_name = 'day';

-- Check day distribution (how many exercises per day)
SELECT 
  day,
  COUNT(*) as exercise_count
FROM workout_exercises
GROUP BY day
ORDER BY day;

-- Check if any exercises don't have a day set (should be 0 after migration)
SELECT COUNT(*) as exercises_without_day
FROM workout_exercises
WHERE day IS NULL;

-- Sample data: Show a few exercises with their day values
SELECT 
  we.id,
  w.name as workout_name,
  e.name as exercise_name,
  we.day,
  we.exercise_order
FROM workout_exercises we
JOIN workouts w ON we.workout_id = w.id
JOIN exercises e ON we.exercise_id = e.id
ORDER BY w.name, we.day, we.exercise_order
LIMIT 20;












