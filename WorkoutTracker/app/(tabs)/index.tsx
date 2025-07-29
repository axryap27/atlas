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
import RecentWorkouts from '../components/RecentWorkouts';
import { supabaseApi } from '../services/supabase-api';
import { authService } from '../services/auth';

// Simple types (inline)
interface ExerciseData {
  id: number;
  name: string;
  category: string;
  muscleGroup?: string;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Starting to load dashboard data...');
      
      const exercisesData = await supabaseApi.getExercises();
      
      console.log('Exercises data:', exercisesData);
      
      if (Array.isArray(exercisesData)) {
        setExercises(exercisesData);
      } else {
        setExercises([]);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  const startQuickWorkout = () => {
    router.push("/workout" as any);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await authService.signOut();
            if (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
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
        <RecentWorkouts 
          onViewWorkout={(sessionId) => {
            console.log('View workout:', sessionId);
            // TODO: Navigate to workout details
          }}
          showDebugTools={false} // Disable debug tools in production
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