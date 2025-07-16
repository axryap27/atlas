// app/(tabs)/workout.tsx - Main Workout Router
import React, { useState } from "react";
import WorkoutStart from "./workout/WorkoutStart";
import Templates from "./workout/Templates";
import ActiveWorkout from "./workout/ActiveWorkout";

export type WorkoutScreen = "start" | "templates" | "active";

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
  const [currentScreen, setCurrentScreen] = useState<WorkoutScreen>("start");
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [templatesNeedRefresh, setTemplatesNeedRefresh] = useState(false);

  const handleNavigate = (screen: WorkoutScreen, exercises?: Exercise[]) => {
    setCurrentScreen(screen);
    if (exercises) {
      setSelectedExercises(exercises);
    }
  };

  const handleBackToStart = () => {
    setCurrentScreen("start");
    setSelectedExercises([]);
  };

  const handleBackToTemplates = () => {
    setCurrentScreen("templates");
    // Trigger refresh when coming back from create template
    setTemplatesNeedRefresh(true);
  };

  const handleTemplateCreated = () => {
    // Mark that templates need to be refreshed
    setTemplatesNeedRefresh(true);
  };

  const handleTemplatesRefreshed = () => {
    // Reset the refresh flag
    setTemplatesNeedRefresh(false);
  };

  switch (currentScreen) {
    case "start":
      return <WorkoutStart onNavigate={handleNavigate} />;

    case "templates":
      return (
        <Templates 
          onNavigate={handleNavigate} 
          onBack={handleBackToStart} 
          needsRefresh={templatesNeedRefresh}
          onRefreshed = {handleTemplatesRefreshed}
        />
      );

    case "createTemplate":
      return (
        <CreateTemplate 
          onBack={handleBackToTemplates}
          onTemplateCreated={handleTemplateCreated}
        />
      );

    case "active":
      return (
        <ActiveWorkout
          initialExercises={selectedExercises}
          onNavigate={handleNavigate}
          onBack={handleBackToStart}
        />
      );

    default:
      return <WorkoutStart onNavigate={handleNavigate} />;
  }
}
