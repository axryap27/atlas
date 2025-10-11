// app/components/workout/CreateTemplate.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabaseApi } from "../../services/supabase-api";

interface Exercise {
  id: number;
  name: string;
  category: string;
  muscleGroup?: string;
  equipment?: string;
}

interface TemplateExercise {
  exerciseId: number;
  exercise: Exercise;
  targetSets: number;
  targetReps?: number;
  targetWeight?: number;
  targetTime?: number;
  restTime?: number;
  notes?: string;
}

interface CreateTemplateProps {
  onBack: () => void;
  onTemplateCreated: () => void;
}

export default function CreateTemplate({ onBack, onTemplateCreated }: CreateTemplateProps) {

  // Template form state
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>([]);

  // Exercise selection state
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const styles = getStyles();

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      setLoading(true);
      const data = await supabaseApi.getExercises();
      setExercises(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading exercises:", error);
      setExercises([]);
      Alert.alert("Error", "Failed to load exercises");
    } finally {
      setLoading(false);
    }
  };

  const addExercise = (exercise: Exercise) => {
    // Check if exercise is already added
    const isAlreadyAdded = templateExercises.some(
      (te) => te.exerciseId === exercise.id
    );

    if (isAlreadyAdded) {
      Alert.alert("Exercise Already Added", "This exercise is already in your template");
      return;
    }

    const newTemplateExercise: TemplateExercise = {
      exerciseId: exercise.id,
      exercise,
      targetSets: 3,
      targetReps: 10,
    };

    setTemplateExercises([...templateExercises, newTemplateExercise]);
    setShowExerciseModal(false);
    setSearchQuery("");
  };

  const removeExercise = (exerciseId: number) => {
    setTemplateExercises(
      templateExercises.filter((te) => te.exerciseId !== exerciseId)
    );
  };

  const updateExercise = (exerciseId: number, field: string, value: any) => {
    setTemplateExercises(
      templateExercises.map((te) =>
        te.exerciseId === exerciseId ? { ...te, [field]: value } : te
      )
    );
  };

  const incrementReps = (exerciseId: number) => {
    setTemplateExercises(
      templateExercises.map((te) =>
        te.exerciseId === exerciseId 
          ? { ...te, targetReps: Math.max(0, (te.targetReps || 0) + 1) } 
          : te
      )
    );
  };

  const decrementReps = (exerciseId: number) => {
    setTemplateExercises(
      templateExercises.map((te) =>
        te.exerciseId === exerciseId 
          ? { ...te, targetReps: Math.max(0, (te.targetReps || 0) - 1) } 
          : te
      )
    );
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert("Validation Error", "Please enter a template name");
      return;
    }
  
    if (templateExercises.length === 0) {
      Alert.alert("Validation Error", "Please add at least one exercise");
      return;
    }
  
    try {
      setSaving(true);
  
      const templateData = {
        name: templateName.trim(),
        description: templateDescription.trim(),
        is_template: true,
        exercises: templateExercises.map((te, index) => ({
          exercise_id: te.exerciseId,
          target_sets: te.targetSets,
          target_reps: te.targetReps,  
          target_weight: te.targetWeight,
          target_time: te.targetTime,
          exercise_order: index + 1,
          notes: te.notes,
        })),
      };
  
      const result = await supabaseApi.createWorkoutDay(templateData);
  
      Alert.alert("Success", "Template created successfully!", [
        {
          text: "OK",
          onPress: () => {
            onTemplateCreated();
            onBack();
          },
        },
      ]);
    } catch (error) {
      console.error("Error creating template:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert("Error", `Failed to create template: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };


  const filteredExercises = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.muscleGroup?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#84CC16" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={saveTemplate}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Create Template</Text>
        <Text style={styles.subtitle}>Build your workout routine</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Template Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Template Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.textInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="e.g., Push Day, Full Body"
              placeholderTextColor="#8E8E93"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.textInput}
              value={templateDescription}
              onChangeText={setTemplateDescription}
              placeholder="e.g., Chest, shoulders, triceps"
              placeholderTextColor="#8E8E93"
            />
          </View>
        </View>

        {/* Exercises */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <TouchableOpacity
              onPress={() => setShowExerciseModal(true)}
              style={styles.addButton}
            >
              <Ionicons name="add" size={20} color="#84CC16" />
              <Text style={styles.addButtonText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>

          {templateExercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No exercises added yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap "Add Exercise" to get started
              </Text>
            </View>
          ) : (
            templateExercises.map((templateExercise, index) => (
              <View key={templateExercise.exerciseId} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>
                    {templateExercise.exercise.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeExercise(templateExercise.exerciseId)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>

                <View style={styles.exerciseInputRow}>
                  <View style={styles.exerciseInputGroup}>
                    <Text style={styles.exerciseInputLabel}>Sets</Text>
                    <TextInput
                      style={styles.exerciseInput}
                      value={templateExercise.targetSets.toString()}
                      onChangeText={(value) =>
                        updateExercise(
                          templateExercise.exerciseId,
                          "targetSets",
                          parseInt(value) || 1
                        )
                      }
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.exerciseInputGroup}>
                    <Text style={styles.exerciseInputLabel}>Reps</Text>
                    <View style={styles.inputWithButtons}>
                      <TouchableOpacity
                        style={[styles.incrementButton, styles.incrementButtonLeft]}
                        onPress={() => decrementReps(templateExercise.exerciseId)}
                      >
                        <Ionicons name="remove" size={16} color="#84CC16" />
                      </TouchableOpacity>
                      
                      <TextInput
                        style={[styles.exerciseInput, styles.inputWithButtonsField]}
                        value={templateExercise.targetReps?.toString() || ""}
                        onChangeText={(value) =>
                          updateExercise(
                            templateExercise.exerciseId,
                            "targetReps",
                            parseInt(value) || null
                          )
                        }
                        keyboardType="numeric"
                        placeholder="10"
                        placeholderTextColor="#8E8E93"
                      />
                      
                      <TouchableOpacity
                        style={[styles.incrementButton, styles.incrementButtonRight]}
                        onPress={() => incrementReps(templateExercise.exerciseId)}
                      >
                        <Ionicons name="add" size={16} color="#84CC16" />
                      </TouchableOpacity>
                    </View>
                  </View>

                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Exercise Selection Modal */}
      <Modal
        visible={showExerciseModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Exercise</Text>
            <TouchableOpacity
              onPress={() => {
                setShowExerciseModal(false);
                setSearchQuery("");
              }}
            >
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exercises..."
              placeholderTextColor="#8E8E93"
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading exercises...</Text>
            </View>
          ) : (
            <ScrollView style={styles.exerciseList}>
              {filteredExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.exerciseListItem}
                  onPress={() => addExercise(exercise)}
                >
                  <View style={styles.exerciseListItemContent}>
                    <Text style={styles.exerciseListItemName}>
                      {exercise.name}
                    </Text>
                    <Text style={styles.exerciseListItemDetails}>
                      {exercise.category} • {exercise.muscleGroup || "Unknown"}
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#334155", // Dark slate background
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
      color: "#84CC16", // Lime green accent
      marginLeft: 4,
    },
    saveButton: {
      backgroundColor: "#84CC16", // Lime green accent
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#1F2937", // Dark text on lime background
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: "#F1F5F9", // Light text for dark background
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: "#CBD5E1", // Light slate gray
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#F1F5F9", // Light text for dark background
      marginBottom: 16,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: "#F1F5F9", // Light text for dark background
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: "#475569", // Medium slate background
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: "#F1F5F9", // Light text
      borderWidth: 1,
      borderColor: "#64748B", // Darker border
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#475569", // Medium slate background
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#84CC16", // Lime green border
    },
    addButtonText: {
      fontSize: 14,
      color: "#84CC16", // Lime green accent
      fontWeight: "600",
      marginLeft: 4,
    },
    emptyState: {
      alignItems: "center",
      padding: 32,
      backgroundColor: "#475569", // Medium slate background
      borderRadius: 12,
      borderWidth: 2,
      borderColor: "#84CC16", // Lime green border
      borderStyle: "dashed",
    },
    emptyStateText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#F1F5F9", // Light text for dark background
      marginTop: 12,
      marginBottom: 4,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: "#CBD5E1", // Light slate gray
      textAlign: "center",
    },
    exerciseCard: {
      backgroundColor: "#475569", // Medium slate background
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: "#64748B", // Subtle border
    },
    exerciseHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    exerciseName: {
      fontSize: 16,
      fontWeight: "600",
      color: "#F1F5F9", // Light text for dark background
      flex: 1,
    },
    exerciseInputRow: {
      flexDirection: "row",
      gap: 12,
    },
    exerciseInputGroup: {
      flex: 1,
    },
    exerciseInputLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: "#CBD5E1", // Light slate gray
      marginBottom: 4,
    },
    exerciseInput: {
      backgroundColor: "#334155", // Dark slate background
      borderRadius: 6,
      padding: 8,
      fontSize: 14,
      color: "#F1F5F9", // Light text
      textAlign: "center",
      borderWidth: 1,
      borderColor: "#64748B", // Darker border
    },
    inputWithButtons: {
      flexDirection: "row",
      alignItems: "center",
    },
    inputWithButtonsField: {
      flex: 1,
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderRadius: 0,
    },
    incrementButton: {
      width: 32,
      height: 38,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#64748B", // Darker border
      backgroundColor: "#334155", // Dark slate background
    },
    incrementButtonLeft: {
      borderTopLeftRadius: 6,
      borderBottomLeftRadius: 6,
      borderRightWidth: 0,
    },
    incrementButtonRight: {
      borderTopRightRadius: 6,
      borderBottomRightRadius: 6,
      borderLeftWidth: 0,
    },
    // Modal styles
    modalContainer: {
      flex: 1,
      backgroundColor: "#334155", // Dark slate background
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#64748B", // Darker border
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#F1F5F9", // Light text for dark background
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#475569", // Medium slate background
      margin: 16,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#64748B", // Darker border
    },
    searchInput: {
      flex: 1,
      padding: 12,
      fontSize: 16,
      color: "#F1F5F9", // Light text
      marginLeft: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      fontSize: 16,
      color: "#CBD5E1", // Light slate gray
      marginTop: 12,
    },
    exerciseList: {
      flex: 1,
    },
    exerciseListItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#475569", // Medium slate background
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 8,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: "#64748B", // Subtle border
    },
    exerciseListItemContent: {
      flex: 1,
    },
    exerciseListItemName: {
      fontSize: 16,
      fontWeight: "600",
      color: "#F1F5F9", // Light text for dark background
      marginBottom: 4,
    },
    exerciseListItemDetails: {
      fontSize: 14,
      color: "#CBD5E1", // Light slate gray
      textTransform: "capitalize",
    },
  });