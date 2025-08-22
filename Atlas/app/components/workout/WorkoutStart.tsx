// app/components/workout/WorkoutStart.tsx
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WorkoutScreen } from "../../(tabs)/workout";

interface WorkoutStartProps {
  onNavigate: (screen: WorkoutScreen, exercises?: any[]) => void;
}

export default function WorkoutStart({ onNavigate }: WorkoutStartProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleQuickStart = () => {
    onNavigate("active", []); // Start with empty exercises
  };

  const handleTemplates = () => {
    onNavigate("templates");
  };

  const handleRecentWorkouts = () => {
    onNavigate("recent");
  };

  const styles = getStyles(isDark);

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
              <Ionicons name="flash" size={24} color="#007AFF" />
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
              <Ionicons name="library" size={24} color="#007AFF" />
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
              <Ionicons name="time" size={24} color="#007AFF" />
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

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#F2F2F7", // Light background
    },
    scrollView: {
      flex: 1,
    },
    startScreen: {
      padding: 20,
    },
    startTitle: {
      fontSize: 32,
      fontWeight: "bold",
      color: "#000000", // Dark text
      marginBottom: 8,
    },
    startSubtitle: {
      fontSize: 16,
      color: "#6D6D70", // Light theme subtitle
      marginBottom: 32,
    },
    startOption: {
      backgroundColor: "#FFFFFF", // White cards
      borderRadius: 12,
      marginBottom: 16,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1, // Light shadow
      shadowRadius: 4,
      elevation: 3,
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
      color: "#000000", // Dark text
      marginBottom: 4,
    },
    startOptionDescription: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: "#6D6D70", // Light theme description
    },
    disabledText: {
      color: "#8E8E93",
    },
  });