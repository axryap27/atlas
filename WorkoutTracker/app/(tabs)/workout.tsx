// app/(tabs)/workout.tsx - Complete Workout Tracker
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  SafeAreaView,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const API_BASE_URL = "https://workout-tracker-production-9537.up.railway.app/api";

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

interface ExerciseData {
  id: number;
  name: string;
  description?: string;
  category: string;
  muscleGroup?: string;
  equipment?: string;
}

const apiService = {
  getExercises: async () => {
    const response = await fetch(`${API_BASE_URL}/exercises`);
    return await response.json();
  },
};

export default function WorkoutScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workoutStartTime] = useState(new Date());

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      setLoading(true);
      const exercisesData: ExerciseData[] = await apiService.getExercises();
      
      // Convert to workout format
      const workoutExercises: Exercise[] = exercisesData.map((exercise) => ({
        id: exercise.id.toString(),
        name: exercise.name,
        sets: [
          { id: `${exercise.id}-1`, weight: "", reps: "", completed: false },
          { id: `${exercise.id}-2`, weight: "", reps: "", completed: false },
          { id: `${exercise.id}-3`, weight: "", reps: "", completed: false },
        ],
        completed: false,
        notes: "",
      }));

      setExercises(workoutExercises);
      if (workoutExercises.length > 0) {
        setExpandedExercise(workoutExercises[0].id);
      }
    } catch (error) {
      console.error("Failed to load exercises:", error);
      Alert.alert("Error", "Failed to load exercises");
    } finally {
      setLoading(false);
    }
  };

  // Calculate progress
  const totalSets = exercises.reduce((acc, exercise) => acc + exercise.sets.length, 0);
  const completedSets = exercises.reduce(
    (acc, exercise) => acc + exercise.sets.filter((set) => set.completed).length,
    0
  );
  const progressPercentage = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  const handleSetComplete = (exerciseId: string, setId: string) => {
    setExercises((prevExercises) =>
      prevExercises.map((exercise) => {
        if (exercise.id === exerciseId) {
          const updatedSets = exercise.sets.map((set) => {
            if (set.id === setId) {
              return { ...set, completed: !set.completed };
            }
            return set;
          });

          const allSetsCompleted = updatedSets.every((set) => set.completed);

          return {
            ...exercise,
            sets: updatedSets,
            completed: allSetsCompleted,
          };
        }
        return exercise;
      })
    );
  };

  const handleWeightChange = (exerciseId: string, setId: string, value: string) => {
    setExercises((exercises) =>
      exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, weight: value } : set
              ),
            }
          : exercise
      )
    );
  };

  const handleRepsChange = (exerciseId: string, setId: string, value: string) => {
    setExercises((exercises) =>
      exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, reps: value } : set
              ),
            }
          : exercise
      )
    );
  };

  const handleAddSet = (exerciseId: string) => {
    setExercises((prevExercises) =>
      prevExercises.map((exercise) => {
        if (exercise.id === exerciseId) {
          const lastSet = exercise.sets[exercise.sets.length - 1];
          const newSet: Set = {
            id: `${exerciseId}-${exercise.sets.length + 1}`,
            weight: lastSet ? lastSet.weight : "",
            reps: lastSet ? lastSet.reps : "",
            completed: false,
          };
          return { ...exercise, sets: [...exercise.sets, newSet] };
        }
        return exercise;
      })
    );
  };

  const handleRemoveSet = (exerciseId: string, setId: string) => {
    setExercises((prevExercises) =>
      prevExercises.map((exercise) => {
        if (exercise.id === exerciseId) {
          if (exercise.sets.length <= 1) return exercise;
          const updatedSets = exercise.sets.filter((set) => set.id !== setId);
          return { ...exercise, sets: updatedSets };
        }
        return exercise;
      })
    );
  };

  const handleCompleteWorkout = () => {
    const completedExercises = exercises.filter((ex) => ex.completed).length;
    const duration = Math.round((new Date().getTime() - workoutStartTime.getTime()) / (1000 * 60));
    
    Alert.alert(
      "Workout Complete!",
      `Great job! You completed ${completedExercises}/${exercises.length} exercises in ${duration} minutes.`,
      [
        { text: "Finish", onPress: () => console.log("Workout finished!") }
      ]
    );
  };

  const styles = getStyles(isDark);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.workoutTitle}>Push Day</Text>
          <Text style={styles.progressText}>
            {completedSets}/{totalSets} sets completed
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
        </View>

        {/* Exercises */}
        <View style={styles.exerciseList}>
          {exercises.map((exercise) => (
            <View
              key={exercise.id}
              style={[
                styles.exerciseCard,
                exercise.completed && styles.completedExercise,
              ]}
            >
              {/* Exercise Header */}
              <TouchableOpacity
                style={styles.exerciseHeader}
                onPress={() =>
                  setExpandedExercise(
                    expandedExercise === exercise.id ? null : exercise.id
                  )
                }
              >
                <View style={styles.exerciseTitle}>
                  {exercise.completed && (
                    <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                  )}
                  <Text style={[styles.exerciseName, exercise.completed && { marginLeft: 8 }]}>
                    {exercise.name}
                  </Text>
                </View>
                <Ionicons 
                  name={expandedExercise === exercise.id ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={isDark ? "#8E8E93" : "#6D6D70"} 
                />
              </TouchableOpacity>

              {/* Sets (when expanded) */}
              {expandedExercise === exercise.id && (
                <>
                  {/* Sets Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderText}>Set</Text>
                    <Text style={styles.tableHeaderText}>Weight</Text>
                    <Text style={styles.tableHeaderText}>Reps</Text>
                    <Text style={styles.tableHeaderText}>✓</Text>
                  </View>

                  {/* Sets */}
                  {exercise.sets.map((set, index) => (
                    <View key={set.id} style={[styles.setRow, set.completed && styles.completedSet]}>
                      <Text style={styles.setNumber}>{index + 1}</Text>
                      
                      <TextInput
                        style={styles.input}
                        value={set.weight}
                        onChangeText={(value) => handleWeightChange(exercise.id, set.id, value)}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        selectTextOnFocus={true}
                      />
                      
                      <TextInput
                        style={styles.input}
                        value={set.reps}
                        onChangeText={(value) => handleRepsChange(exercise.id, set.id, value)}
                        placeholder="0"
                        keyboardType="number-pad"
                        selectTextOnFocus={true}
                      />
                      
                      <View style={styles.setActions}>
                        <TouchableOpacity
                          style={[styles.doneButton, set.completed && styles.doneButtonCompleted]}
                          onPress={() => handleSetComplete(exercise.id, set.id)}
                        >
                          <Ionicons 
                            name={set.completed ? "checkmark" : "ellipse-outline"} 
                            size={20} 
                            color={set.completed ? "#FFFFFF" : "#007AFF"} 
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemoveSet(exercise.id, set.id)}
                        >
                          <Ionicons name="remove" size={16} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {/* Add Set Button */}
                  <TouchableOpacity
                    style={styles.addSetButton}
                    onPress={() => handleAddSet(exercise.id)}
                  >
                    <Ionicons name="add" size={20} color="#007AFF" />
                    <Text style={styles.addSetButtonText}>Add Set</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ))}
        </View>

        {/* Complete Workout Button */}
        <TouchableOpacity style={styles.completeButton} onPress={handleCompleteWorkout}>
          <Text style={styles.completeButtonText}>Complete Workout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? "#000000" : "#F2F2F7",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: isDark ? "#FFFFFF" : "#000000",
  },
  header: {
    marginBottom: 20,
  },
  workoutTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: isDark ? "#FFFFFF" : "#000000",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: isDark ? "#8E8E93" : "#6D6D70",
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBackground: {
    height: 8,
    backgroundColor: isDark ? "#1C1C1E" : "#E5E5EA",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#34C759",
    borderRadius: 4,
  },
  exerciseList: {
    gap: 16,
  },
  exerciseCard: {
    backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedExercise: {
    borderColor: "#34C759",
    borderWidth: 2,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  exerciseTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "bold",
    color: isDark ? "#FFFFFF" : "#000000",
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA",
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: isDark ? "#8E8E93" : "#6D6D70",
    flex: 1,
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 8,
  },
  completedSet: {
    opacity: 0.6,
  },
  setNumber: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: isDark ? "#FFFFFF" : "#000000",
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: isDark ? "#3A3A3C" : "#C6C6C8",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    textAlign: "center",
    fontSize: 16,
    backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF",
    color: isDark ? "#FFFFFF" : "#000000",
  },
  setActions: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  doneButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
  },
  doneButtonCompleted: {
    backgroundColor: "#34C759",
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  addSetButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  completeButton: {
    backgroundColor: "#34C759",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 32,
    alignItems: "center",
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});