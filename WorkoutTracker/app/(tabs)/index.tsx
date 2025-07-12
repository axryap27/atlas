// app/(tabs)/index.tsx - Fixed Home Dashboard
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Updated imports to match your file structure
const API_BASE_URL =
  "https://workout-tracker-production-9537.up.railway.app/api";

// Simplified API service (inline)
const apiService = {
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

  getUserSessions: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching sessions:", error);
      return []; // Return empty array if fails
    }
  },
};

// Simple types (inline)
interface WorkoutSession {
  id: number;
  startTime: string;
  duration?: number;
  notes?: string;
  location?: string;
}

interface ExerciseData {
  id: number;
  name: string;
  category: string;
  muscleGroup?: string;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log("Starting to load dashboard data...");

      const [sessionsData, exercisesData] = await Promise.all([
        apiService.getUserSessions(),
        apiService.getExercises(),
      ]);

      console.log("Sessions data:", sessionsData);
      console.log("Exercises data:", exercisesData);

      setRecentSessions(sessionsData.slice(0, 3));
      setExercises(exercisesData);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      // Set empty data on error
      setRecentSessions([]);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  const startQuickWorkout = () => {
    router.push("/workout");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const styles = getStyles(isDark);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Ready to Train?</Text>
          <Text style={styles.welcomeSubtitle}>
            {exercises.length} exercises available
          </Text>
        </View>

        {/* Quick Start Workout Button */}
        <TouchableOpacity
          style={styles.quickWorkoutButton}
          onPress={startQuickWorkout}
        >
          <View style={styles.quickWorkoutContent}>
            <Ionicons name="play-circle" size={40} color="#FFFFFF" />
            <View style={styles.quickWorkoutText}>
              <Text style={styles.quickWorkoutTitle}>Start Workout</Text>
              <Text style={styles.quickWorkoutSubtitle}>
                Begin your training session
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Recent Workouts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Workouts</Text>
            <TouchableOpacity onPress={() => router.push("/analytics")}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentSessions.length > 0 ? (
            recentSessions.map((session) => (
              <View key={session.id} style={styles.workoutCard}>
                <View style={styles.workoutCardHeader}>
                  <Text style={styles.workoutCardTitle}>
                    {session.notes || "Workout Session"}
                  </Text>
                  <Text style={styles.workoutCardDate}>
                    {formatDate(session.startTime)}
                  </Text>
                </View>
                <View style={styles.workoutCardStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {session.duration || 0}m
                    </Text>
                    <Text style={styles.statLabel}>Duration</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {session.location || "Gym"}
                    </Text>
                    <Text style={styles.statLabel}>Location</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="fitness-outline"
                size={48}
                color={isDark ? "#8E8E93" : "#C7C7CC"}
              />
              <Text style={styles.emptyStateText}>No recent workouts</Text>
              <Text style={styles.emptyStateSubtext}>
                Start your first workout to see it here
              </Text>
            </View>
          )}
        </View>

        {/* Available Exercises */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Exercises</Text>
            <Text style={styles.exerciseCount}>{exercises.length}</Text>
          </View>

          <View style={styles.exerciseGrid}>
            {exercises.map((exercise) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseCategory}>
                  {exercise.category} • {exercise.muscleGroup}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#000000" : "#F2F2F7",
    },
    scrollView: {
      flex: 1,
      padding: 20,
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
    welcomeSection: {
      marginBottom: 24,
    },
    welcomeTitle: {
      fontSize: 32,
      fontWeight: "bold",
      color: isDark ? "#FFFFFF" : "#000000",
      marginBottom: 4,
    },
    welcomeSubtitle: {
      fontSize: 16,
      color: isDark ? "#8E8E93" : "#6D6D70",
    },
    quickWorkoutButton: {
      backgroundColor: "#007AFF",
      borderRadius: 16,
      padding: 20,
      marginBottom: 32,
      shadowColor: "#007AFF",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    quickWorkoutContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    quickWorkoutText: {
      marginLeft: 16,
      flex: 1,
    },
    quickWorkoutTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#FFFFFF",
      marginBottom: 4,
    },
    quickWorkoutSubtitle: {
      fontSize: 14,
      color: "#FFFFFF",
      opacity: 0.8,
    },
    section: {
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: isDark ? "#FFFFFF" : "#000000",
    },
    seeAllText: {
      fontSize: 16,
      color: "#007AFF",
      fontWeight: "600",
    },
    exerciseCount: {
      fontSize: 16,
      color: isDark ? "#8E8E93" : "#6D6D70",
      fontWeight: "600",
    },
    workoutCard: {
      backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    workoutCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    workoutCardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: isDark ? "#FFFFFF" : "#000000",
      flex: 1,
    },
    workoutCardDate: {
      fontSize: 14,
      color: isDark ? "#8E8E93" : "#6D6D70",
    },
    workoutCardStats: {
      flexDirection: "row",
      gap: 20,
    },
    statItem: {
      alignItems: "center",
    },
    statValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#007AFF",
      marginBottom: 2,
    },
    statLabel: {
      fontSize: 12,
      color: isDark ? "#8E8E93" : "#6D6D70",
    },
    emptyState: {
      alignItems: "center",
      padding: 32,
    },
    emptyStateText: {
      fontSize: 16,
      fontWeight: "600",
      color: isDark ? "#8E8E93" : "#6D6D70",
      marginTop: 12,
      marginBottom: 4,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: isDark ? "#8E8E93" : "#6D6D70",
      textAlign: "center",
    },
    exerciseGrid: {
      gap: 12,
    },
    exerciseCard: {
      backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
      borderRadius: 12,
      padding: 16,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    exerciseName: {
      fontSize: 16,
      fontWeight: "600",
      color: isDark ? "#FFFFFF" : "#000000",
      marginBottom: 4,
    },
    exerciseCategory: {
      fontSize: 14,
      color: isDark ? "#8E8E93" : "#6D6D70",
      textTransform: "capitalize",
    },
  });
