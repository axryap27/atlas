// app/(tabs)/workout.tsx - Main Workout Router
import React, { useState } from "react";
import WorkoutStart from "../components/workout/WorkoutStart";
import Templates from "../components/workout/Templates";
import CreateTemplate from "../components/workout/CreateTemplate";
import ActiveWorkout from "../components/workout/ActiveWorkout";

export type WorkoutScreen = "start" | "templates" | "createTemplate" | "active";

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
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>();
  const [templatesNeedRefresh, setTemplatesNeedRefresh] = useState(false);

  const handleNavigate = (screen: WorkoutScreen, exercises?: Exercise[], templateId?: number) => {
    console.log('🔧 workout.tsx: handleNavigate called with templateId:', templateId);
    setCurrentScreen(screen);
    if (exercises) {
      setSelectedExercises(exercises);
    }
    if (templateId !== undefined) {
      setSelectedTemplateId(templateId);
      console.log('🔧 workout.tsx: selectedTemplateId set to:', templateId);
    }
  };

  const handleBackToStart = () => {
    setCurrentScreen("start");
    setSelectedExercises([]);
    setSelectedTemplateId(undefined);
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
          onRefreshed={handleTemplatesRefreshed}
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
      console.log('🔧 workout.tsx: Rendering ActiveWorkout with templateId:', selectedTemplateId);
      return (
        <ActiveWorkout
          initialExercises={selectedExercises}
          onNavigate={handleNavigate}
          onBack={handleBackToStart}
          templateId={selectedTemplateId}
        />
      );

    default:
      return <WorkoutStart onNavigate={handleNavigate} />;
  }
}