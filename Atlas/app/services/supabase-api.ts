// app/services/supabase-api.ts
import { supabase, Exercise, WorkoutDay, Session, SetLog, DayExercise } from '../../lib/supabase'
import { authService } from './auth'

// Get current user ID or throw error if not authenticated
const getCurrentUserId = (): string => {
  const user = authService.getCurrentUser()
  if (!user) {
    throw new Error('User not authenticated')
  }
  return user.id
}

export const supabaseApi = {
  // ===== EXERCISES =====
  
  async getExercises(): Promise<Exercise[]> {
    console.log('🔍 SUPABASE: Fetching exercises...')
    
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('❌ SUPABASE ERROR fetching exercises:', error)
      throw error
    }
    
    // Transform snake_case to camelCase for frontend compatibility
    const transformedData = data?.map(exercise => {
      const result = {
        ...exercise,
        muscleGroup: exercise.muscle_group || 'DEBUG_FALLBACK',
        createdAt: exercise.created_at
      }
      
      // Debug first exercise in detail
      if (exercise.name === 'Arnold Press') {
        console.log('🚨 ARNOLD PRESS DEBUG:')
        console.log('  Original exercise:', JSON.stringify(exercise, null, 2))
        console.log('  muscle_group value:', exercise.muscle_group)
        console.log('  Transformed muscleGroup:', result.muscleGroup)
      }
      
      return result
    }) || []
    
    console.log(`✅ SUPABASE: Loaded ${transformedData.length} exercises`)
    console.log('🔍 First 3 muscle groups:', transformedData.slice(0, 3).map(e => `${e.name}:${e.muscleGroup}`))
    
    return transformedData
  },

  async createExercise(exercise: {
    name: string
    description?: string
    category: 'strength' | 'cardio' | 'flexibility' | 'core'
    muscle_group?: string
    equipment?: string
  }): Promise<Exercise> {
    const { data, error } = await supabase
      .from('exercises')
      .insert([exercise])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating exercise:', error)
      throw error
    }
    
    return data
  },

  async deleteExercise(id: number): Promise<void> {
    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting exercise:', error)
      throw error
    }
  },

  // ===== WORKOUT DAYS/TEMPLATES =====
  
  async getWorkoutDays(userId?: string): Promise<WorkoutDay[]> {
    const actualUserId = userId || getCurrentUserId()
    console.log('🔍 SUPABASE DEBUG: Fetching workout days for user:', actualUserId)
    
    const { data, error } = await supabase
      .from('workout_days')
      .select(`
        *,
        day_exercises (
          *,
          exercise:exercises (*)
        )
      `)
      .eq('user_id', actualUserId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ SUPABASE ERROR fetching workout days:', error)
      throw error
    }
    
    console.log('✅ SUPABASE SUCCESS: Fetched workout days:', data?.length, 'templates')
    console.log('🔍 Workout days:', data?.map(wd => ({ id: wd.id, name: wd.name, is_template: wd.is_template })))
    
    // Transform exercise data to include camelCase properties
    const transformedData = data?.map((workoutDay: any) => ({
      ...workoutDay,
      day_exercises: workoutDay.day_exercises?.map((dayExercise: any) => ({
        ...dayExercise,
        exercise: dayExercise.exercise ? {
          ...dayExercise.exercise,
          muscleGroup: dayExercise.exercise.muscle_group,
          createdAt: dayExercise.exercise.created_at
        } : undefined
      }))
    })) || []
    
    return transformedData
  },

  async getTemplates(userId?: string): Promise<WorkoutDay[]> {
    const actualUserId = userId || getCurrentUserId()
    const { data, error } = await supabase
      .from('workout_days')
      .select(`
        *,
        day_exercises (
          *,
          exercise:exercises (*)
        )
      `)
      .eq('user_id', actualUserId)
      .eq('is_template', true)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching templates:', error)
      throw error
    }
    
    // Transform exercise data to include camelCase properties
    const transformedData = data?.map((workoutDay: any) => ({
      ...workoutDay,
      day_exercises: workoutDay.day_exercises?.map((dayExercise: any) => ({
        ...dayExercise,
        exercise: dayExercise.exercise ? {
          ...dayExercise.exercise,
          muscleGroup: dayExercise.exercise.muscle_group,
          createdAt: dayExercise.exercise.created_at
        } : undefined
      }))
    })) || []
    
    return transformedData
  },

  async getWorkoutDayById(id: number): Promise<WorkoutDay> {
    const { data, error } = await supabase
      .from('workout_days')
      .select(`
        *,
        day_exercises (
          *,
          exercise:exercises (*)
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching workout day:', error)
      throw error
    }
    
    // Transform exercise data to include camelCase properties
    const transformedData = {
      ...data,
      day_exercises: data.day_exercises?.map((dayExercise: any) => ({
        ...dayExercise,
        exercise: dayExercise.exercise ? {
          ...dayExercise.exercise,
          muscleGroup: dayExercise.exercise.muscle_group,
          createdAt: dayExercise.exercise.created_at
        } : undefined
      }))
    }
    
    return transformedData
  },

  async createWorkoutDay(workoutDay: {
    name: string
    description?: string
    is_template?: boolean
    exercises: Array<{
      exercise_id: number
      target_sets?: number
      target_reps?: number
      target_weight?: number
      target_time?: number
      rest_time?: number
      exercise_order?: number
      notes?: string
    }>
  }, userId?: string): Promise<WorkoutDay> {
    const actualUserId = userId || getCurrentUserId()
    // First create the workout day
    const { data: workoutDayData, error: workoutDayError } = await supabase
      .from('workout_days')
      .insert([{
        name: workoutDay.name,
        description: workoutDay.description,
        user_id: actualUserId,
        is_template: workoutDay.is_template ?? true
      }])
      .select()
      .single()
    
    if (workoutDayError) {
      console.error('Error creating workout day:', workoutDayError)
      throw workoutDayError
    }

    // Then create the day exercises
    if (workoutDay.exercises.length > 0) {
      const dayExercises = workoutDay.exercises.map(exercise => ({
        ...exercise,
        workout_day_id: workoutDayData.id
      }))

      const { error: exercisesError } = await supabase
        .from('day_exercises')
        .insert(dayExercises)

      if (exercisesError) {
        console.error('Error creating day exercises:', exercisesError)
        throw exercisesError
      }
    }

    // Return the complete workout day with exercises
    return this.getWorkoutDayById(workoutDayData.id)
  },

  async deleteTemplate(id: number, userId?: string): Promise<void> {
    const { error } = await supabase
      .from('workout_days')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .eq('is_template', true)
    
    if (error) {
      console.error('Error deleting template:', error)
      throw error
    }
  },

  // ===== SESSIONS =====
  
  async getUserSessions(userId?: string, limit: number = 10): Promise<Session[]> {
    const actualUserId = userId || getCurrentUserId()
    console.log(`Fetching sessions for user ${actualUserId} with limit ${limit}`)
    
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        workout_day:workout_days (*),
        set_logs (
          *,
          exercise:exercises (*)
        )
      `)
      .eq('user_id', actualUserId)
      .order('start_time', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching sessions:', error)
      throw error
    }
    
    // Transform exercise data to include camelCase properties
    const transformedData = data?.map((session: any) => ({
      ...session,
      // Transform workout_day to workoutDay for frontend compatibility
      workoutDay: session.workout_day ? {
        ...session.workout_day,
        createdAt: session.workout_day.created_at,
        updatedAt: session.workout_day.updated_at
      } : undefined,
      set_logs: session.set_logs?.map((setLog: any) => ({
        ...setLog,
        exercise: setLog.exercise ? {
          ...setLog.exercise,
          muscleGroup: setLog.exercise.muscle_group,
          createdAt: setLog.exercise.created_at
        } : undefined
      }))
    })) || []
    
    console.log('Supabase sessions response:', JSON.stringify(transformedData, null, 2))
    return transformedData
  },

  async getSessionById(id: number): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        workout_day:workout_days (*),
        set_logs (
          *,
          exercise:exercises (*)
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching session:', error)
      throw error
    }
    
    // Transform exercise data to include camelCase properties
    const transformedData = {
      ...data,
      // Transform workout_day to workoutDay for frontend compatibility
      workoutDay: data.workout_day ? {
        ...data.workout_day,
        createdAt: data.workout_day.created_at,
        updatedAt: data.workout_day.updated_at
      } : undefined,
      set_logs: data.set_logs?.map((setLog: any) => ({
        ...setLog,
        exercise: setLog.exercise ? {
          ...setLog.exercise,
          muscleGroup: setLog.exercise.muscle_group,
          createdAt: setLog.exercise.created_at
        } : undefined
      }))
    }
    
    return transformedData
  },

  async startSession(sessionData: {
    workout_day_id?: number
    notes?: string
    location?: string
    body_weight?: number
  }, userId?: string): Promise<Session> {
    const actualUserId = userId || getCurrentUserId()
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        user_id: actualUserId,
        workout_day_id: sessionData.workout_day_id,
        notes: sessionData.notes,
        location: sessionData.location,
        body_weight: sessionData.body_weight
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Error starting session:', error)
      throw error
    }
    
    return data
  },

  async updateSession(id: number, updates: {
    end_time?: string
    duration?: number
    notes?: string
  }): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating session:', error)
      throw error
    }
    
    return data
  },

  async completeSession(id: number, notes?: string): Promise<Session> {
    const endTime = new Date().toISOString()
    
    // Get session start time to calculate duration
    const { data: session } = await supabase
      .from('sessions')
      .select('start_time')
      .eq('id', id)
      .single()
    
    let duration: number | undefined
    if (session) {
      const startTime = new Date(session.start_time)
      const endTimeDate = new Date(endTime)
      duration = Math.round((endTimeDate.getTime() - startTime.getTime()) / (1000 * 60)) // minutes
    }
    
    return this.updateSession(id, {
      end_time: endTime,
      duration,
      notes
    })
  },

  async deleteSession(id: number): Promise<void> {
    const userId = getCurrentUserId()
    
    // Get the session being deleted to find its start_time
    const { data: sessionToDelete } = await supabase
      .from('sessions')
      .select('start_time, user_id')
      .eq('id', id)
      .single()
    
    if (!sessionToDelete) {
      throw new Error('Session not found')
    }
    
    // Verify user owns this session
    if (sessionToDelete.user_id !== userId) {
      throw new Error('Unauthorized: Cannot delete session belonging to another user')
    }
    
    // Delete the session (cascade will handle set_logs)
    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      console.error('Error deleting session:', deleteError)
      throw deleteError
    }
    
    console.log(`✅ Successfully deleted session ${id} and all related data`)
  },

  async deleteAllSessions(userId?: string): Promise<void> {
    const actualUserId = userId || getCurrentUserId()
    
    // Delete all sessions for the user (cascade will handle set_logs)
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('user_id', actualUserId)
    
    if (error) {
      console.error('Error deleting all sessions:', error)
      throw error
    }
    
    console.log(`✅ Successfully deleted all sessions and related data for user ${actualUserId}`)
  },

  // ===== SET LOGS =====
  
  async logSet(sessionId: number, setData: {
    exercise_id: number
    set_number: number
    reps?: number
    weight?: number
    duration?: number
    distance?: number
    rest_time?: number
    rpe?: number
    notes?: string
  }): Promise<SetLog> {
    console.log('Logging set with data:', setData)
    
    // Check if exercise exists
    const { data: exerciseExists } = await supabase
      .from('exercises')
      .select('id, name')
      .eq('id', setData.exercise_id)
      .single()
    
    console.log('Exercise exists check:', exerciseExists)
    
    if (!exerciseExists) {
      console.error(`Exercise ID ${setData.exercise_id} not found in database`)
      // Get all exercises to help debug
      const { data: allExercises } = await supabase
        .from('exercises')
        .select('id, name')
      console.log('All available exercises:', allExercises)
      throw new Error(`Exercise ID ${setData.exercise_id} not found`)
    }
    
    const { data, error } = await supabase
      .from('set_logs')
      .insert([{
        session_id: sessionId,
        ...setData
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Error logging set:', error)
      throw error
    }
    
    return data
  },

  // ===== STATISTICS =====
  
  async getUserStats(userId?: string): Promise<{
    totalSessions: number
    totalDuration: number
    totalVolume: number
    avgSessionDuration: number
  }> {
    // Get session stats
    const { data: sessionStats } = await supabase
      .from('sessions')
      .select('duration')
      .eq('user_id', userId)
      .not('end_time', 'is', null)
    
    // Get volume stats
    const { data: volumeStats } = await supabase
      .from('set_logs')
      .select('weight, reps, sessions!inner(user_id)')
      .eq('sessions.user_id', userId)
      .not('weight', 'is', null)
      .not('reps', 'is', null)
    
    const totalSessions = sessionStats?.length || 0
    const totalDuration = sessionStats?.reduce((sum, session) => sum + (session.duration || 0), 0) || 0
    const totalVolume = volumeStats?.reduce((sum, set) => sum + ((set.weight || 0) * (set.reps || 0)), 0) || 0
    const avgSessionDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0
    
    return {
      totalSessions,
      totalDuration,
      totalVolume,
      avgSessionDuration
    }
  }
}