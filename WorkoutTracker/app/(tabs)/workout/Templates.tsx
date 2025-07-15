// app/(tabs)/workout/Templates.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WorkoutScreen } from "../workout";

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

interface TemplatesProps {
  onNavigate: (screen: WorkoutScreen, exercises?: any[]) => void;
  onBack: () => void;
}

export default function Templates({ onNavigate, onBack }: TemplatesProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [templates] = useState<WorkoutTemplate[]>([
    {
      id: 1,
      name: "Push Day",
      description: "Chest, shoulders, triceps",
      exercises: [
        { id: 1, name: "Bench Press", sets: 3, reps: "8-10" },
        { id: 31, name: "Overhead Press", sets: 3, reps: "8-10" },
        { id: 46, name: "Tricep Pushdown", sets: 3, reps: "10-12" },
      ],
    },
    {
      id: 2,
      name: "Pull Day",
      description: "Back, biceps",
      exercises: [
        { id: 9, name: "Pull-ups", sets: 3, reps: "5-8" },
        { id: 13, name: "Bent-over Row", sets: 3, reps: "8-10" },
        { id: 41, name: "Barbell Curls", sets: 3, reps: "10-12" },
      ],
    },
    {
      id: 3,
      name: "Leg Day",
      description: "Quads, hamstrings, glutes",
      exercises: [
        { id: 21, name: "Squat", sets: 4, reps: "6-8" },
        { id: 23, name: "Romanian Deadlift", sets: 3, reps: "8-10" },
        { id: 24, name: "Lunges", sets: 3, reps: "12 each leg" },
      ],
    },
  ]);

  const startFromTemplate = (template: WorkoutTemplate) => {
    // Convert template to workout format
    const templateExercises = template.exercises.map((exercise) => ({
      id: exercise.id.toString(),
      name: exercise.name,
      sets: Array.from({ length: exercise.sets }, (_, i) => ({
        id: `ex${exercise.id}-set${i + 1}`,
        weight: "",
        reps: "",
        completed: false,
      })),
      completed: false,
      notes: "",
    }));

    onNavigate("active", templateExercises);
  };

  const styles = getStyles(isDark);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#68D391" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.workoutTitle}>Workout Templates</Text>
        <Text style={styles.progressText}>Choose a saved workout</Text>
      </View>

      <ScrollView style={styles.templatesScrollView}>
        {templates.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={styles.templateCard}
            onPress={() => startFromTemplate(template)}
          >
            <View style={styles.templateHeader}>
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.templateDescription}>
                {template.description}
              </Text>
            </View>

            <View style={styles.templateExercises}>
              <Text style={styles.templateExerciseList}>
                {template.exercises
                  .map((exercise) => exercise.name)
                  .join(" • ")}
              </Text>
            </View>

            <View style={styles.templateFooter}>
              <Text style={styles.templateStats}>
                {template.exercises.length} exercises •{" "}
                {template.exercises.reduce((acc, ex) => acc + ex.sets, 0)} sets
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.createTemplateButton}>
          <Ionicons name="add" size={24} color="#68D391" />
          <Text style={styles.createTemplateText}>Create New Template</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#1E1E1E",
    },
    header: {
      padding: 16,
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
    },
    backText: {
      fontSize: 16,
      color: "#68D391",
      marginLeft: 4,
    },
    workoutTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: "#F5F5F5",
      marginBottom: 8,
    },
    progressText: {
      fontSize: 16,
      color: "#A0AEC0",
    },
    templatesScrollView: {
      flex: 1,
      paddingHorizontal: 16,
    },
    templateCard: {
      backgroundColor: "#2D3748",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "#4A5568",
    },
    templateHeader: {
      marginBottom: 12,
    },
    templateName: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#F5F5F5",
      marginBottom: 4,
    },
    templateDescription: {
      fontSize: 14,
      color: "#A0AEC0",
    },
    templateExercises: {
      marginBottom: 12,
    },
    templateExerciseList: {
      fontSize: 14,
      color: "#A0AEC0",
      lineHeight: 20,
    },
    templateFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    templateStats: {
      fontSize: 12,
      color: "#A0AEC0",
    },
    createTemplateButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#2D3748",
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      borderWidth: 2,
      borderColor: "#68D391",
      borderStyle: "dashed",
    },
    createTemplateText: {
      fontSize: 16,
      color: "#68D391",
      fontWeight: "600",
      marginLeft: 8,
    },
  });
