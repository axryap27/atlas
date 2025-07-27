-- Add comprehensive exercise database to Supabase
-- Run this in Supabase SQL Editor

-- First, let's see what we currently have
SELECT 'Current exercises:' as info, COUNT(*) as count FROM exercises;

-- Add comprehensive list of exercises
INSERT INTO exercises (name, category, muscle_group, equipment) VALUES

-- CHEST EXERCISES
('Incline Bench Press', 'strength', 'chest', 'barbell'),
('Decline Bench Press', 'strength', 'chest', 'barbell'),
('Dumbbell Bench Press', 'strength', 'chest', 'dumbbell'),
('Incline Dumbbell Press', 'strength', 'chest', 'dumbbell'),
('Decline Dumbbell Press', 'strength', 'chest', 'dumbbell'),
('Dumbbell Flyes', 'strength', 'chest', 'dumbbell'),
('Incline Dumbbell Flyes', 'strength', 'chest', 'dumbbell'),
('Chest Dips', 'strength', 'chest', 'bodyweight'),
('Cable Flyes', 'strength', 'chest', 'cable'),
('Pec Deck', 'strength', 'chest', 'machine'),

-- BACK EXERCISES
('Lat Pulldown', 'strength', 'back', 'cable'),
('Wide Grip Pulldown', 'strength', 'back', 'cable'),
('Close Grip Pulldown', 'strength', 'back', 'cable'),
('Cable Row', 'strength', 'back', 'cable'),
('T-Bar Row', 'strength', 'back', 'barbell'),
('Dumbbell Row', 'strength', 'back', 'dumbbell'),
('Chest Supported Row', 'strength', 'back', 'machine'),
('Face Pulls', 'strength', 'back', 'cable'),
('Reverse Flyes', 'strength', 'back', 'dumbbell'),
('Shrugs', 'strength', 'back', 'dumbbell'),

-- SHOULDER EXERCISES
('Lateral Raises', 'strength', 'shoulders', 'dumbbell'),
('Rear Delt Flyes', 'strength', 'shoulders', 'dumbbell'),
('Front Raises', 'strength', 'shoulders', 'dumbbell'),
('Arnold Press', 'strength', 'shoulders', 'dumbbell'),
('Dumbbell Shoulder Press', 'strength', 'shoulders', 'dumbbell'),
('Machine Shoulder Press', 'strength', 'shoulders', 'machine'),
('Upright Row', 'strength', 'shoulders', 'barbell'),
('Cable Lateral Raises', 'strength', 'shoulders', 'cable'),

-- ARM EXERCISES
('Hammer Curls', 'strength', 'arms', 'dumbbell'),
('Preacher Curls', 'strength', 'arms', 'dumbbell'),
('Cable Curls', 'strength', 'arms', 'cable'),
('Tricep Pushdowns', 'strength', 'arms', 'cable'),
('Overhead Tricep Extension', 'strength', 'arms', 'dumbbell'),
('Close Grip Bench Press', 'strength', 'arms', 'barbell'),
('Diamond Push-ups', 'strength', 'arms', 'bodyweight'),
('Skull Crushers', 'strength', 'arms', 'barbell'),

-- LEG EXERCISES
('Leg Press', 'strength', 'legs', 'machine'),
('Romanian Deadlift', 'strength', 'legs', 'barbell'),
('Bulgarian Split Squat', 'strength', 'legs', 'bodyweight'),
('Lunges', 'strength', 'legs', 'bodyweight'),
('Leg Curls', 'strength', 'legs', 'machine'),
('Leg Extensions', 'strength', 'legs', 'machine'),
('Calf Raises', 'strength', 'legs', 'machine'),
('Hip Thrusts', 'strength', 'legs', 'barbell'),
('Goblet Squats', 'strength', 'legs', 'dumbbell'),
('Stiff Leg Deadlift', 'strength', 'legs', 'dumbbell'),

-- CORE EXERCISES
('Russian Twists', 'core', 'core', 'bodyweight'),
('Mountain Climbers', 'core', 'core', 'bodyweight'),
('Dead Bug', 'core', 'core', 'bodyweight'),
('Bird Dog', 'core', 'core', 'bodyweight'),
('Side Plank', 'core', 'core', 'bodyweight'),
('Hanging Leg Raises', 'core', 'core', 'bodyweight'),
('Cable Crunches', 'core', 'core', 'cable'),

-- CARDIO EXERCISES
('Treadmill', 'cardio', 'cardio', 'machine'),
('Elliptical', 'cardio', 'cardio', 'machine'),
('Stationary Bike', 'cardio', 'cardio', 'machine'),
('Rowing Machine', 'cardio', 'cardio', 'machine'),
('Burpees', 'cardio', 'cardio', 'bodyweight'),
('Jump Rope', 'cardio', 'cardio', 'equipment'),

-- FLEXIBILITY EXERCISES
('Hamstring Stretch', 'flexibility', 'legs', 'bodyweight'),
('Chest Stretch', 'flexibility', 'chest', 'bodyweight'),
('Shoulder Stretch', 'flexibility', 'shoulders', 'bodyweight'),
('Hip Flexor Stretch', 'flexibility', 'legs', 'bodyweight')

ON CONFLICT (name) DO NOTHING;

-- Show final count
SELECT 'Total exercises after insert:' as info, COUNT(*) as count FROM exercises;

-- Show all exercises grouped by muscle group
SELECT 
  muscle_group,
  COUNT(*) as exercise_count,
  string_agg(name, ', ' ORDER BY name) as exercises
FROM exercises 
GROUP BY muscle_group 
ORDER BY muscle_group;