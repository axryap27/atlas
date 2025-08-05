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
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RecentWorkouts from '../components/RecentWorkouts';
import { supabaseApi } from '../services/supabase-api';
import { authService } from '../services/auth';

const { width: screenWidth } = Dimensions.get('window');

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
      console.log('Starting to load dashboard data...');
      
      // Load exercises
      const exercisesData = await supabaseApi.getExercises();
      console.log('Exercises data:', exercisesData);
      
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
            workoutName: session.workoutDay?.name || 'Custom Workout',
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

  const navigateToProgress = () => {
    router.push("/progress" as any);
  };

  const getMuscleGroupStrength = (muscleGroup: string) => {
    // Mock data - in real app, calculate from user's workout history
    const strengthData = {
      'chest': 'intermediate', // Green
      'arms': 'beginner', // Orange  
      'shoulders': 'beginner', // Red
      'back': 'intermediate', // Green
      'core': 'advanced', // Blue
      'legs': 'advanced', // Blue
    };
    return strengthData[muscleGroup] || 'beginner';
  };

  const getStrengthColor = (level: string) => {
    const colors = {
      'beginner': '#FF4444', // Red
      'novice': '#FF8800', // Orange
      'intermediate': '#44AA44', // Green
      'advanced': '#0088FF', // Blue
      'expert': '#8844FF', // Purple
    };
    return colors[level] || '#C7C7CC';
  };

  const renderMuscleMap = () => {
    if (volumeData.length === 0) {
      return (
        <View style={styles.miniChartEmpty}>
          <Ionicons name="body-outline" size={32} color="#C7C7CC" />
          <Text style={styles.miniChartEmptyText}>No data yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.muscleMap}>
        {/* Human body silhouette */}
        <View style={styles.humanBody}>
          {/* Head */}
          <View style={styles.bodyHead} />
          <View style={styles.bodyNeck} />
          
          {/* Shoulders & Upper Body */}
          <View style={[
            styles.bodyShoulders,
            { backgroundColor: getStrengthColor(getMuscleGroupStrength('shoulders')) }
          ]} />
          
          {/* Arms - Left and Right */}
          <View style={[
            styles.bodyLeftArm,
            { backgroundColor: getStrengthColor(getMuscleGroupStrength('arms')) }
          ]} />
          <View style={[
            styles.bodyRightArm,
            { backgroundColor: getStrengthColor(getMuscleGroupStrength('arms')) }
          ]} />
          
          {/* Forearms */}
          <View style={[styles.bodyLeftForearm, { backgroundColor: getStrengthColor(getMuscleGroupStrength('arms')) }]} />
          <View style={[styles.bodyRightForearm, { backgroundColor: getStrengthColor(getMuscleGroupStrength('arms')) }]} />
          
          {/* Torso */}
          <View style={styles.bodyTorso} />
          
          {/* Chest */}
          <View style={[
            styles.bodyChest,
            { backgroundColor: getStrengthColor(getMuscleGroupStrength('chest')) }
          ]} />
          
          {/* Core/Abs */}
          <View style={[
            styles.bodyCore,
            { backgroundColor: getStrengthColor(getMuscleGroupStrength('core')) }
          ]} />
          
          {/* Back (subtle outline) */}
          <View style={[
            styles.bodyBack,
            { backgroundColor: getStrengthColor(getMuscleGroupStrength('back')) }
          ]} />
          
          {/* Waist area */}
          <View style={styles.bodyWaist} />
          
          {/* Legs - Thighs */}
          <View style={[
            styles.bodyLeftThigh,
            { backgroundColor: getStrengthColor(getMuscleGroupStrength('legs')) }
          ]} />
          <View style={[
            styles.bodyRightThigh,
            { backgroundColor: getStrengthColor(getMuscleGroupStrength('legs')) }
          ]} />
          
          {/* Legs - Calves */}
          <View style={[
            styles.bodyLeftCalf,
            { backgroundColor: getStrengthColor(getMuscleGroupStrength('legs')) }
          ]} />
          <View style={[
            styles.bodyRightCalf,
            { backgroundColor: getStrengthColor(getMuscleGroupStrength('legs')) }
          ]} />
          
          {/* Feet */}
          <View style={styles.bodyLeftFoot} />
          <View style={styles.bodyRightFoot} />
        </View>
        
        {/* Legend */}
        <View style={styles.strengthLegend}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#FF4444' }]} />
            <Text style={styles.legendText}>Beginner</Text>
            <View style={[styles.legendDot, { backgroundColor: '#44AA44' }]} />
            <Text style={styles.legendText}>Intermediate</Text>
            <View style={[styles.legendDot, { backgroundColor: '#0088FF' }]} />
            <Text style={styles.legendText}>Advanced</Text>
          </View>
        </View>
      </View>
    );
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
            console.log('View workout:', sessionId);
            // TODO: Navigate to workout details
          }}
          showDebugTools={false} // Disable debug tools in production
          refreshTrigger={refreshTrigger}
          onWorkoutDeleted={handleWorkoutDeleted}
        />
        
        {/* Spacer */}
        <View style={styles.sectionSpacer} />
        
        {/* Progress Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Progress Overview</Text>
            <TouchableOpacity onPress={navigateToProgress}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.progressOverview}
            onPress={navigateToProgress}
            activeOpacity={0.7}
          >
            {renderMuscleMap()}
          </TouchableOpacity>
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
      color: "#007AFF",
      fontWeight: "600",
    },
    progressOverview: {
      backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: isDark ? "#000000" : "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    muscleMap: {
      alignItems: "center",
      paddingVertical: 12,
    },
    humanBody: {
      width: 90,
      height: 180,
      position: "relative",
      marginBottom: 16,
    },
    
    // Head and Neck
    bodyHead: {
      position: "absolute",
      width: 18,
      height: 20,
      borderRadius: 9,
      backgroundColor: "#E5E5EA",
      top: 0,
      left: 36,
    },
    bodyNeck: {
      position: "absolute",
      width: 8,
      height: 8,
      backgroundColor: "#E5E5EA",
      top: 18,
      left: 41,
    },
    
    // Shoulders
    bodyShoulders: {
      position: "absolute",
      width: 48,
      height: 14,
      borderRadius: 7,
      top: 24,
      left: 21,
      opacity: 0.9,
    },
    
    // Arms - Upper arms (biceps/triceps)
    bodyLeftArm: {
      position: "absolute",
      width: 10,
      height: 28,
      borderRadius: 5,
      top: 32,
      left: 14,
    },
    bodyRightArm: {
      position: "absolute",
      width: 10,
      height: 28,
      borderRadius: 5,
      top: 32,
      right: 14,
    },
    
    // Forearms
    bodyLeftForearm: {
      position: "absolute",
      width: 8,
      height: 24,
      borderRadius: 4,
      top: 58,
      left: 15,
      opacity: 0.8,
    },
    bodyRightForearm: {
      position: "absolute",
      width: 8,
      height: 24,
      borderRadius: 4,
      top: 58,
      right: 15,
      opacity: 0.8,
    },
    
    // Torso structure
    bodyTorso: {
      position: "absolute",
      width: 32,
      height: 48,
      backgroundColor: "#F0F0F0",
      borderRadius: 16,
      top: 36,
      left: 29,
    },
    
    // Chest (pectorals)
    bodyChest: {
      position: "absolute",
      width: 28,
      height: 18,
      borderRadius: 12,
      top: 40,
      left: 31,
      opacity: 0.9,
    },
    
    // Core/Abs
    bodyCore: {
      position: "absolute",
      width: 24,
      height: 20,
      borderRadius: 8,
      top: 60,
      left: 33,
      opacity: 0.9,
    },
    
    // Back (subtle indication)
    bodyBack: {
      position: "absolute",
      width: 26,
      height: 16,
      borderRadius: 8,
      top: 42,
      left: 32,
      opacity: 0.6,
    },
    
    // Waist
    bodyWaist: {
      position: "absolute",
      width: 26,
      height: 12,
      backgroundColor: "#F0F0F0",
      borderRadius: 6,
      top: 80,
      left: 32,
    },
    
    // Legs - Thighs (quads/hamstrings)
    bodyLeftThigh: {
      position: "absolute",
      width: 12,
      height: 36,
      borderRadius: 6,
      top: 90,
      left: 28,
    },
    bodyRightThigh: {
      position: "absolute",
      width: 12,
      height: 36,
      borderRadius: 6,
      top: 90,
      right: 28,
    },
    
    // Legs - Calves
    bodyLeftCalf: {
      position: "absolute",
      width: 10,
      height: 32,
      borderRadius: 5,
      top: 124,
      left: 29,
      opacity: 0.8,
    },
    bodyRightCalf: {
      position: "absolute",
      width: 10,
      height: 32,
      borderRadius: 5,
      top: 124,
      right: 29,
      opacity: 0.8,
    },
    
    // Feet
    bodyLeftFoot: {
      position: "absolute",
      width: 8,
      height: 12,
      borderRadius: 4,
      backgroundColor: "#E5E5EA",
      top: 156,
      left: 30,
    },
    bodyRightFoot: {
      position: "absolute",
      width: 8,
      height: 12,
      borderRadius: 4,
      backgroundColor: "#E5E5EA",
      top: 156,
      right: 30,
    },
    strengthLegend: {
      alignItems: "center",
    },
    legendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 11,
      color: isDark ? "#8E8E93" : "#6D6D70",
      fontWeight: "500",
    },
    miniChartStats: {
      alignItems: "center",
    },
    miniChartStatsText: {
      fontSize: 14,
      color: isDark ? "#8E8E93" : "#6D6D70",
      fontWeight: "500",
    },
    miniChartEmpty: {
      alignItems: "center",
      paddingVertical: 24,
    },
    miniChartEmptyText: {
      fontSize: 14,
      color: "#C7C7CC",
      marginTop: 8,
      fontWeight: "500",
    },
  });