// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Get credentials from environment variables for security
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (matching your schema)
export interface Exercise {
  id: number
  name: string
  description?: string
  category: 'strength' | 'cardio' | 'flexibility' | 'core'
  muscle_group?: string
  equipment?: string
  created_at: string
}

export interface WorkoutDay {
  id: number
  name: string
  description?: string
  user_id: number
  is_template: boolean
  created_at: string
  updated_at: string
  day_exercises?: DayExercise[]
}

export interface DayExercise {
  id: number
  workout_day_id: number
  exercise_id: number
  target_sets?: number
  target_reps?: number
  target_weight?: number
  target_time?: number
  rest_time?: number
  exercise_order?: number
  notes?: string
  exercise?: Exercise
}

export interface Session {
  id: number
  user_id: number
  workout_day_id?: number
  start_time: string
  end_time?: string
  duration?: number
  notes?: string
  location?: string
  body_weight?: number
  workout_day?: WorkoutDay
  set_logs?: SetLog[]
}

export interface SetLog {
  id: number
  session_id: number
  exercise_id: number
  set_number: number
  reps?: number
  weight?: number
  duration?: number
  distance?: number
  rest_time?: number
  rpe?: number
  notes?: string
  created_at: string
  exercise?: Exercise
}

export interface User {
  id: number
  email?: string
  name?: string
  created_at: string
  updated_at: string
}