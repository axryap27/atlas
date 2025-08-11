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
  Platform,
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

interface VolumeData {
  date: string;
  volume: number;
  workoutName: string;
  sessionId: number;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleWorkoutDeleted = () => {
    // Refresh both the dashboard data and trigger recent workouts refresh
    loadDashboardData();
    setRefreshTrigger(prev => prev + 1);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load exercises
      const exercisesData = await supabaseApi.getExercises();
      
      if (Array.isArray(exercisesData)) {
        setExercises(exercisesData);
      } else {
        setExercises([]);
      }

      // Load recent volume data for mini chart
      await loadVolumeData();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  const loadVolumeData = async () => {
    try {
      // Get last 7 sessions for mini chart
      const sessions = await supabaseApi.getUserSessions(undefined, 7);
      
      // Calculate volume data
      const volumeData: VolumeData[] = sessions
        .filter(session => session.end_time) // Only completed sessions
        .map(session => {
          // Calculate total volume for this session
          const volume = session.set_logs?.reduce((total, setLog) => {
            if (setLog.reps) {
              const weight = setLog.weight || 0;
              if (weight === 0) {
                // Bodyweight exercise - count reps only
                return total + setLog.reps;
              } else {
                // Weighted exercise - count volume (weight * reps)
                return total + (weight * setLog.reps);
              }
            }
            return total;
          }, 0) || 0;

          return {
            date: session.start_time,
            volume,
            workoutName: session.workout_day?.name || 'Custom Workout',
            sessionId: session.id,
          };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setVolumeData(volumeData);
    } catch (error) {
      console.error('Error loading volume data:', error);
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
          <Text style={styles.welcomeTitle}>
            {authService.getCurrentUsername() ? 
              `Welcome back, ${authService.getCurrentUsername()}!` : 
              'Ready to Train?'
            }
          </Text>
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
            // TODO: Navigate to workout details
          }}
          showDebugTools={false} // Disable debug tools in production
          refreshTrigger={refreshTrigger}
          onWorkoutDeleted={handleWorkoutDeleted}
        />
        
        {/* Spacer */}
        <View style={styles.sectionSpacer} />
        
        {/* Calendar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Calendar</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>View Month</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.calendarContainer}>
            <View style={styles.calendarPlaceholder}>
              <Ionicons name="calendar-outline" size={48} color="#C7C7CC" />
              <Text style={styles.calendarPlaceholderTitle}>Calendar Coming Soon</Text>
              <Text style={styles.calendarPlaceholderText}>
                Track your workout schedule and plan future sessions
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
      backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
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
      marginBottom: 15,
    },
    welcomeTitle: {
      fontSize: 32,
      fontWeight: "400",
      color: isDark ? "#FFFFFF" : "#000000",
      marginBottom: 4,
      letterSpacing: 0,
      fontFamily: Platform.OS === 'ios' ? 'Futura' : 'sans-serif',
    },
    welcomeSubtitle: {
      fontSize: 16,
      color: isDark ? "#94A3B8" : "#64748B",
    },
    quickWorkoutButton: {
      backgroundColor: "#84CC16",
      borderRadius: 16,
      padding: 20,
      marginBottom: 32,
      shadowColor: "#84CC16",
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
    sectionSpacer: {
      height: 24,
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
      color: "#84CC16",
      fontWeight: "600",
    },
    calendarContainer: {
      backgroundColor: isDark ? "#334155" : "#FFFFFF",
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: isDark ? "#000000" : "#64748B",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    calendarPlaceholder: {
      alignItems: "center",
      paddingVertical: 32,
      paddingHorizontal: 16,
    },
    calendarPlaceholderTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: isDark ? "#FFFFFF" : "#000000",
      marginTop: 12,
      marginBottom: 8,
    },
    calendarPlaceholderText: {
      fontSize: 14,
      color: isDark ? "#94A3B8" : "#64748B",
      textAlign: "center",
      lineHeight: 20,
    },
  });