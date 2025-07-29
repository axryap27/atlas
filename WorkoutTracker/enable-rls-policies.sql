-- Enable Row Level Security (RLS) for user data
-- Run this in Supabase SQL Editor

-- Enable RLS on all user-specific tables
ALTER TABLE workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;

-- Exercises table doesn't need RLS as it's shared across all users
-- Users don't have RLS enabled as it's managed by Supabase auth

-- Create RLS policies for workout_days
CREATE POLICY "Users can view their own workout days" ON workout_days
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own workout days" ON workout_days
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own workout days" ON workout_days
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own workout days" ON workout_days
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create RLS policies for sessions
CREATE POLICY "Users can view their own sessions" ON sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own sessions" ON sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own sessions" ON sessions
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own sessions" ON sessions
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create RLS policies for set_logs (through session relationship)
CREATE POLICY "Users can view their own set logs" ON set_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = set_logs.session_id 
            AND auth.uid()::text = sessions.user_id::text
        )
    );

CREATE POLICY "Users can insert their own set logs" ON set_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = set_logs.session_id 
            AND auth.uid()::text = sessions.user_id::text
        )
    );

CREATE POLICY "Users can update their own set logs" ON set_logs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = set_logs.session_id 
            AND auth.uid()::text = sessions.user_id::text
        )
    );

CREATE POLICY "Users can delete their own set logs" ON set_logs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = set_logs.session_id 
            AND auth.uid()::text = sessions.user_id::text
        )
    );

-- Update user_id columns to be text (UUID) instead of integer
-- First, we need to update the existing data structure

-- Note: You'll need to update your existing data if you have any
-- This assumes you're starting fresh or have minimal test data

-- Show current user_id types
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE column_name = 'user_id' 
AND table_schema = 'public';