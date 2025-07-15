// app/(tabs)/workout.tsx - Main Workout Router
import React, { useState } from "react";
import WorkoutStart from "./workout/WorkoutStart";
import Templates from "./workout/Templates";
import ActiveWorkout from "./workout/ActiveWorkout";

export type WorkoutScreen = 'start' | 'templates' | 'active';

// Using your existing interfaces
interface Set {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
}

interface Exercise {
  id: string;
  name: string;
  sets: Set[];
  completed: boolean;
  notes: string;
}

interface TemplateExercise {
  id: number;
  name: string;
  sets: number;
  reps: string;
}

interface WorkoutTemplate {
  id: number;
  name: string;
  description: string;
  exercises: TemplateExercise[];
}

export type { Exercise, Set, TemplateExercise, WorkoutTemplate };

export default function WorkoutScreen() {
  const [currentScreen, setCurrentScreen] = useState<WorkoutScreen>('start');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);

  const handleNavigate = (screen: WorkoutScreen, exercises?: Exercise[]) => {
    setCurrentScreen(screen);
    if (exercises) {
      setSelectedExercises(exercises);
    }
  };

  const handleBackToStart = () => {
    setCurrentScreen('start');
    setSelectedExercises([]);
  };

  switch(currentScreen) {
    case 'start':
      return <WorkoutStart onNavigate={handleNavigate} />;
    
    case 'templates':
      return <Templates onNavigate={handleNavigate} onBack={handleBackToStart} />;
    
    case 'active':
      return <ActiveWorkout 
        initialExercises={selectedExercises}
        onNavigate={handleNavigate} 
        onBack={handleBackToStart} 
      />;
    
    default:
      return <WorkoutStart onNavigate={handleNavigate} />;
  }
}