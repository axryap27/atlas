// app/(tabs)/workout.tsx - Main Workout Router
import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import WorkoutStart from "../components/workout/WorkoutStart";
import Templates from "../components/workout/Templates";
import CreateTemplate from "../components/workout/CreateTemplate";
import ActiveWorkout from "../components/workout/ActiveWorkout";
import RecentWorkouts from "../components/RecentWorkouts";

export type WorkoutScreen = "start" | "templates" | "createTemplate" | "active" | "recent";

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
    setCurrentScreen(screen);
    if (exercises) {
      setSelectedExercises(exercises);
    }
    if (templateId !== undefined) {
      setSelectedTemplateId(templateId);
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
      return (
        <ActiveWorkout
          initialExercises={selectedExercises}
          onNavigate={handleNavigate}
          onBack={handleBackToStart}
          templateId={selectedTemplateId}
        />
      );

    case "recent":
      return (
        <View style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingHorizontal: 16, 
            paddingTop: 16, 
            paddingBottom: 8,
            backgroundColor: '#F2F2F7'
          }}>
            <TouchableOpacity 
              onPress={handleBackToStart}
              style={{ marginRight: 16, padding: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000' }}>Recent Workouts</Text>
          </View>
          <RecentWorkouts
            showHeader={false}
            onViewWorkout={(sessionId) => {
              // Handle viewing workout session details
              console.log('View workout session:', sessionId);
            }}
          />
        </View>
      );

    default:
      return <WorkoutStart onNavigate={handleNavigate} />;
  }
}