// app/(tabs)/index.tsx - Clean Home Dashboard
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
import RecentWorkouts from "../components/RecentWorkouts";


// Updated imports to match your file structure
const API_BASE_URL = "https://workout-tracker-production-9537.up.railway.app/api";

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
      console.log('Starting to load dashboard data...');
      
      const [sessionsData, exercisesData] = await Promise.all([
        apiService.getUserSessions(),
        apiService.getExercises(),
      ]);
      
      console.log('Sessions data:', sessionsData);
      console.log('Exercises data:', exercisesData);
      
      // Handle API errors gracefully
      if (Array.isArray(sessionsData)) {
        setRecentSessions(sessionsData.slice(0, 3));
      } else {
        setRecentSessions([]);
      }
      
      if (Array.isArray(exercisesData)) {
        setExercises(exercisesData);
      } else {
        setExercises([]);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set empty data on error
      setRecentSessions([]);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  const startQuickWorkout = () => {
    router.push("/workout" as any);
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
        {/* Recent Workouts */}
        <RecentWorkouts 
          onViewWorkout={(sessionId) => {
            console.log('View workout:', sessionId);
            // TODO: Navigate to workout details
          }} 
        />
        
        {/* Progress Overview - Coming Soon */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Progress Overview</Text>
            <Text style={styles.seeAllText}>View All</Text>
          </View>
          
          <View style={styles.progressOverview}>
            <View style={styles.progressPlaceholder}>
              <Ionicons name="analytics-outline" size={48} color="#A0AEC0" />
              <Text style={styles.progressPlaceholderText}>Progress Charts</Text>
              <Text style={styles.progressPlaceholderSubtext}>
                Visual progress tracking coming soon
              </Text>
            </View>
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
    progressOverview: {
      marginBottom: 16,
    },
    progressPlaceholder: {
      backgroundColor: "#2D3748",
      borderRadius: 12,
      padding: 32,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#4A5568",
      borderStyle: "dashed",
    },
    progressPlaceholderText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#F5F5F5",
      marginTop: 12,
      marginBottom: 4,
    },
    progressPlaceholderSubtext: {
      fontSize: 14,
      color: "#A0AEC0",
      textAlign: "center",
    },
  });