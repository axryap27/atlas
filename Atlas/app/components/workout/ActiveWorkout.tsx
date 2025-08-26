// app/components/workout/ActiveWorkout.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  SafeAreaView,
  Modal,
  Animated,
  PanResponder,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WorkoutScreen, Exercise, Set } from "../../(tabs)/workout";
import { supabaseApi } from "../../services/supabase-api";
import { SocialApi } from "../../services/social-api";

interface ExerciseData {
  id: number;
  name: string;
  description?: string;
  category: string;
  muscleGroup?: string;
  equipment?: string;
}

interface SessionData {
  id: number;
  startTime: string;
  workoutDayId?: number;
}

interface ActiveWorkoutProps {
  initialExercises?: Exercise[];
  onNavigate: (screen: WorkoutScreen) => void;
  onBack: () => void;
  templateId?: number; // Add template ID for session tracking
}

const apiService = {
  getExercises: async () => {
    try {
      const data = await supabaseApi.getExercises();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Error fetching exercises:", error);
      return [];
    }
  },

  createSession: async (workoutDayId?: number): Promise<SessionData | null> => {
    try {
      const sessionData = {
        workout_day_id: workoutDayId
      };
      
      const response = await supabaseApi.startSession(sessionData);
      
      return {
        id: response.id,
        startTime: response.start_time,
        workoutDayId: response.workout_day_id
      };
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  },

  finishSession: async (sessionId: number) => {
    try {
      await supabaseApi.completeSession(sessionId);
    } catch (error) {
      console.error('Error finishing session:', error);
    }
  },

  logSet: async (sessionId: number, exerciseId: number, setNumber: number, reps: number, weight: number) => {
    try {
      const setData = {
        exercise_id: exerciseId,
        set_number: setNumber,
        reps: reps,
        weight: weight,
      };
      
      await supabaseApi.logSet(sessionId, setData);
    } catch (error) {
      console.error('Error logging set:', error);
    }
  },
};

export default function ActiveWorkout({ 
  initialExercises = [], 
  onNavigate, 
  onBack,
  templateId
}: ActiveWorkoutProps) {
  
  
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>(initialExercises);
  const [availableExercises, setAvailableExercises] = useState<ExerciseData[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("all");
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [workoutStartTime] = useState(new Date());
  
  // Session tracking state
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Exercise swipe state
  const [swipedExercise, setSwipedExercise] = useState<string | null>(null);
  const exerciseSwipeRefs = useRef<{ [key: string]: Animated.Value }>({});

  useEffect(() => {
    loadAvailableExercises();
    initializeSession();
    
    // Auto-expand first exercise if we have exercises from template
    if (initialExercises.length > 0) {
      setExpandedExercise(initialExercises[0].id);
    }

    // Start elapsed time counter
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const initializeSession = async () => {
    // Don't create a session until the user adds exercises or sets
    // Sessions will be created when needed
    setCurrentSession(null);
  };

  const ensureSession = async () => {
    if (!currentSession) {
      const session = await apiService.createSession(templateId);
      if (session) {
        setCurrentSession(session);
        return session;
      }
    }
    return currentSession;
  };

  const loadAvailableExercises = async () => {
    try {
      setLoading(true);
      const exercisesData = await apiService.getExercises();
      
      setAvailableExercises(exercisesData);
    } catch (error) {
      console.error("Failed to load exercises:", error);
      setAvailableExercises([]);
      Alert.alert("Error", "Failed to load exercises");
    } finally {
      setLoading(false);
    }
  };

  const muscleGroups = ["all", "arms", "back", "chest", "core", "legs", "shoulders"];

  // Helper function to determine if exercise should have bodyweight default
  const isBodyweightExercise = (exercise: ExerciseData): boolean => {
    if (exercise.equipment !== "bodyweight") return false;
    
    // Exclude squats and squat variations
    const excludedNames = ["squat", "lunge", "split squat"];
    const exerciseName = exercise.name.toLowerCase();
    
    return !excludedNames.some(excluded => exerciseName.includes(excluded));
  };

  const filteredExercises = (availableExercises || []).filter(exercise => {
    const matchesSearch = exercise.name && exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscleGroup = selectedMuscleGroup === "all" || exercise.muscleGroup === selectedMuscleGroup;
    return matchesSearch && matchesMuscleGroup;
  });

  const addExerciseToWorkout = (exercise: ExerciseData) => {
    // Set default weight for bodyweight exercises (excluding squats/lunges)
    const defaultWeight = isBodyweightExercise(exercise) ? "bodyweight" : "";
    
    const newExercise: Exercise = {
      id: exercise.id.toString(),
      name: exercise.name,
      sets: [
        { id: `ex${exercise.id}-set1`, weight: defaultWeight, reps: "", completed: false },
        { id: `ex${exercise.id}-set2`, weight: defaultWeight, reps: "", completed: false },
        { id: `ex${exercise.id}-set3`, weight: defaultWeight, reps: "", completed: false },
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
    // Clean up animation ref
    delete exerciseSwipeRefs.current[exerciseId];
    if (swipedExercise === exerciseId) {
      setSwipedExercise(null);
    }
  };

  const createExerciseSwipeGesture = (exerciseId: string) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        
        // More strict horizontal detection to prevent scroll interference
        const isHorizontal = Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) > 15;
        
        if (isHorizontal) {
          if (swipedExercise && swipedExercise !== exerciseId) {
            closeExerciseSwipe(swipedExercise);
          }
          return true;
        }
        return false;
      },
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const { dx, dy } = gestureState;
        
        // Capture the gesture early if it's clearly horizontal
        const isDefinitelyHorizontal = Math.abs(dx) > Math.abs(dy) * 3 && Math.abs(dx) > 20;
        return isDefinitelyHorizontal;
      },
      onPanResponderGrant: () => {
        if (Platform.OS === 'ios') {
          const Haptics = require('expo-haptics');
          Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Light);
        }
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx } = gestureState;
        const maxSwipe = -80;
        
        let swipeValue;
        if (dx < 0) {
          swipeValue = Math.max(maxSwipe, dx);
        } else {
          swipeValue = Math.min(20, dx * 0.3);
        }
        
        if (exerciseSwipeRefs.current[exerciseId]) {
          exerciseSwipeRefs.current[exerciseId].setValue(swipeValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        const shouldShowDelete = dx < -40 || (dx < -20 && vx < -0.5);
        
        if (shouldShowDelete) {
          setSwipedExercise(exerciseId);
          Animated.spring(exerciseSwipeRefs.current[exerciseId], {
            toValue: -80,
            useNativeDriver: true,
            speed: 20,
            bounciness: 0,
          }).start();
        } else {
          setSwipedExercise(null);
          Animated.spring(exerciseSwipeRefs.current[exerciseId], {
            toValue: 0,
            useNativeDriver: true,
            speed: 20,
            bounciness: 0,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        setSwipedExercise(null);
        Animated.spring(exerciseSwipeRefs.current[exerciseId], {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 0,
        }).start();
      },
    });
  };

  const closeExerciseSwipe = (exerciseId: string) => {
    if (exerciseSwipeRefs.current[exerciseId]) {
      setSwipedExercise(null);
      Animated.spring(exerciseSwipeRefs.current[exerciseId], {
        toValue: 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }).start();
    }
  };

  // Calculate progress
  const totalSets = selectedExercises.reduce((acc, exercise) => acc + exercise.sets.length, 0);
  const completedSets = selectedExercises.reduce(
    (acc, exercise) => acc + exercise.sets.filter((set) => set.completed).length,
    0
  );
  const progressPercentage = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSetComplete = async (exerciseId: string, setId: string) => {
    const exercise = selectedExercises.find(ex => ex.id === exerciseId);
    const set = exercise?.sets.find(s => s.id === setId);
    
    if (!exercise || !set) return;

    // Toggle completion state
    const newCompleted = !set.completed;
    
    setSelectedExercises((prevExercises) =>
      prevExercises.map((exercise) => {
        if (exercise.id === exerciseId) {
          const updatedSets = exercise.sets.map((set) => {
            if (set.id === setId) {
              return { ...set, completed: newCompleted };
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

    // Create session and log set if completed
    if (newCompleted && set.weight && set.reps) {
      const session = await ensureSession();
      if (session) {
        const setNumber = exercise.sets.findIndex(s => s.id === setId) + 1;
        
        // Handle bodyweight exercises - convert "bodyweight" to 0 for logging
        let weightValue: number;
        if (set.weight.toLowerCase() === "bodyweight") {
          weightValue = 0; // 0 indicates bodyweight in database
        } else {
          weightValue = parseFloat(set.weight);
        }
        
        await apiService.logSet(
          session.id,
          parseInt(exerciseId),
          setNumber,
          parseInt(set.reps),
          weightValue
        );
      }
    }
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

  const handleRepsIncrement = (exerciseId: string, setId: string) => {
    setSelectedExercises((exercises) =>
      exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId 
                  ? { ...set, reps: String(Math.max(0, (parseInt(set.reps) || 0) + 1)) }
                  : set
              ),
            }
          : exercise
      )
    );
  };

  const handleRepsDecrement = (exerciseId: string, setId: string) => {
    setSelectedExercises((exercises) =>
      exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId 
                  ? { ...set, reps: String(Math.max(0, (parseInt(set.reps) || 0) - 1)) }
                  : set
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

  const shareWorkout = async (sessionId: number) => {
    try {
      // Get current user profile
      const userProfile = await SocialApi.getCurrentUserProfile();
      if (!userProfile) {
        Alert.alert(
          "Profile Required",
          "Please set up your social profile first to share workouts.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Set Up Profile", onPress: () => {
              // Navigate to social tab for profile setup
              Alert.alert("Navigate to Social", "Go to the Social tab to set up your profile.");
            }}
          ]
        );
        return;
      }

      // Create workout post
      await SocialApi.createWorkoutPost(userProfile.id, sessionId, 
        "Just completed an awesome workout! 💪", "friends");
      
      Alert.alert(
        "Workout Shared! 🎉",
        "Your workout has been shared with your friends!",
        [{ text: "Awesome!", onPress: () => onBack() }]
      );
    } catch (error) {
      console.error('Error sharing workout:', error);
      Alert.alert("Error", "Failed to share workout. Please try again.");
      onBack();
    }
  };

  const handleCompleteWorkout = async () => {
    const completedExercises = selectedExercises.filter((ex) => ex.completed).length;
    const totalCompletedSets = selectedExercises.reduce((acc, ex) => 
      acc + ex.sets.filter(set => set.completed).length, 0
    );
    const duration = Math.round((new Date().getTime() - workoutStartTime.getTime()) / (1000 * 60));
    
    // Only create/finish session if there are actually completed sets
    if (totalCompletedSets > 0 && currentSession) {
      await apiService.finishSession(currentSession.id);
      
      // Offer to share workout
      Alert.alert(
        "Workout Complete! 🎉",
        `Great job! You completed ${completedExercises}/${selectedExercises.length} exercises in ${duration} minutes. Want to share your workout with friends?`,
        [
          { text: "Not Now", onPress: () => onBack() },
          { 
            text: "Share", 
            onPress: () => shareWorkout(currentSession.id)
          }
        ]
      );
    } else if (totalCompletedSets === 0) {
      // No completed sets, don't save anything
      onBack();
      return;
    }
  };

  const handleEndWorkout = async () => {
    const hasCompletedSets = selectedExercises.some(ex => ex.sets.some(set => set.completed));
    
    if (hasCompletedSets && currentSession) {
      Alert.alert(
        "End Workout",
        "Are you sure you want to end this workout? Your progress will be saved.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "End Workout", 
            style: "destructive",
            onPress: async () => {
              await apiService.finishSession(currentSession.id);
              
              // Offer to share workout
              Alert.alert(
                "Workout Complete! 🎉",
                "Great job! Want to share your workout with friends?",
                [
                  { text: "Not Now", onPress: () => onBack() },
                  { 
                    text: "Share", 
                    onPress: () => shareWorkout(currentSession.id)
                  }
                ]
              );
            }
          }
        ]
      );
    } else {
      // No completed sets or no session created, just exit without saving
      onBack();
    }
  };

  const styles = getStyles();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={handleEndWorkout} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#84CC16" />
              <Text style={styles.backText}>End Workout</Text>
            </TouchableOpacity>
            
            {/* Workout Timer */}
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={16} color="#CBD5E1" />
              <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
            </View>
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
          <Ionicons name="add" size={24} color="#84CC16" />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>

        {/* Selected Exercises */}
        {selectedExercises.length > 0 ? (
          <View style={styles.exerciseList}>
            {selectedExercises.map((exercise) => {
              // Initialize swipe animation ref if it doesn't exist
              if (!exerciseSwipeRefs.current[exercise.id]) {
                exerciseSwipeRefs.current[exercise.id] = new Animated.Value(0);
              }
              
              const exerciseSwipeGesture = createExerciseSwipeGesture(exercise.id);
              
              return (
                <View key={exercise.id} style={styles.exerciseSwipeContainer}>
                  {/* Delete button behind the card */}
                  <View style={styles.exerciseDeleteButton}>
                    <TouchableOpacity
                      style={styles.deleteButtonContent}
                      onPress={() => removeExerciseFromWorkout(exercise.id)}
                    >
                      <Ionicons name="trash" size={20} color="white" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Swipeable exercise card */}
                  <Animated.View
                    style={[
                      styles.swipeableExerciseCard,
                      {
                        transform: [{ translateX: exerciseSwipeRefs.current[exercise.id] }]
                      }
                    ]}
                    {...exerciseSwipeGesture.panHandlers}
                  >
                    <View style={[styles.exerciseCard, exercise.completed && styles.completedExercise]}>
                      {/* Exercise Header */}
                      <TouchableOpacity
                        style={styles.exerciseHeader}
                        onPress={() => {
                          if (swipedExercise === exercise.id) {
                            closeExerciseSwipe(exercise.id);
                          } else {
                            setExpandedExercise(
                              expandedExercise === exercise.id ? null : exercise.id
                            );
                          }
                        }}
                      >
                        <View style={styles.exerciseTitle}>
                          {exercise.completed && (
                            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                          )}
                          <Text style={[styles.exerciseName, exercise.completed && { marginLeft: 8 }]}>
                            {exercise.name}
                          </Text>
                        </View>
                        <View style={styles.exerciseActions}>
                          <Ionicons 
                            name={expandedExercise === exercise.id ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color="#C7C7CC" 
                          />
                        </View>
                      </TouchableOpacity>

                {/* Sets (when expanded) */}
                {expandedExercise === exercise.id && (
                  <>
                    {/* Sets Table Header */}
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderText, styles.tableHeaderSet]}>Set</Text>
                      <Text style={[styles.tableHeaderText, styles.tableHeaderWeight]}>Weight</Text>
                      <Text style={[styles.tableHeaderText, styles.tableHeaderReps]}>Reps</Text>
                      <Text style={[styles.tableHeaderText, styles.tableHeaderActions]}>✓</Text>
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
                          placeholderTextColor="#94A3B8"
                          keyboardType="decimal-pad"
                          selectTextOnFocus={true}
                        />
                        
                        <View style={styles.inputWithButtons}>
                          <TouchableOpacity 
                            style={[styles.incrementButton, styles.incrementButtonLeft]} 
                            onPress={() => handleRepsDecrement(exercise.id, set.id)}
                          >
                            <Ionicons name="remove" size={16} color="#84CC16" />
                          </TouchableOpacity>
                          
                          <TextInput
                            style={[styles.input, styles.inputWithButtonsField]}
                            value={set.reps}
                            onChangeText={(value) => handleRepsChange(exercise.id, set.id, value)}
                            placeholder="0"
                            placeholderTextColor="#94A3B8"
                            keyboardType="number-pad"
                            selectTextOnFocus={true}
                          />
                          
                          <TouchableOpacity 
                            style={[styles.incrementButton, styles.incrementButtonRight]} 
                            onPress={() => handleRepsIncrement(exercise.id, set.id)}
                          >
                            <Ionicons name="add" size={16} color="#84CC16" />
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.setActions}>
                          <TouchableOpacity
                            style={[styles.doneButton, set.completed && styles.doneButtonCompleted]}
                            onPress={() => handleSetComplete(exercise.id, set.id)}
                          >
                            <Ionicons 
                              name={set.completed ? "checkmark" : "ellipse-outline"} 
                              size={20} 
                              color={set.completed ? "#FFFFFF" : "#84CC16"} 
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
                      <Ionicons name="add" size={20} color="#84CC16" />
                      <Text style={styles.addSetButtonText}>Add Set</Text>
                    </TouchableOpacity>
                      </>
                    )}
                    </View>
                  </Animated.View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyWorkout}>
            <Ionicons name="fitness-outline" size={64} color="#C7C7CC" />
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
            <Ionicons name="search" size={20} color="#CBD5E1" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
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
                    <Text style={styles.exercisePickerMuscle}>{exercise.muscleGroup || "Unknown"}</Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color="#84CC16" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noExercisesFound}>
                <Text style={styles.noExercisesText}>No exercises found</Text>
                <Text style={styles.noExercisesSubtext}>
                  {loading ? "Loading exercises..." : "Try adjusting your search or filter"}
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#334155", // Dark slate background
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
    color: "#84CC16", // Lime green accent
    marginLeft: 4,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#475569", // Medium slate background
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: "#64748B", // Subtle border
  },
  timerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F1F5F9", // Light text for dark background
  },
  workoutTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#F1F5F9", // Light text for dark background
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: "#CBD5E1", // Light slate gray
  },
  progressContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  progressBackground: {
    height: 8,
    backgroundColor: "#64748B", // Darker slate for progress background
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#84CC16", // Lime green accent
    borderRadius: 4,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#475569", // Medium slate background
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#84CC16", // Lime green border
    borderStyle: "dashed",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  addExerciseText: {
    fontSize: 16,
    color: "#84CC16", // Lime green accent
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
    color: "#CBD5E1", // Light slate gray
    marginTop: 16,
    marginBottom: 8,
  },
  emptyWorkoutSubtext: {
    fontSize: 14,
    color: "#CBD5E1", // Light slate gray
    textAlign: "center",
  },
  exerciseList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  exerciseSwipeContainer: {
    position: "relative",
    marginBottom: 16,
  },
  exerciseDeleteButton: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 1,
  },
  deleteButtonContent: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  swipeableExerciseCard: {
    backgroundColor: "transparent",
    zIndex: 2,
  },
  exerciseCard: {
    backgroundColor: "#475569", // Medium slate background
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#64748B", // Subtle border
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
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F1F5F9", // Light text for dark background
  },
  exerciseActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#64748B", // Darker border for dark theme
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#CBD5E1", // Light slate gray
    textAlign: "center",
  },
  tableHeaderSet: {
    width: 30,
  },
  tableHeaderWeight: {
    width: 80,
    marginHorizontal: 4,
  },
  tableHeaderReps: {
    width: 120,
    marginHorizontal: 4,
  },
  tableHeaderActions: {
    width: 80,
    marginLeft: 8,
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
    width: 30,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#F1F5F9", // Light text for dark background
  },
  input: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: "#64748B", // Darker border
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    textAlign: "center",
    fontSize: 16,
    backgroundColor: "#334155", // Dark slate background
    color: "#F1F5F9", // Light text
  },
  inputWithButtons: {
    width: 120,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
  },
  inputWithButtonsField: {
    flex: 1,
    marginHorizontal: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderRadius: 0,
  },
  incrementButton: {
    width: 32,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#64748B", // Darker border
    backgroundColor: "#334155", // Dark slate background
  },
  incrementButtonLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderRightWidth: 0,
  },
  incrementButtonRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderLeftWidth: 0,
  },
  setActions: {
    width: 80,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginLeft: 8,
  },
  doneButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#64748B", // Darker slate
  },
  doneButtonCompleted: {
    backgroundColor: "#84CC16", // Lime green accent
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#64748B", // Darker slate
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#84CC16", // Lime green border
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  addSetButtonText: {
    fontSize: 16,
    color: "#84CC16", // Lime green text
    fontWeight: "600",
  },
  completeButton: {
    backgroundColor: "#84CC16", // Lime green accent
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
    color: "#FFFFFF",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#334155", // Dark slate background
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#64748B", // Darker border
    backgroundColor: "#334155", // Dark slate background
  },
  modalCancelText: {
    fontSize: 16,
    color: "#84CC16", // Lime green accent
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F1F5F9", // Light text for dark background
  },
  modalSpacer: {
    width: 60,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#475569", // Medium slate background
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#64748B", // Darker border
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#F1F5F9", // Light text
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
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: "#64748B", // Darker slate
    minWidth: 60,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: "#84CC16", // Lime green accent
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F1F5F9", // Light text
    textAlign: "center",
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
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
    backgroundColor: "#475569", // Medium slate background
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#64748B", // Subtle border
  },
  exercisePickerItemContent: {
    flex: 1,
  },
  exercisePickerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F1F5F9", // Light text for dark background
    marginBottom: 4,
  },
  exercisePickerMuscle: {
    fontSize: 14,
    color: "#CBD5E1", // Light slate gray
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
    color: "#CBD5E1", // Light slate gray
    marginBottom: 8,
  },
  noExercisesSubtext: {
    fontSize: 14,
    color: "#CBD5E1", // Light slate gray
    textAlign: "center",
  },
});