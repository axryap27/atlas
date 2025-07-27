-- Supabase Migration Script for Workout Tracker
-- Run this in Supabase SQL Editor

-- Enable Row Level Security (RLS) - we'll configure auth later
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Supabase auth will handle this, but keeping for compatibility)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'flexibility', 'core')),
  muscle_group TEXT,
  equipment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout days/templates table
CREATE TABLE IF NOT EXISTS workout_days (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  is_template BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Day exercises (exercises within a workout template)
CREATE TABLE IF NOT EXISTS day_exercises (
  id SERIAL PRIMARY KEY,
  workout_day_id INTEGER REFERENCES workout_days(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
  target_sets INTEGER,
  target_reps INTEGER,
  target_weight DECIMAL(5,2),
  target_time INTEGER, -- seconds
  rest_time INTEGER, -- seconds
  exercise_order INTEGER,
  notes TEXT
);

-- Workout sessions
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  workout_day_id INTEGER REFERENCES workout_days(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- minutes
  notes TEXT,
  location TEXT,
  body_weight DECIMAL(5,2)
);

-- Set logs (individual sets performed)
CREATE TABLE IF NOT EXISTS set_logs (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight DECIMAL(5,2),
  duration INTEGER, -- seconds
  distance DECIMAL(6,2),
  rest_time INTEGER, -- seconds
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10), -- Rate of Perceived Exertion
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_set_logs_session_id ON set_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_exercise_id ON set_logs(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_days_user_id ON workout_days(user_id);
CREATE INDEX IF NOT EXISTS idx_day_exercises_workout_day_id ON day_exercises(workout_day_id);

-- Insert some default exercises (same as your current database)
INSERT INTO exercises (name, category, muscle_group, equipment) VALUES
('Bench Press', 'strength', 'chest', 'barbell'),
('Squat', 'strength', 'legs', 'barbell'),
('Deadlift', 'strength', 'back', 'barbell'),
('Pull-ups', 'strength', 'back', 'bodyweight'),
('Push-ups', 'strength', 'chest', 'bodyweight'),
('Overhead Press', 'strength', 'shoulders', 'barbell'),
('Barbell Row', 'strength', 'back', 'barbell'),
('Dumbbell Curl', 'strength', 'arms', 'dumbbell'),
('Tricep Dips', 'strength', 'arms', 'bodyweight'),
('Plank', 'core', 'core', 'bodyweight')
ON CONFLICT (name) DO NOTHING;

-- Create a default user (for testing - user_id = 1)
INSERT INTO users (id, email, name) VALUES 
(1, 'test@example.com', 'Test User')
ON CONFLICT (email) DO NOTHING;

-- Set sequence to start from 2 for users (since we inserted user with id=1)
SELECT setval('users_id_seq', 1, true);

-- Create some sample workout templates
INSERT INTO workout_days (name, description, user_id, is_template) VALUES
('Push Day', 'Chest, shoulders, and triceps workout', 1, true),
('Pull Day', 'Back and biceps workout', 1, true),
('Leg Day', 'Lower body workout', 1, true)
ON CONFLICT DO NOTHING;

-- Add exercises to Push Day template
INSERT INTO day_exercises (workout_day_id, exercise_id, target_sets, target_reps, exercise_order)
SELECT 
  wd.id,
  e.id,
  CASE 
    WHEN e.name = 'Bench Press' THEN 4
    WHEN e.name = 'Overhead Press' THEN 3
    WHEN e.name = 'Push-ups' THEN 3
    WHEN e.name = 'Tricep Dips' THEN 3
  END,
  CASE 
    WHEN e.name = 'Bench Press' THEN 8
    WHEN e.name = 'Overhead Press' THEN 10
    WHEN e.name = 'Push-ups' THEN 15
    WHEN e.name = 'Tricep Dips' THEN 12
  END,
  CASE 
    WHEN e.name = 'Bench Press' THEN 1
    WHEN e.name = 'Overhead Press' THEN 2
    WHEN e.name = 'Push-ups' THEN 3
    WHEN e.name = 'Tricep Dips' THEN 4
  END
FROM workout_days wd, exercises e
WHERE wd.name = 'Push Day' 
  AND e.name IN ('Bench Press', 'Overhead Press', 'Push-ups', 'Tricep Dips')
ON CONFLICT DO NOTHING;

-- Add exercises to Pull Day template
INSERT INTO day_exercises (workout_day_id, exercise_id, target_sets, target_reps, exercise_order)
SELECT 
  wd.id,
  e.id,
  CASE 
    WHEN e.name = 'Pull-ups' THEN 4
    WHEN e.name = 'Barbell Row' THEN 4
    WHEN e.name = 'Dumbbell Curl' THEN 3
  END,
  CASE 
    WHEN e.name = 'Pull-ups' THEN 8
    WHEN e.name = 'Barbell Row' THEN 10
    WHEN e.name = 'Dumbbell Curl' THEN 12
  END,
  CASE 
    WHEN e.name = 'Pull-ups' THEN 1
    WHEN e.name = 'Barbell Row' THEN 2
    WHEN e.name = 'Dumbbell Curl' THEN 3
  END
FROM workout_days wd, exercises e
WHERE wd.name = 'Pull Day' 
  AND e.name IN ('Pull-ups', 'Barbell Row', 'Dumbbell Curl')
ON CONFLICT DO NOTHING;

-- Add exercises to Leg Day template
INSERT INTO day_exercises (workout_day_id, exercise_id, target_sets, target_reps, exercise_order)
SELECT 
  wd.id,
  e.id,
  CASE 
    WHEN e.name = 'Squat' THEN 4
    WHEN e.name = 'Deadlift' THEN 3
  END,
  CASE 
    WHEN e.name = 'Squat' THEN 10
    WHEN e.name = 'Deadlift' THEN 8
  END,
  CASE 
    WHEN e.name = 'Squat' THEN 1
    WHEN e.name = 'Deadlift' THEN 2
  END
FROM workout_days wd, exercises e
WHERE wd.name = 'Leg Day' 
  AND e.name IN ('Squat', 'Deadlift')
ON CONFLICT DO NOTHING;