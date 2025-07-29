-- Fix database schema for authentication (v2 - handles foreign keys)
-- Run this in Supabase SQL Editor

-- STEP 1: Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can view their own workout days" ON workout_days;
DROP POLICY IF EXISTS "Users can insert their own workout days" ON workout_days;
DROP POLICY IF EXISTS "Users can update their own workout days" ON workout_days;
DROP POLICY IF EXISTS "Users can delete their own workout days" ON workout_days;

DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON sessions;

DROP POLICY IF EXISTS "Users can view their own set logs" ON set_logs;
DROP POLICY IF EXISTS "Users can insert their own set logs" ON set_logs;
DROP POLICY IF EXISTS "Users can update their own set logs" ON set_logs;
DROP POLICY IF EXISTS "Users can delete their own set logs" ON set_logs;

-- STEP 2: Delete existing data (necessary for schema changes)
DELETE FROM set_logs;
DELETE FROM sessions;
DELETE FROM day_exercises;
DELETE FROM workout_days WHERE user_id IS NOT NULL;

-- STEP 3: Drop foreign key constraints temporarily
ALTER TABLE workout_days DROP CONSTRAINT IF EXISTS workout_days_user_id_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;

-- STEP 4: Change user_id columns to TEXT (UUID format)
ALTER TABLE workout_days ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE sessions ALTER COLUMN user_id TYPE TEXT;

-- STEP 5: No need to recreate foreign key constraints to auth.users
-- Supabase auth handles this differently

-- STEP 6: Enable RLS on all user-specific tables
ALTER TABLE workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;

-- STEP 7: Create RLS policies for workout_days
CREATE POLICY "Users can view their own workout days" ON workout_days
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own workout days" ON workout_days
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own workout days" ON workout_days
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own workout days" ON workout_days
    FOR DELETE USING (auth.uid()::text = user_id);

-- STEP 8: Create RLS policies for sessions
CREATE POLICY "Users can view their own sessions" ON sessions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own sessions" ON sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own sessions" ON sessions
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own sessions" ON sessions
    FOR DELETE USING (auth.uid()::text = user_id);

-- STEP 9: Create RLS policies for set_logs (through session relationship)
CREATE POLICY "Users can view their own set logs" ON set_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = set_logs.session_id 
            AND auth.uid()::text = sessions.user_id
        )
    );

CREATE POLICY "Users can insert their own set logs" ON set_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = set_logs.session_id 
            AND auth.uid()::text = sessions.user_id
        )
    );

CREATE POLICY "Users can update their own set logs" ON set_logs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = set_logs.session_id 
            AND auth.uid()::text = sessions.user_id
        )
    );

CREATE POLICY "Users can delete their own set logs" ON set_logs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = set_logs.session_id 
            AND auth.uid()::text = sessions.user_id
        )
    );

-- STEP 10: Verify the setup
SELECT 'Database fix completed successfully!' as status;
SELECT 'Current user ID: ' || COALESCE(auth.uid()::text, 'Not authenticated') as user_info;
SELECT 'Exercise count: ' || COUNT(*)::text as exercise_info FROM exercises;