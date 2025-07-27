-- Test script to add a sample workout session
-- Run this in Supabase SQL Editor to create test data

-- Insert a test workout session using the Push Day template
INSERT INTO sessions (user_id, workout_day_id, start_time, end_time, duration, notes) 
SELECT 
  1,
  wd.id,
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour',
  60,
  'Great chest workout!'
FROM workout_days wd 
WHERE wd.name = 'Push Day' AND wd.user_id = 1
LIMIT 1;

-- Get the session ID we just created
DO $$
DECLARE
    session_id INTEGER;
    push_day_id INTEGER;
    bench_press_id INTEGER;
    pushup_id INTEGER;
BEGIN
    -- Get the session ID
    SELECT s.id INTO session_id 
    FROM sessions s 
    JOIN workout_days wd ON s.workout_day_id = wd.id 
    WHERE wd.name = 'Push Day' AND s.user_id = 1 
    ORDER BY s.start_time DESC 
    LIMIT 1;
    
    -- Get exercise IDs
    SELECT id INTO bench_press_id FROM exercises WHERE name = 'Bench Press';
    SELECT id INTO pushup_id FROM exercises WHERE name = 'Push-ups';
    
    -- Add some set logs for the session
    INSERT INTO set_logs (session_id, exercise_id, set_number, reps, weight) VALUES
    (session_id, bench_press_id, 1, 10, 135),
    (session_id, bench_press_id, 2, 8, 145),
    (session_id, bench_press_id, 3, 6, 155),
    (session_id, pushup_id, 1, 15, NULL),
    (session_id, pushup_id, 2, 12, NULL),
    (session_id, pushup_id, 3, 10, NULL);
    
    RAISE NOTICE 'Created test session with ID: %', session_id;
END $$;

-- Verify the data was created
SELECT 
  s.id,
  s.start_time,
  s.end_time,
  s.duration,
  wd.name as workout_name,
  COUNT(sl.id) as total_sets
FROM sessions s
LEFT JOIN workout_days wd ON s.workout_day_id = wd.id
LEFT JOIN set_logs sl ON s.id = sl.session_id
WHERE s.user_id = 1
GROUP BY s.id, s.start_time, s.end_time, s.duration, wd.name
ORDER BY s.start_time DESC;