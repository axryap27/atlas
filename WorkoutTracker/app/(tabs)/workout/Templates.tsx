// app/(tabs)/workout/Templates.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WorkoutScreen, Exercise } from "../workout";

const API_BASE_URL = "https://workout-tracker-production-9537.up.railway.app/api";


interface TemplateExercise {
  id: number;
  exerciseId: number;
  targetSets: number;
  targetReps?: number;
  targetWeight?: number;
  targetTime?: number;
  restTime?: number;
  order: number;
  notes?: string;
  exercise: {
    id: number;
    name: string;
    category: string;
    muscleGroup?: string;
  };
}

interface WorkoutTemplate {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  dayExercises: TemplateExercise[];
}

interface TemplatesProps {
  onNavigate: (screen: WorkoutScreen, exercises?: Exercise[]) => void;
  onBack: () => void;
  needsRefresh?: boolean;
  onRefreshed?: () => void;
}

export default function Templates({ onNavigate, onBack, needsRefresh, onRefreshed }: TemplatesProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = getStyles(isDark);

  useEffect(() => {
    loadTemplates();
  }, []);

  // Refresh templates when needed
  useEffect(() => {
    if (needsRefresh) {
      loadTemplates();
      onRefreshed?.();
    }
  }, [needsRefresh]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/days/templates`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
      Alert.alert("Error", "Failed to load templates. Please try again.");
      // Keep existing templates on error
    } finally {
      setLoading(false);
    }
  };

  const startFromTemplate = (template: WorkoutTemplate) => {
    // Convert template to workout format (using your exact logic)
    const templateExercises: Exercise[] = template.dayExercises.map((dayExercise) => ({
      id: dayExercise.exerciseId.toString(),
      name: dayExercise.exercise.name,
      sets: Array.from({ length: dayExercise.targetSets }, (_, i) => ({
        id: `ex${dayExercise.exerciseId}-set${i + 1}`,
        weight: dayExercise.targetWeight?.toString() || "",
        reps: dayExercise.targetReps?.toString() || "",
        completed: false,
      })),
      completed: false,
      notes: dayExercise.notes || "",
    }));

    onNavigate('active', templateExercises);
  };

  const handleCreateTemplate = () => {
    onNavigate('createTemplate');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#68D391" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.workoutTitle}>Workout Templates</Text>
        <Text style={styles.progressText}>
          {loading ? "Loading templates..." : `${templates.length} saved ${templates.length === 1 ? 'template' : 'templates'}`}
        </Text>
      </View>

      <ScrollView style={styles.templatesScrollView}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#68D391" />
            <Text style={styles.loadingText}>Loading your templates...</Text>
          </View>
        ) : templates.length > 0 ? (
          templates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              onPress={() => startFromTemplate(template)}
            >
              <View style={styles.templateHeader}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateDescription}>
                  {template.description || "No description"}
                </Text>
              </View>
              
              <View style={styles.templateExercises}>
                <Text style={styles.templateExerciseList}>
                  {template.dayExercises.map(dayEx => dayEx.exercise.name).join(' • ')}
                </Text>
              </View>
              
              <View style={styles.templateFooter}>
                <Text style={styles.templateStats}>
                  {template.dayExercises.length} exercises • {template.dayExercises.reduce((acc, ex) => acc + ex.targetSets, 0)} sets
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="library-outline" size={64} color="#A0AEC0" />
            <Text style={styles.emptyStateText}>No templates yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first workout template to get started
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.createTemplateButton}
          onPress={handleCreateTemplate}
        >
          <Ionicons name="add" size={24} color="#68D391" />
          <Text style={styles.createTemplateText}>Create New Template</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E1E",
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
    color: "#68D391",
    marginLeft: 4,
  },
  workoutTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#F5F5F5",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: "#A0AEC0",
  },
  templatesScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: "#A0AEC0",
    marginTop: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F5F5F5",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#A0AEC0",
    textAlign: "center",
    lineHeight: 20,
  },
  templateCard: {
    backgroundColor: "#2D3748",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#4A5568",
  },
  templateHeader: {
    marginBottom: 12,
  },
  templateName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F5F5F5",
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: "#A0AEC0",
  },
  templateExercises: {
    marginBottom: 12,
  },
  templateExerciseList: {
    fontSize: 14,
    color: "#A0AEC0",
    lineHeight: 20,
  },
  templateFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  templateStats: {
    fontSize: 12,
    color: "#A0AEC0",
  },
  createTemplateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2D3748",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#68D391",
    borderStyle: "dashed",
  },
  createTemplateText: {
    fontSize: 16,
    color: "#68D391",
    fontWeight: "600",
    marginLeft: 8,
  },
});