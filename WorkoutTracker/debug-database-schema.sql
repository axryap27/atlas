-- Debug database schema and RLS status
-- Run this in Supabase SQL Editor to diagnose issues

-- Check if RLS is enabled on tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('workout_days', 'sessions', 'set_logs', 'exercises');

-- Check user_id column types
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE column_name = 'user_id' 
AND table_schema = 'public'
ORDER BY table_name;

-- Check current user ID
SELECT auth.uid() as current_user_id;

-- Check if exercises exist
SELECT COUNT(*) as exercise_count FROM exercises;
SELECT name, category, muscle_group FROM exercises LIMIT 5;

-- Check existing sessions for current user
SELECT 
    s.id,
    s.user_id,
    s.start_time,
    s.end_time,
    wd.name as workout_name
FROM sessions s
LEFT JOIN workout_days wd ON s.workout_day_id = wd.id
WHERE s.user_id = auth.uid()::text
ORDER BY s.start_time DESC
LIMIT 5;

-- Check workout_days for current user
SELECT id, name, user_id, is_template, created_at 
FROM workout_days 
WHERE user_id = auth.uid()::text
ORDER BY created_at DESC
LIMIT 5;