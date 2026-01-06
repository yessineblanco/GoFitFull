# Post-Migration Checklist

## ✅ Database Structure Verification

### 1. Verify Tables Exist
```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('workouts', 'workout_exercises', 'workout_sessions', 'exercises');
```

### 2. Verify Columns Removed
```sql
-- Check workout_sessions doesn't have workout_name/workout_type
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'workout_sessions' 
AND column_name IN ('workout_name', 'workout_type');
-- Should return 0 rows

-- Check workouts doesn't have date/calories/type
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'workouts' 
AND column_name IN ('date', 'calories', 'type');
-- Should return 0 rows (or only 'type' if migration hasn't run yet)
```

### 3. Verify New Columns Added
```sql
-- Check workout_sessions has date and calories
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'workout_sessions' 
AND column_name IN ('date', 'calories');
-- Should return 2 rows

-- Check workout_exercises has snapshot fields
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'workout_exercises' 
AND column_name IN ('exercise_name', 'exercise_image_url', 'exercise_equipment', 'exercise_difficulty');
-- Should return 4 rows
```

### 4. Verify Foreign Key Constraints
```sql
-- Check all FK constraints exist
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('workouts', 'workout_exercises', 'workout_sessions')
ORDER BY tc.table_name, tc.constraint_name;
```

### 5. Verify Data Migration
```sql
-- Check workout_sessions have workout_id populated
SELECT COUNT(*) as total_sessions,
       COUNT(workout_id) as sessions_with_workout_id,
       COUNT(date) as sessions_with_date
FROM workout_sessions;

-- Check workout_exercises have snapshot fields populated
SELECT COUNT(*) as total_exercises,
       COUNT(exercise_name) as with_name,
       COUNT(exercise_image_url) as with_image
FROM workout_exercises;

-- Check no orphaned workout_sessions (sessions without valid workout_id)
SELECT COUNT(*) 
FROM workout_sessions ws
LEFT JOIN workouts w ON ws.workout_id = w.id
WHERE ws.workout_id IS NOT NULL AND w.id IS NULL;
-- Should return 0
```

---

## ✅ Application Functionality Testing

### 1. Native Workouts
- [ ] **Load native workouts** - Should show all native workouts
- [ ] **View workout details** - Should show exercises correctly
- [ ] **Start native workout** - Should create session with workout_id
- [ ] **Complete native workout** - Should save to workout_sessions
- [ ] **Resume native workout** - Should load incomplete session

### 2. Custom Workouts
- [ ] **Create custom workout** - Should create in workouts table
- [ ] **Add exercises to custom workout** - Should create in workout_exercises with snapshots
- [ ] **Edit custom workout** - Should update correctly
- [ ] **Delete custom workout** - Should cascade delete exercises
- [ ] **Start custom workout** - Should create session
- [ ] **Complete custom workout** - Should save correctly

### 3. Workout Sessions
- [ ] **Create session** - Should only require workout_id (no workout_name/type)
- [ ] **Session has date** - Should auto-populate date field
- [ ] **Save progress** - Should update exercises_completed
- [ ] **Complete session** - Should set completed_at and duration
- [ ] **View session history** - Should load from workout_sessions

### 4. Exercise Snapshots
- [ ] **New workout exercises** - Should have snapshot fields populated
- [ ] **Updated exercises** - Snapshots should preserve old data
- [ ] **Deleted exercises** - Snapshots should still exist in old workouts

### 5. Data Integrity
- [ ] **No duplicate workouts** - Each workout should appear once
- [ ] **No empty workouts** - All workouts should have exercises
- [ ] **Sessions linked correctly** - All sessions should have valid workout_id
- [ ] **Exercise references** - All workout_exercises should have valid exercise_id

---

## ✅ Edge Cases to Test

### 1. Legacy Data
- [ ] **Old sessions** - Sessions created before migration should still work
- [ ] **Missing workout_id** - Handle gracefully if workout_id is null
- [ ] **Deleted workouts** - Sessions should handle deleted workouts (SET NULL)

### 2. Error Handling
- [ ] **Invalid workout_id** - Should show error, not crash
- [ ] **Network errors** - Should handle gracefully
- [ ] **Concurrent updates** - Multiple users editing same workout

### 3. Performance
- [ ] **Load time** - Workouts should load quickly (< 2 seconds)
- [ ] **Large workouts** - Workouts with many exercises should work
- [ ] **Many sessions** - History with many sessions should load

---

## ✅ Code Verification

### 1. Search for Old Field References
```bash
# Search for workout_name usage (should only be in comments or old code)
grep -r "workout_name" src/

# Search for workout_type in workout_sessions context
grep -r "workout_type.*session" src/

# Search for date/calories in workouts context
grep -r "workouts.*date\|workouts.*calories" src/
```

### 2. Verify Service Layer
- [ ] **createWorkoutSession** - Only uses workout_id
- [ ] **createCustomWorkout** - Doesn't set date/calories/type
- [ ] **updateCustomWorkout** - Populates exercise snapshots
- [ ] **getWorkouts** - Filters empty workouts correctly

### 3. Verify Screens
- [ ] **LibraryScreen** - Loads workouts correctly
- [ ] **WorkoutDetailScreen** - Shows workout details
- [ ] **WorkoutSessionScreen** - Creates sessions correctly
- [ ] **WorkoutSummaryScreen** - Shows session summary

---

## ✅ Database Queries to Run

### Check Data Quality
```sql
-- Find workouts without exercises
SELECT w.id, w.name, w.workout_type
FROM workouts w
LEFT JOIN workout_exercises we ON w.id = we.workout_id
WHERE we.id IS NULL;

-- Find workout_exercises without snapshots
SELECT we.id, we.workout_id, we.exercise_id
FROM workout_exercises we
WHERE exercise_name IS NULL OR exercise_image_url IS NULL;

-- Find workout_sessions without date
SELECT id, workout_id, started_at
FROM workout_sessions
WHERE date IS NULL AND started_at IS NOT NULL;

-- Check for duplicate workout names (should be unique per user)
SELECT name, workout_type, COUNT(*) as count
FROM workouts
WHERE workout_type = 'custom'
GROUP BY name, workout_type
HAVING COUNT(*) > 1;
```

### Performance Checks
```sql
-- Check indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('workouts', 'workout_exercises', 'workout_sessions')
ORDER BY tablename, indexname;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('workouts', 'workout_exercises', 'workout_sessions', 'exercises')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## ✅ Rollback Plan (If Needed)

If something goes wrong, you can:

1. **Check migration logs** - See what was executed
2. **Restore from backup** - If you have database backups
3. **Manual fixes** - Use SQL to fix specific issues
4. **Revert code** - Go back to previous code version

---

## ✅ Next Steps After Verification

Once everything is verified:

1. **Remove old tables** (if cleanup script hasn't run):
   ```sql
   -- Run cleanup_old_workout_tables.sql if not already done
   ```

2. **Update documentation** - Document the new structure

3. **Monitor performance** - Watch for any slow queries

4. **User testing** - Have users test the app

5. **Production deployment** - Deploy to production when ready

---

## 🚨 Common Issues to Watch For

1. **Missing workout_id** - Sessions created before migration might not have workout_id
2. **Empty snapshots** - Old workout_exercises might not have snapshot fields
3. **Performance degradation** - New queries might be slower (add indexes if needed)
4. **RLS policies** - Make sure RLS policies work with new structure

---

## 📝 Notes

- All migrations should be idempotent (safe to run multiple times)
- Test in development/staging before production
- Keep backups before running migrations
- Monitor error logs after deployment












