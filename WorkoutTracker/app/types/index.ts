// types/index.ts

export interface Set {
    id: string;
    weight: string;
    reps: string;
    completed: boolean;
  }
  
  export interface Exercise {
    id: string;
    name: string;
    sets: Set[];
    completed: boolean;
    notes: string;
  }
  
  export interface ExerciseData {
    id: number;
    name: string;
    description?: string;
    category: string;
    muscleGroup?: string;
    equipment?: string;
    createdAt: string;
  }
  
  export interface WorkoutSession {
    id: number;
    userId: number;
    workoutDayId?: number;
    startTime: string;
    endTime?: string;
    duration?: number;
    notes?: string;
    location?: string;
    bodyWeight?: number;
  }
  
  export interface SetLog {
    id: number;
    sessionId: number;
    exerciseId: number;
    setNumber: number;
    reps?: number;
    weight?: number;
    duration?: number;
    distance?: number;
    restTime?: number;
    rpe?: number;
    notes?: string;
    createdAt: string;
  }
  
  export interface WorkoutDay {
    id: number;
    name: string;
    description?: string;
    userId: number;
    isTemplate: boolean;
    createdAt: string;
    updatedAt: string;
    dayExercises: DayExercise[];
  }
  
  export interface DayExercise {
    id: number;
    workoutDayId: number;
    exerciseId: number;
    targetSets: number;
    targetReps?: number;
    targetWeight?: number;
    targetTime?: number;
    restTime?: number;
    order: number;
    notes?: string;
    exercise: ExerciseData;
  }