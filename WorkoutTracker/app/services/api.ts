// services/api.ts
const API_BASE_URL = "https://workout-tracker-production-9537.up.railway.app/api";

export const apiService = {
  // Get all exercises
  getExercises: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/exercises`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching exercises:", error);
      throw error;
    }
  },

  // Create new exercise
  createExercise: async (exercise: {
    name: string;
    description: string;
    category: string;
    muscleGroup: string;
    equipment: string;
  }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/exercises`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exercise),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error creating exercise:", error);
      throw error;
    }
  },

  // Get workout days
  getWorkoutDays: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/days`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching workout days:", error);
      throw error;
    }
  },

  // Start workout session
  startSession: async (sessionData: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error starting session:", error);
      throw error;
    }
  },

  // Log a set
  logSet: async (sessionId: number, setData: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/sets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(setData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error logging set:", error);
      throw error;
    }
  },

  // Complete session
  completeSession: async (sessionId: number, notes?: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/complete`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error completing session:", error);
      throw error;
    }
  },

  // Get user sessions
  getUserSessions: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching sessions:", error);
      throw error;
    }
  },
};