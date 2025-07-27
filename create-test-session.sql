-- Create a test workout session that matches your previous workout
-- Run this in Supabase SQL Editor

-- First, let's see what templates we have
SELECT id, name FROM workout_days WHERE is_template = true AND user_id = 1;

-- Create a test session from Push Day template (completed yesterday)
INSERT INTO sessions (user_id, workout_day_id, start_time, end_time, duration, notes) 
SELECT 
  1,
  wd.id,
  NOW() - INTERVAL '1 day' + INTERVAL '10:00:00', -- Yesterday at 10 AM
  NOW() - INTERVAL '1 day' + INTERVAL '11:15:00', -- Yesterday at 11:15 AM
  75, -- 1 hour 15 minutes
  'Great push workout - migrated from Railway'
FROM workout_days wd 
WHERE wd.name = 'Push Day' AND wd.user_id = 1 AND wd.is_template = true
LIMIT 1;

-- Get the session we just created
WITH latest_session AS (
  SELECT s.id as session_id
  FROM sessions s 
  JOIN workout_days wd ON s.workout_day_id = wd.id 
  WHERE wd.name = 'Push Day' AND s.user_id = 1 
  ORDER BY s.start_time DESC 
  LIMIT 1
)
-- Add realistic set logs for the session
INSERT INTO set_logs (session_id, exercise_id, set_number, reps, weight)
SELECT 
  ls.session_id,
  e.id,
  sl.set_number,
  sl.reps,
  sl.weight
FROM latest_session ls
CROSS JOIN (VALUES 
  -- Bench Press sets
  ('Bench Press', 1, 8, 135),
  ('Bench Press', 2, 6, 155),
  ('Bench Press', 3, 5, 165),
  ('Bench Press', 4, 4, 175),
  
  -- Overhead Press sets  
  ('Overhead Press', 1, 10, 95),
  ('Overhead Press', 2, 8, 105),
  ('Overhead Press', 3, 6, 115),
  
  -- Push-ups
  ('Push-ups', 1, 15, NULL),
  ('Push-ups', 2, 12, NULL),
  ('Push-ups', 3, 10, NULL)
) AS sl(exercise_name, set_number, reps, weight)
JOIN exercises e ON e.name = sl.exercise_name;

-- Verify the session was created correctly
SELECT 
  s.id,
  s.start_time::date as workout_date,
  s.duration,
  wd.name as workout_name,
  COUNT(DISTINCT sl.exercise_id) as exercises_count,
  COUNT(sl.id) as total_sets,
  COALESCE(SUM(sl.weight * sl.reps), 0) as total_volume
FROM sessions s
LEFT JOIN workout_days wd ON s.workout_day_id = wd.id
LEFT JOIN set_logs sl ON s.id = sl.session_id
WHERE s.user_id = 1
GROUP BY s.id, s.start_time, s.duration, wd.name
ORDER BY s.start_time DESC
LIMIT 5;