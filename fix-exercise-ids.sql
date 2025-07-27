-- Fix exercise ID mismatches after migration
-- Run this in Supabase SQL Editor

-- First, let's see what exercises we have
SELECT 'Current exercises:' as info, id, name FROM exercises ORDER BY id;

-- Check what workout templates exist and their exercise references
SELECT 'Workout templates:' as info, wd.id, wd.name, de.exercise_id 
FROM workout_days wd 
LEFT JOIN day_exercises de ON wd.id = de.workout_day_id 
WHERE wd.is_template = true;

-- Check for missing exercise references
SELECT 'Missing exercises:' as info, de.exercise_id, COUNT(*) as count
FROM day_exercises de 
LEFT JOIN exercises e ON de.exercise_id = e.id 
WHERE e.id IS NULL 
GROUP BY de.exercise_id;

-- Option 1: Update exercise IDs to match current database
-- This maps old IDs to new IDs based on exercise names

-- Update Bench Press references (assuming it's now ID 1)
UPDATE day_exercises 
SET exercise_id = (SELECT id FROM exercises WHERE name = 'Bench Press' LIMIT 1)
WHERE exercise_id NOT IN (SELECT id FROM exercises) 
  AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Bench Press');

-- Update Overhead Press references (assuming it's now ID 6)  
UPDATE day_exercises 
SET exercise_id = (SELECT id FROM exercises WHERE name = 'Overhead Press' LIMIT 1)
WHERE exercise_id NOT IN (SELECT id FROM exercises) 
  AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Overhead Press');

-- Update Push-ups references (assuming it's now ID 5)
UPDATE day_exercises 
SET exercise_id = (SELECT id FROM exercises WHERE name = 'Push-ups' LIMIT 1)
WHERE exercise_id NOT IN (SELECT id FROM exercises) 
  AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Push-ups');

-- Update Tricep Dips references (assuming it's now ID 9)
UPDATE day_exercises 
SET exercise_id = (SELECT id FROM exercises WHERE name = 'Tricep Dips' LIMIT 1)
WHERE exercise_id NOT IN (SELECT id FROM exercises) 
  AND EXISTS (SELECT 1 FROM exercises WHERE name = 'Tricep Dips');

-- Verify the fix
SELECT 'After fix - templates:' as info, wd.name, e.name as exercise_name, de.target_sets, de.target_reps
FROM workout_days wd 
JOIN day_exercises de ON wd.id = de.workout_day_id 
JOIN exercises e ON de.exercise_id = e.id 
WHERE wd.is_template = true 
ORDER BY wd.name, de.exercise_order;