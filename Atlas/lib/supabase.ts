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
  // Transformed properties for frontend compatibility
  muscleGroup?: string
  createdAt?: string
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

// Social Types
export interface UserProfile {
  id: number
  user_id: number
  username: string
  display_name?: string
  bio?: string
  is_public: boolean
  total_workouts: number
  created_at: string
  updated_at: string
}

export interface Friendship {
  id: number
  requester_id: number
  addressee_id: number
  status: 'pending' | 'accepted'
  created_at: string
  requester?: UserProfile
  addressee?: UserProfile
}


export interface Achievement {
  id: number
  name: string
  description: string
  category: 'workout' | 'social' | 'milestone'
  criteria: any // JSON object with achievement criteria
  created_at: string
}

export interface UserAchievement {
  id: number
  user_id: number
  achievement_id: number
  earned_at: string
  achievement?: Achievement
}

export interface WorkoutPost {
  id: number
  user_id: number
  session_id: number
  caption?: string
  visibility: 'private' | 'friends' | 'public'
  likes_count: number
  comments_count: number
  created_at: string
  updated_at: string
  user?: UserProfile
  session?: Session
  is_liked_by_user?: boolean
  comments?: WorkoutPostComment[]
}

export interface WorkoutPostLike {
  id: number
  post_id: number
  user_id: number
  created_at: string
  user?: UserProfile
}

export interface WorkoutPostComment {
  id: number
  post_id: number
  user_id: number
  content: string
  created_at: string
  updated_at: string
  user?: UserProfile
}

export interface LeaderboardEntry {
  id: number
  user_id: number
  metric_type: 'weekly_volume' | 'monthly_volume' | 'weekly_workouts' | 'monthly_workouts' | 'current_streak'
  value: number
  period_start: string
  period_end: string
  rank_position?: number
  created_at: string
  updated_at: string
  user?: UserProfile
}

export interface ActivityFeedItem {
  id: number
  user_id: number
  actor_id: number
  activity_type: 'workout_completed' | 'achievement_earned' | 'friend_added' | 'workout_liked' | 'workout_commented'
  target_id?: number
  target_type?: string
  metadata?: any
  created_at: string
  actor?: UserProfile
  user?: UserProfile
}