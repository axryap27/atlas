// app/(tabs)/_workout/WorkoutStart.tsx
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
import { WorkoutScreen } from "../workout";

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
              <Ionicons name="flash" size={24} color="#68D391" />
              <View style={styles.startOptionText}>
                <Text style={styles.startOptionTitle}>Quick Start</Text>
                <Text style={styles.startOptionDescription}>
                  Start with empty workout, add exercises as you go
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
            </View>
          </TouchableOpacity>

          {/* Workout Templates */}
          <TouchableOpacity
            style={styles.startOption}
            onPress={handleTemplates}
          >
            <View style={styles.startOptionContent}>
              <Ionicons name="library" size={24} color="#68D391" />
              <View style={styles.startOptionText}>
                <Text style={styles.startOptionTitle}>Workout Templates</Text>
                <Text style={styles.startOptionDescription}>
                  Use saved workout routines
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
            </View>
          </TouchableOpacity>

          {/* Recent Workouts (Coming Soon) */}
          <TouchableOpacity style={[styles.startOption, styles.disabledOption]}>
            <View style={styles.startOptionContent}>
              <Ionicons name="time" size={24} color="#8E8E93" />
              <View style={styles.startOptionText}>
                <Text style={[styles.startOptionTitle, styles.disabledText]}>
                  Recent Workouts
                </Text>
                <Text
                  style={[styles.startOptionDescription, styles.disabledText]}
                >
                  Coming soon - repeat previous workouts
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
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
      backgroundColor: "#1E1E1E", // Fixed dark background
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
      color: "#F5F5F5", // Fixed text color
      marginBottom: 8,
    },
    startSubtitle: {
      fontSize: 16,
      color: "#A0AEC0", // Fixed subtitle color
      marginBottom: 32,
    },
    startOption: {
      backgroundColor: "#2D3748", // Fixed background color
      borderRadius: 12,
      marginBottom: 16,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: "#4A5568", // Fixed border color
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
      fontWeight: "600",
      color: "#F5F5F5", // Fixed title color
      marginBottom: 4,
    },
    startOptionDescription: {
      fontSize: 14,
      color: "#A0AEC0", // Fixed description color
    },
    disabledText: {
      color: "#8E8E93",
    },
  });