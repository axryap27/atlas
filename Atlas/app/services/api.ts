// services/api.ts
import { supabaseApi } from './supabase-api';

export const apiService = {
  // Get all exercises
  getExercises: async () => {
    try {
      return await supabaseApi.getExercises();
    } catch (error) {
      console.error("❌ API SERVICE ERROR fetching exercises:", error);
      throw error;
    }
  },

  // Create new exercise
  createExercise: async (exercise: {
    name: string;
    description: string;
    category: 'strength' | 'cardio' | 'flexibility' | 'core';
    muscleGroup: string;
    equipment: string;
  }) => {
    try {
      return await supabaseApi.createExercise({
        name: exercise.name,
        description: exercise.description,
        category: exercise.category,
        muscle_group: exercise.muscleGroup,
        equipment: exercise.equipment,
      });
    } catch (error) {
      console.error("Error creating exercise:", error);
      throw error;
    }
  },

  // Get workout days
  getWorkoutDays: async () => {
    try {
      return await supabaseApi.getWorkoutDays();
    } catch (error) {
      console.error("❌ API SERVICE ERROR fetching workout days:", error);
      throw error;
    }
  },

  // Start workout session
  startSession: async (sessionData: any) => {
    try {
      return await supabaseApi.startSession(sessionData);
    } catch (error) {
      console.error("Error starting session:", error);
      throw error;
    }
  },

  // Log a set
  logSet: async (sessionId: number, setData: any) => {
    try {
      return await supabaseApi.logSet(sessionId, setData);
    } catch (error) {
      console.error("Error logging set:", error);
      throw error;
    }
  },

  // Complete session
  completeSession: async (sessionId: number, notes?: string) => {
    try {
      return await supabaseApi.completeSession(sessionId, notes);
    } catch (error) {
      console.error("Error completing session:", error);
      throw error;
    }
  },

  // Get user sessions
  getUserSessions: async () => {
    try {
      return await supabaseApi.getUserSessions();
    } catch (error) {
      console.error("Error fetching sessions:", error);
      throw error;
    }
  },
};