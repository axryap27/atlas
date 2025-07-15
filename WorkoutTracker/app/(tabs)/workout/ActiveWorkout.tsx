// app/(tabs)/workout/ActiveWorkout.tsx
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
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WorkoutScreen } from "../workout";

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

interface ActiveWorkoutProps {
  initialExercises?: Exercise[];
  onNavigate: (screen: WorkoutScreen) => void;
  onBack: () => void;
}

const apiService = {
  getExercises: async () => {
    const response = await fetch(`${API_BASE_URL}/exercises`);
    return await response.json();
  },
};

export default function ActiveWorkout({ 
  initialExercises = [], 
  onNavigate, 
  onBack 
}: ActiveWorkoutProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>(initialExercises);
  const [availableExercises, setAvailableExercises] = useState<ExerciseData[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("all");
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [workoutStartTime] = useState(new Date());

  useEffect(() => {
    loadAvailableExercises();
    // Auto-expand first exercise if we have exercises from template
    if (initialExercises.length > 0) {
      setExpandedExercise(initialExercises[0].id);
    }
  }, []);

  const loadAvailableExercises = async () => {
    try {
      setLoading(true);
      const exercisesData = await apiService.getExercises();
      setAvailableExercises(exercisesData);
    } catch (error) {
      console.error("Failed to load exercises:", error);
      Alert.alert("Error", "Failed to load exercises");
    } finally {
      setLoading(false);
    }
  };

  const muscleGroups = ["all", "chest", "back", "legs", "shoulders", "biceps", "triceps", "abs", "calves"];

  const filteredExercises = availableExercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscleGroup = selectedMuscleGroup === "all" || exercise.muscleGroup === selectedMuscleGroup;
    return matchesSearch && matchesMuscleGroup;
  });

  const addExerciseToWorkout = (exercise: ExerciseData) => {
    const newExercise: Exercise = {
      id: exercise.id.toString(),
      name: exercise.name,
      sets: [
        { id: `ex${exercise.id}-set1`, weight: "", reps: "", completed: false },
        { id: `ex${exercise.id}-set2`, weight: "", reps: "", completed: false },
        { id: `ex${exercise.id}-set3`, weight: "", reps: "", completed: false },
      ],
      completed: false,
      notes: "",
    };

    setSelectedExercises(prev => [...prev, newExercise]);
    setShowExercisePicker(false);
    setExpandedExercise(newExercise.id);
  };

  const removeExerciseFromWorkout = (exerciseId: string) => {
    setSelectedExercises(prev => prev.filter(ex => ex.id !== exerciseId));
  };

  // Calculate progress
  const totalSets = selectedExercises.reduce((acc, exercise) => acc + exercise.sets.length, 0);
  const completedSets = selectedExercises.reduce(
    (acc, exercise) => acc + exercise.sets.filter((set) => set.completed).length,
    0
  );
  const progressPercentage = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  const handleSetComplete = (exerciseId: string, setId: string) => {
    setSelectedExercises((prevExercises) =>
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
    setSelectedExercises((exercises) =>
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
    setSelectedExercises((exercises) =>
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
    setSelectedExercises((prevExercises) =>
      prevExercises.map((exercise) => {
        if (exercise.id === exerciseId) {
          const lastSet = exercise.sets[exercise.sets.length - 1];
          const newSet: Set = {
            id: `ex${exerciseId}-set${exercise.sets.length + 1}-${Date.now()}`,
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
    setSelectedExercises((prevExercises) =>
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
    const completedExercises = selectedExercises.filter((ex) => ex.completed).length;
    const duration = Math.round((new Date().getTime() - workoutStartTime.getTime()) / (1000 * 60));
    
    Alert.alert(
      "Workout Complete!",
      `Great job! You completed ${completedExercises}/${selectedExercises.length} exercises in ${duration} minutes.`,
      [
        { 
          text: "Finish", 
          onPress: onBack
        }
      ]
    );
  };

  const styles = getStyles(isDark);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#68D391" />
              <Text style={styles.backText}>End Workout</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.workoutTitle}>
            {selectedExercises.length === 0 ? "Empty Workout" : `${selectedExercises.length} Exercises`}
          </Text>
          {totalSets > 0 && (
            <Text style={styles.progressText}>
              {completedSets}/{totalSets} sets completed
            </Text>
          )}
        </View>

        {/* Progress Bar */}
        {totalSets > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
            </View>
          </View>
        )}

        {/* Add Exercise Button */}
        <TouchableOpacity 
          style={styles.addExerciseButton} 
          onPress={() => setShowExercisePicker(true)}
        >
          <Ionicons name="add" size={24} color="#68D391" />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>

        {/* Selected Exercises */}
        {selectedExercises.length > 0 ? (
          <View style={styles.exerciseList}>
            {selectedExercises.map((exercise) => (
              <View
                key={exercise.id}
                style={[styles.exerciseCard, exercise.completed && styles.completedExercise]}
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
                      <Ionicons name="checkmark-circle" size={20} color="#68D391" />
                    )}
                    <Text style={[styles.exerciseName, exercise.completed && { marginLeft: 8 }]}>
                      {exercise.name}
                    </Text>
                  </View>
                  <View style={styles.exerciseActions}>
                    <TouchableOpacity
                      onPress={() => removeExerciseFromWorkout(exercise.id)}
                      style={styles.removeExerciseButton}
                    >
                      <Ionicons name="trash" size={16} color="#FF3B30" />
                    </TouchableOpacity>
                    <Ionicons 
                      name={expandedExercise === exercise.id ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#A0AEC0" 
                    />
                  </View>
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
                              color={set.completed ? "#FFFFFF" : "#68D391"} 
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
                      <Ionicons name="add" size={20} color="#68D391" />
                      <Text style={styles.addSetButtonText}>Add Set</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyWorkout}>
            <Ionicons name="fitness-outline" size={64} color="#4A5568" />
            <Text style={styles.emptyWorkoutText}>No exercises added yet</Text>
            <Text style={styles.emptyWorkoutSubtext}>
              Tap "Add Exercise" to start building your workout
            </Text>
          </View>
        )}

        {/* Complete Workout Button */}
        {selectedExercises.length > 0 && (
          <TouchableOpacity style={styles.completeButton} onPress={handleCompleteWorkout}>
            <Text style={styles.completeButtonText}>Complete Workout</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Exercise Picker Modal */}
      <Modal
        visible={showExercisePicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Fixed Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <View style={styles.modalSpacer} />
          </View>

          {/* Fixed Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#A0AEC0" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#A0AEC0"
            />
          </View>

          {/* Fixed Muscle Group Filter */}
          <View style={styles.filterWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
              {muscleGroups.map((group) => (
                <TouchableOpacity
                  key={group}
                  style={[
                    styles.filterButton,
                    selectedMuscleGroup === group && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedMuscleGroup(group)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedMuscleGroup === group && styles.filterButtonTextActive
                  ]}>
                    {group.charAt(0).toUpperCase() + group.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Scrollable Exercise List */}
          <ScrollView 
            style={styles.exerciseScrollView}
            contentContainerStyle={styles.exerciseScrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            {filteredExercises.length > 0 ? (
              filteredExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.exercisePickerItem}
                  onPress={() => addExerciseToWorkout(exercise)}
                >
                  <View style={styles.exercisePickerItemContent}>
                    <Text style={styles.exercisePickerName}>{exercise.name}</Text>
                    <Text style={styles.exercisePickerMuscle}>{exercise.muscleGroup}</Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color="#68D391" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noExercisesFound}>
                <Text style={styles.noExercisesText}>No exercises found</Text>
                <Text style={styles.noExercisesSubtext}>
                  Try adjusting your search or filter
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E1E",
  },
  scrollView: {
    flex: 1,
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
  progressContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  progressBackground: {
    height: 8,
    backgroundColor: "#2D3748",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#68D391",
    borderRadius: 4,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2D3748",
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#68D391",
    borderStyle: "dashed",
  },
  addExerciseText: {
    fontSize: 16,
    color: "#68D391",
    fontWeight: "600",
    marginLeft: 8,
  },
  emptyWorkout: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyWorkoutText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#A0AEC0",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyWorkoutSubtext: {
    fontSize: 14,
    color: "#A0AEC0",
    textAlign: "center",
  },
  exerciseList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  exerciseCard: {
    backgroundColor: "#2D3748",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#4A5568",
  },
  completedExercise: {
    borderColor: "#68D391",
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
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F5F5F5",
  },
  exerciseActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  removeExerciseButton: {
    padding: 8,
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#4A5568",
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A0AEC0",
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
    color: "#F5F5F5",
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#4A5568",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    textAlign: "center",
    fontSize: 16,
    backgroundColor: "#1E1E1E",
    color: "#F5F5F5",
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
    backgroundColor: "#4A5568",
  },
  doneButtonCompleted: {
    backgroundColor: "#68D391",
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4A5568",
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#68D391",
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  addSetButtonText: {
    fontSize: 16,
    color: "#68D391",
    fontWeight: "600",
  },
  completeButton: {
    backgroundColor: "#68D391",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 32,
    marginHorizontal: 16,
    alignItems: "center",
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E1E1E",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#1E1E1E",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#4A5568",
    backgroundColor: "#1E1E1E",
  },
  modalCancelText: {
    fontSize: 16,
    color: "#68D391",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F5F5F5",
  },
  modalSpacer: {
    width: 60,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2D3748",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#F5F5F5",
    marginLeft: 8,
  },
  filterWrapper: {
    height: 50,
    marginBottom: 8,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: "#4A5568",
    minWidth: 60,
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#68D391",
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F5F5F5",
  },
  filterButtonTextActive: {
    color: "#1E1E1E",
  },
  exerciseScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  exerciseScrollContent: {
    paddingBottom: 20,
  },
  exercisePickerItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2D3748",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#4A5568",
  },
  exercisePickerItemContent: {
    flex: 1,
  },
  exercisePickerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F5F5F5",
    marginBottom: 4,
  },
  exercisePickerMuscle: {
    fontSize: 14,
    color: "#A0AEC0",
    textTransform: "capitalize",
  },
  noExercisesFound: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noExercisesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#A0AEC0",
    marginBottom: 8,
  },
  noExercisesSubtext: {
    fontSize: 14,
    color: "#A0AEC0",
    textAlign: "center",
  },
});