import React, { useState, useEffect } from "react";
import { useRef } from "react";

const API_BASE_URL =
  "https://workout-tracker-production-9537.up.railway.app/api";

// API Service Functions
const apiService = {
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
};

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  SafeAreaView,
} from "react-native";

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

interface ActiveWorkoutProps {
  workoutName?: string;
  exercises?: Exercise[];
  onComplete?: () => void;
  onSave?: () => void;
}

const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({
  workoutName = "Push Day",
  exercises: initialExercises,
  onComplete = () => {},
  onSave = () => {},
}) => {
  const defaultExercises: Exercise[] = [
    {
      id: "1",
      name: "Bench Press",
      sets: [
        { id: "1-1", weight: "135", reps: "10", completed: false },
        { id: "1-2", weight: "155", reps: "8", completed: false },
        { id: "1-3", weight: "175", reps: "6", completed: false },
      ],
      completed: false,
      notes: "",
    },
    {
      id: "2",
      name: "Overhead Press",
      sets: [
        { id: "2-1", weight: "95", reps: "10", completed: false },
        { id: "2-2", weight: "105", reps: "8", completed: false },
        { id: "2-3", weight: "115", reps: "6", completed: false },
      ],
      completed: false,
      notes: "",
    },
    {
      id: "3",
      name: "Tricep Pushdown",
      sets: [
        { id: "3-1", weight: "50", reps: "12", completed: false },
        { id: "3-2", weight: "55", reps: "10", completed: false },
        { id: "3-3", weight: "60", reps: "8", completed: false },
      ],
      completed: false,
      notes: "",
    },
  ];

  const [exercises, setExercises] = useState<Exercise[]>(
    initialExercises || defaultExercises
  );
  const [expandedExercise, setExpandedExercise] = useState<string | null>(
    exercises[0]?.id || null
  );

  const [loading, setLoading] = useState(true);

  // Load real exercises from API
  useEffect(() => {
    const loadExercises = async () => {
      try {
        setLoading(true);
        const realExercises = await apiService.getExercises();
        console.log("Loaded exercises from API:", realExercises);

        if (realExercises.length > 0) {
          // Convert API exercises to your app format
          const formattedExercises = realExercises
            .slice(0, 3)
            .map((exercise: any, index: number) => ({
              id: exercise.id.toString(),
              name: exercise.name,
              sets: [
                {
                  id: `${exercise.id}-1`,
                  weight: "135",
                  reps: "10",
                  completed: false,
                },
                {
                  id: `${exercise.id}-2`,
                  weight: "155",
                  reps: "8",
                  completed: false,
                },
                {
                  id: `${exercise.id}-3`,
                  weight: "175",
                  reps: "6",
                  completed: false,
                },
              ],
              completed: false,
              notes: "",
            }));

          setExercises(formattedExercises);
        }
      } catch (error) {
        console.error("Failed to load exercises, using defaults");
        // Keep default exercises on error
      } finally {
        setLoading(false);
      }
    };

    loadExercises();
  }, []);

  // Calculate progress percentage
  const totalSets = exercises.reduce(
    (acc, exercise) => acc + exercise.sets.length,
    0
  );
  const completedSets = exercises.reduce(
    (acc, exercise) =>
      acc + exercise.sets.filter((set) => set.completed).length,
    0
  );
  const progressPercentage =
    totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

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

  const handleWeightChange = (
    exerciseId: string,
    setId: string,
    value: string
  ) => {
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

  const handleRepsChange = (
    exerciseId: string,
    setId: string,
    value: string
  ) => {
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

  const handleNotesChange = (exerciseId: string, notes: string) => {
    setExercises((prevExercises) =>
      prevExercises.map((exercise) => {
        if (exercise.id === exerciseId) {
          return { ...exercise, notes };
        }
        return exercise;
      })
    );
  };

  const handleCompleteWorkout = () => {
    const allCompleted = exercises.every((exercise) => exercise.completed);

    if (!allCompleted) {
      Alert.alert(
        "Incomplete Workout",
        "Not all exercises are marked as complete. Complete workout anyway?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Complete", onPress: onComplete },
        ]
      );
    } else {
      onComplete();
    }
  };

  const ProgressBar = ({ progress }: { progress: number }) => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBackground}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
    </View>
  );

  const WeightInput = ({ set, exercise }: { set: Set; exercise: Exercise }) => {
    const [localValue, setLocalValue] = useState(set.weight);

    const handleChange = (value: string) => {
      setLocalValue(value);
    };

    const handleBlur = () => {
      handleWeightChange(exercise.id, set.id, localValue);
    };

    return (
      <TextInput
        style={styles.input}
        value={localValue}
        onChangeText={handleChange}
        onBlur={handleBlur}
        placeholder=""
        keyboardType="decimal-pad"
        selectTextOnFocus={true}
      />
    );
  };

  const RepsInput = ({ set, exercise }: { set: Set; exercise: Exercise }) => {
    const [localValue, setLocalValue] = useState(set.reps);

    const handleChange = (value: string) => {
      setLocalValue(value);
    };

    const handleBlur = () => {
      handleRepsChange(exercise.id, set.id, localValue);
    };

    return (
      <TextInput
        style={styles.input}
        value={localValue}
        onChangeText={handleChange}
        onBlur={handleBlur}
        placeholder=""
        keyboardType="number-pad"
        selectTextOnFocus={true}
      />
    );
  };

  // Existing SetRow component starts here
  const SetRow = ({
    set,
    index,
    exercise,
  }: {
    set: Set;
    index: number;
    exercise: Exercise;
  }) => (
    <View style={[styles.setRow, set.completed && styles.completedSet]}>
      <Text style={styles.setNumber}>{index + 1}</Text>
      <WeightInput set={set} exercise={exercise} />
      <RepsInput set={set} exercise={exercise} />
      <View style={styles.setActions}>
        <TouchableOpacity
          style={[
            styles.doneButton,
            set.completed && styles.doneButtonCompleted,
          ]}
          onPress={() => handleSetComplete(exercise.id, set.id)}
        >
          <Text
            style={[
              styles.doneButtonText,
              set.completed && styles.doneButtonTextCompleted,
            ]}
          >
            {set.completed ? "✓" : "Done"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveSet(exercise.id, set.id)}
        >
          <Text style={styles.removeButtonText}>−</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.workoutTitle}>{workoutName}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.progressText}>
              {completedSets}/{totalSets} sets completed
            </Text>
            <TouchableOpacity style={styles.saveButton} onPress={onSave}>
              <Text style={styles.saveButtonText}>💾 Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Bar */}
        <ProgressBar progress={progressPercentage} />

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
                    <Text style={styles.checkmark}>✓ </Text>
                  )}
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                </View>
                <Text style={styles.expandIcon}>
                  {expandedExercise === exercise.id ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>

              {/* Only show sets when expanded */}
              {expandedExercise === exercise.id && (
                <>
                  {/* Sets Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderText}>Set</Text>
                    <Text style={styles.tableHeaderText}>Weight (lbs)</Text>
                    <Text style={styles.tableHeaderText}>Reps</Text>
                    <Text style={styles.tableHeaderText}>Actions</Text>
                  </View>

                  {/* Sets */}
                  {exercise.sets.map((set, index) => (
                    <SetRow
                      key={set.id}
                      set={set}
                      index={index}
                      exercise={exercise}
                    />
                  ))}

                  {/* Add Set Button */}
                  <TouchableOpacity
                    style={styles.addSetButton}
                    onPress={() => handleAddSet(exercise.id)}
                  >
                    <Text style={styles.addSetButtonText}>+ Add Set</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Notes (when expanded) */}
              {expandedExercise === exercise.id && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={exercise.notes}
                    onChangeText={(notes) =>
                      handleNotesChange(exercise.id, notes)
                    }
                    placeholder="Add notes about this exercise..."
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Complete Workout Button */}
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleCompleteWorkout}
        >
          <Text style={styles.completeButtonText}>Complete Workout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  workoutTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  progressText: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: "#ecf0f1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveButtonText: {
    fontSize: 14,
    color: "#2c3e50",
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBackground: {
    height: 8,
    backgroundColor: "#ecf0f1",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3498db",
    borderRadius: 4,
  },
  exerciseList: {
    gap: 16,
  },
  exerciseCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedExercise: {
    borderColor: "#27ae60",
    borderWidth: 2,
    backgroundColor: "#f8fff8",
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
  checkmark: {
    color: "#27ae60",
    fontSize: 18,
    fontWeight: "bold",
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  expandIcon: {
    fontSize: 16,
    color: "#7f8c8d",
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7f8c8d",
    flex: 1,
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f9fa",
  },
  completedSet: {
    backgroundColor: "#f8fff8",
  },
  setNumber: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    color: "#2c3e50",
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    textAlign: "center",
    fontSize: 16,
    backgroundColor: "white",
  },
  setActions: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  doneButton: {
    backgroundColor: "#ecf0f1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  doneButtonCompleted: {
    backgroundColor: "#27ae60",
  },
  doneButtonText: {
    fontSize: 14,
    color: "#2c3e50",
    fontWeight: "600",
  },
  doneButtonTextCompleted: {
    color: "white",
  },
  removeButton: {
    backgroundColor: "#e74c3c",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
  },
  addSetButton: {
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
    alignItems: "center",
  },
  addSetButtonText: {
    fontSize: 16,
    color: "#3498db",
    fontWeight: "600",
  },
  notesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#ecf0f1",
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
    textAlignVertical: "top",
  },
  completeButton: {
    backgroundColor: "#27ae60",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 32,
    alignItems: "center",
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
});

export default ActiveWorkout;
