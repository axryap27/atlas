// app/components/workout/Templates.tsx
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
import { WorkoutScreen, TemplateExercise, WorkoutTemplate, Exercise } from "../../(tabs)/workout";

interface TemplatesProps {
  onNavigate: (screen: WorkoutScreen, exercises?: Exercise[]) => void;
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
        { id: 5, name: "Overhead Press", sets: 3, reps: "8-10" },
        { id: 45, name: "Tricep Pushdown", sets: 3, reps: "10-12" },
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
    // Convert template to workout format (using your exact logic)
    const templateExercises: Exercise[] = template.exercises.map((exercise) => ({
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

    onNavigate('active', templateExercises);
  };

  const styles = getStyles(isDark);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
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
              <Text style={styles.templateDescription}>{template.description}</Text>
            </View>
            
            <View style={styles.templateExercises}>
              <Text style={styles.templateExerciseList}>
                {template.exercises.map(exercise => exercise.name).join(' • ')}
              </Text>
            </View>
            
            <View style={styles.templateFooter}>
              <Text style={styles.templateStats}>
                {template.exercises.length} exercises • {template.exercises.reduce((acc, ex) => acc + ex.sets, 0)} sets
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7", // Light background
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
    color: "#007AFF",
    marginLeft: 4,
  },
  workoutTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000", // Dark text
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: "#6D6D70", // Light theme secondary
  },
  templatesScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  templateCard: {
    backgroundColor: "#FFFFFF", // White cards
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA", // Light border
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  templateHeader: {
    marginBottom: 12,
  },
  templateName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000", // Dark text
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: "#6D6D70", // Light theme secondary
  },
  templateExercises: {
    marginBottom: 12,
  },
  templateExerciseList: {
    fontSize: 14,
    color: "#6D6D70", // Light theme secondary
    lineHeight: 20,
  },
  templateFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  templateStats: {
    fontSize: 12,
    color: "#8E8E93", // Light theme tertiary
  },
});