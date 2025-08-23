// app/components/workout/WorkoutStart.tsx
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WorkoutScreen } from "../../(tabs)/workout";

interface WorkoutStartProps {
  onNavigate: (screen: WorkoutScreen, exercises?: any[]) => void;
}

export default function WorkoutStart({ onNavigate }: WorkoutStartProps) {
  const handleQuickStart = () => {
    onNavigate("active", []); // Start with empty exercises
  };

  const handleTemplates = () => {
    onNavigate("templates");
  };

  const handleRecentWorkouts = () => {
    onNavigate("recent");
  };

  const styles = getStyles();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.startScreen}>
          <Text style={styles.startTitle}>Start New Workout</Text>
          <Text style={styles.startSubtitle}>Choose how you want to begin</Text>

          {/* Quick Start */}
          <TouchableOpacity
            style={styles.startOption}
            onPress={handleQuickStart}
          >
            <View style={styles.startOptionContent}>
              <Ionicons name="flash" size={24} color="#84CC16" />
              <View style={styles.startOptionText}>
                <Text style={styles.startOptionTitle}>Quick Start</Text>
                <Text style={styles.startOptionDescription}>
                  Start with empty workout, add exercises as you go
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </View>
          </TouchableOpacity>

          {/* Workout Templates */}
          <TouchableOpacity
            style={styles.startOption}
            onPress={handleTemplates}
          >
            <View style={styles.startOptionContent}>
              <Ionicons name="library" size={24} color="#84CC16" />
              <View style={styles.startOptionText}>
                <Text style={styles.startOptionTitle}>Workout Templates</Text>
                <Text style={styles.startOptionDescription}>
                  Use saved workout routines
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </View>
          </TouchableOpacity>

          {/* Recent Workouts */}
          <TouchableOpacity
            style={styles.startOption}
            onPress={handleRecentWorkouts}
          >
            <View style={styles.startOptionContent}>
              <Ionicons name="time" size={24} color="#84CC16" />
              <View style={styles.startOptionText}>
                <Text style={styles.startOptionTitle}>
                  Recent Workouts
                </Text>
                <Text style={styles.startOptionDescription}>
                  View and repeat previous workouts
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#334155", // Dark slate background
    },
    scrollView: {
      flex: 1,
    },
    startScreen: {
      padding: 20,
    },
    startTitle: {
      fontSize: 32,
      fontFamily: "Outfit_600SemiBold",
      color: "#F1F5F9", // Light text for dark background
      marginBottom: 8,
      letterSpacing: -0.5,
    },
    startSubtitle: {
      fontSize: 16,
      color: "#CBD5E1", // Light slate gray for dark background
      marginBottom: 32,
    },
    startOption: {
      backgroundColor: "#475569", // Medium slate background
      borderRadius: 12,
      marginBottom: 16,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: "#64748B", // Subtle border
    },
    disabledOption: {
      opacity: 0.5,
    },
    startOptionContent: {
      flexDirection: "row",
      alignItems: "center",
      padding: 20,
    },
    startOptionText: {
      flex: 1,
      marginLeft: 16,
    },
    startOptionTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: "#F1F5F9", // Light text for dark background
      marginBottom: 4,
    },
    startOptionDescription: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: "#CBD5E1", // Light slate gray for descriptions
    },
    disabledText: {
      color: "#94A3B8", // Lighter disabled text for dark theme
    },
  });