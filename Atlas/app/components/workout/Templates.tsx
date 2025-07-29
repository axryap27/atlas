// app/components/workout/Templates.tsx
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
import { WorkoutScreen, Exercise } from "../../(tabs)/workout";

import { supabaseApi } from "../../services/supabase-api";

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
      const data = await supabaseApi.getTemplates();
      
      // Transform Supabase data to match component expectations
      const transformedTemplates = data.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        createdAt: template.created_at,
        dayExercises: template.day_exercises?.map(de => ({
          id: de.id,
          exerciseId: de.exercise_id,
          targetSets: de.target_sets || 0,
          targetReps: de.target_reps,
          targetWeight: de.target_weight,
          targetTime: de.target_time,
          restTime: de.rest_time,
          order: de.exercise_order || 0,
          notes: de.notes,
          exercise: {
            id: de.exercise?.id || 0,
            name: de.exercise?.name || 'Unknown',
            category: de.exercise?.category || 'strength',
            muscleGroup: de.exercise?.muscleGroup || de.exercise?.muscle_group || 'Unknown'
          }
        })) || []
      }));
      
      setTemplates(transformedTemplates);
    } catch (error) {
      console.error("Error loading templates:", error);
      Alert.alert("Error", "Failed to load templates. Please try again.");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const startFromTemplate = (template: WorkoutTemplate) => {
    // Convert template to workout format
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

  const handleDeleteTemplate = async (templateId: number, templateName: string) => {
    Alert.alert(
      "Delete Template",
      `Are you sure you want to delete "${templateName}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await supabaseApi.deleteTemplate(templateId);
              setTemplates(prev => prev.filter(t => t.id !== templateId));
              Alert.alert("Success", "Template deleted successfully");
            } catch (error) {
              console.error('Error deleting template:', error);
              Alert.alert("Error", "Failed to delete template. Please try again.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
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
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading your templates...</Text>
          </View>
        ) : templates.length > 0 ? (
          templates.map((template) => (
            <View key={template.id} style={styles.templateCard}>
              <TouchableOpacity
                style={styles.templateContent}
                onPress={() => startFromTemplate(template)}
                activeOpacity={0.7}
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
                  <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                </View>
              </TouchableOpacity>
              
              <View style={styles.templateActions}>
                <TouchableOpacity 
                  onPress={() => handleDeleteTemplate(template.id, template.name)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="library-outline" size={64} color="#C7C7CC" />
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
          <Ionicons name="add" size={24} color="#007AFF" />
          <Text style={styles.createTemplateText}>Create New Template</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7", // Light background
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
    color: "#007AFF",
    marginLeft: 4,
  },
  workoutTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000", // Dark text
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: "#6D6D70", // Light theme secondary
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
    color: "#8E8E93",
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
    color: "#000000",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
  },
  templateCard: {
    backgroundColor: "#FFFFFF", // White cards
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Light shadow
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  templateContent: {
    flex: 1,
    padding: 16,
  },
  templateActions: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderLeftWidth: 1,
    borderLeftColor: "#F2F2F7",
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FFF2F2",
  },
  templateHeader: {
    marginBottom: 12,
  },
  templateName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000", // Dark text
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: "#6D6D70", // Light theme secondary
  },
  templateExercises: {
    marginBottom: 12,
  },
  templateExerciseList: {
    fontSize: 14,
    color: "#6D6D70", // Light theme secondary
    lineHeight: 20,
  },
  templateFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  templateStats: {
    fontSize: 12,
    color: "#8E8E93", // Light theme tertiary
  },
  createTemplateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  createTemplateText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
    marginLeft: 8,
  },
});