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
      
      
      return result
    }) || []
    
    
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
    const currentUserId = userId || getCurrentUserId()
    
    const { error } = await supabase
      .from('workout_days')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUserId)
      .eq('is_template', true)
    
    if (error) {
      console.error('Error deleting template:', error)
      throw error
    }
  },

  // ===== SESSIONS =====
  
  async getUserSessions(userId?: string, limit: number = 10): Promise<Session[]> {
    const actualUserId = userId || getCurrentUserId()
    
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
      .eq('id', id)  // Remove String() conversion - let Supabase handle the type
      .select()
      .single()

    if (error) {
      console.error('Error updating session:', error)
      throw error
    }

    return data
  },

  async completeSession(id: number, notes?: string): Promise<Session> {
    console.log('🔍 completeSession params:', {
      id: typeof id + ' = ' + id,
      notes: typeof notes + ' = ' + notes
    });

    const endTime = new Date().toISOString()

    // Get session start time to calculate duration
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('start_time')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error fetching session for completion:', fetchError)
      throw fetchError
    }

    let duration: number | undefined
    if (session) {
      const startTime = new Date(session.start_time)
      const endTimeDate = new Date(endTime)
      duration = Math.round((endTimeDate.getTime() - startTime.getTime()) / (1000 * 60)) // minutes
      console.log('🔍 Calculated duration:', duration, 'minutes');
    }

    console.log('🔍 Updating session with:', { end_time: endTime, duration, notes });

    return this.updateSession(id, {
      end_time: endTime,
      duration,
      notes
    })
  },

  async deleteSession(id: number): Promise<void> {
    const userId = getCurrentUserId()
    console.log('🔍 deleteSession params:', { id, userId });

    // Get the session being deleted to verify ownership
    const { data: sessionToDelete, error: fetchError } = await supabase
      .from('sessions')
      .select('start_time, user_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error fetching session to delete:', fetchError)
      throw fetchError
    }

    if (!sessionToDelete) {
      throw new Error('Session not found')
    }

    console.log('🔍 Session data:', { sessionUserId: sessionToDelete.user_id, currentUserId: userId });

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

    console.log('✅ Session deleted successfully');
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

    // Check if session exists and is active
    const { data: sessionExists, error: sessionError } = await supabase
      .from('sessions')
      .select('id, user_id, start_time')
      .eq('id', sessionId)
      .single()

    if (sessionError || !sessionExists) {
      console.error(`Session ID ${sessionId} not found:`, sessionError)
      throw new Error(`Session ID ${sessionId} not found`)
    }

    // Check if exercise exists
    const { data: exerciseExists, error: exerciseError } = await supabase
      .from('exercises')
      .select('id, name')
      .eq('id', setData.exercise_id)
      .single()

    if (exerciseError || !exerciseExists) {
      console.error(`Exercise ID ${setData.exercise_id} not found:`, exerciseError)
      // Get all exercises to help debug
      const { data: allExercises } = await supabase
        .from('exercises')
        .select('id, name')
      console.error('Available exercises:', allExercises?.map(ex => `${ex.id}: ${ex.name}`).join(', '))
      throw new Error(`Exercise ID ${setData.exercise_id} not found`)
    }
    
    // Validate and prepare data for insertion
    const insertData = {
      session_id: sessionId,
      exercise_id: setData.exercise_id,
      set_number: setData.set_number,
      reps: setData.reps || null,
      weight: setData.weight || null,
      duration: setData.duration || null,
      distance: setData.distance || null,
      rest_time: setData.rest_time || null,
      rpe: setData.rpe || null,
      notes: setData.notes || null
    };

    console.log('🔍 logSet inserting data:', insertData);

    const { data, error } = await supabase
      .from('set_logs')
      .insert([insertData])
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