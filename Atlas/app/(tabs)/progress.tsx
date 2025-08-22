// app/(tabs)/progress.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  useColorScheme,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { supabaseApi } from "../services/supabase-api";
import { Session, WorkoutDay } from "../../lib/supabase";
import { LineChart } from "react-native-chart-kit";

const { width: screenWidth } = Dimensions.get("window");
const chartWidth = screenWidth - 40;
const chartHeight = 220;

interface VolumeData {
  date: string;
  volume: number;
  workoutName: string;
  sessionId: number;
  workoutDayId: number | null;
}

interface TemplateStats {
  templateId: number;
  templateName: string;
  totalSessions: number;
  averageVolume: number;
  bestVolume: number;
  totalVolume: number;
  averageDuration: number;
  lastPerformed: string;
  volumeProgression: number; // percentage change from first to last
  exerciseBreakdown: Array<{
    exerciseName: string;
    totalSets: number;
    averageWeight: number;
    bestWeight: number;
    totalReps: number;
  }>;
}


export default function ProgressScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [templates, setTemplates] = useState<WorkoutDay[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showTemplateStats, setShowTemplateStats] = useState(false);
  const [selectedTemplateStats, setSelectedTemplateStats] =
    useState<TemplateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDataPoint, setSelectedDataPoint] = useState<{
    sessionId: number;
    templateIndex: number;
    pointIndex: number;
  } | null>(null);
  const [volumeTimer, setVolumeTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Refresh data when screen comes into focus (in case workouts were deleted or templates were created)
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        try {
          const templatesData = await supabaseApi.getTemplates();
          setTemplates(templatesData);

          // Remove deleted templates from selectedTemplates
          const currentTemplateIds = templatesData.map(t => t.id);
          setSelectedTemplates(prev => prev.filter(id => currentTemplateIds.includes(id)));

          // Also refresh volume data if templates are selected
          if (selectedTemplates.length > 0) {
            loadVolumeData();
          }
        } catch (error) {
          console.error("Error refreshing data:", error);
        }
      };

      refreshData();
    }, [selectedTemplates])
  );

  useEffect(() => {
    if (selectedTemplates.length > 0) {
      loadVolumeData();
    }
  }, [selectedTemplates]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (volumeTimer) {
        clearTimeout(volumeTimer);
      }
    };
  }, [volumeTimer]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load templates
      const templatesData = await supabaseApi.getTemplates();
      setTemplates(templatesData);

      // Select all templates by default
      const allTemplateIds = templatesData.map((t) => t.id);
      setSelectedTemplates(allTemplateIds);
    } catch (error) {
      console.error("Error loading progress data:", error);
      Alert.alert("Error", "Failed to load progress data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadVolumeData = async () => {
    try {
      // Get all sessions for selected templates
      const sessions = await supabaseApi.getUserSessions(undefined, 50); // Get last 50 sessions


      // Filter sessions by selected templates and calculate volume

      const filteredSessions = sessions.filter((session) => {
        const isCompleted = !!session.end_time;

        // If no templates are selected, show no data
        if (selectedTemplates.length === 0) {
          return false;
        }

        // If session has no template (Quick Workout), don't show it when filtering by templates
        if (!session.workout_day_id) {
          return false;
        }

        // Only show sessions from selected templates
        const isSelectedTemplate = selectedTemplates.includes(
          session.workout_day_id
        );

        return isSelectedTemplate && isCompleted;
      });

      const volumeData: VolumeData[] = filteredSessions
        .map((session) => {
          // Calculate total volume for this session
          const volume =
            session.set_logs?.reduce((total, setLog) => {
              if (setLog.reps) {
                // For bodyweight exercises (weight = 0), use reps only
                // For weighted exercises, use weight * reps
                const weight = setLog.weight || 0;
                if (weight === 0) {
                  // Bodyweight exercise - count reps only
                  return total + setLog.reps;
                } else {
                  // Weighted exercise - count volume (weight * reps)
                  return total + weight * setLog.reps;
                }
              }
              return total;
            }, 0) || 0;

          // Look up template name manually using workout_day_id
          const templateName = session.workout_day_id
            ? templates.find((t) => t.id === session.workout_day_id)?.name ||
              `Template ${session.workout_day_id}`
            : "Custom Workout";


          return {
            date: session.start_time,
            volume,
            workoutName: templateName,
            sessionId: session.id,
            workoutDayId: session.workout_day_id,
          } as VolumeData;
        })
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      setVolumeData(volumeData);
    } catch (error) {
      console.error("Error loading volume data:", error);
      Alert.alert("Error", "Failed to load volume data. Please try again.");
    }
  };

  const toggleTemplate = (templateId: number) => {
    setSelectedTemplates((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
  };

  const calculateTemplateStats = async (
    templateId: number
  ): Promise<TemplateStats> => {
    try {
      // Get all sessions for this specific template
      const allSessions = await supabaseApi.getUserSessions(undefined, 100);
      const templateSessions = allSessions.filter(
        (session) => session.workout_day_id === templateId && session.end_time
      );

      const template = templates.find((t) => t.id === templateId);
      const templateName = template?.name || "Unknown Template";

      if (templateSessions.length === 0) {
        return {
          templateId,
          templateName,
          totalSessions: 0,
          averageVolume: 0,
          bestVolume: 0,
          totalVolume: 0,
          averageDuration: 0,
          lastPerformed: "",
          volumeProgression: 0,
          exerciseBreakdown: [],
        };
      }

      // Calculate volume for each session
      const sessionVolumes = templateSessions.map((session) => {
        const volume =
          session.set_logs?.reduce((total, setLog) => {
            if (setLog.reps) {
              const weight = setLog.weight || 0;
              return weight === 0
                ? total + setLog.reps
                : total + weight * setLog.reps;
            }
            return total;
          }, 0) || 0;

        const duration =
          session.start_time && session.end_time
            ? (new Date(session.end_time).getTime() -
                new Date(session.start_time).getTime()) /
              (1000 * 60)
            : 0;

        return { volume, duration, session };
      });

      // Calculate statistics
      const volumes = sessionVolumes.map((s) => s.volume);
      const durations = sessionVolumes
        .map((s) => s.duration)
        .filter((d) => d > 0);

      const totalVolume = volumes.reduce((sum, v) => sum + v, 0);
      const averageVolume = totalVolume / volumes.length;
      const bestVolume = Math.max(...volumes);
      const averageDuration =
        durations.length > 0
          ? durations.reduce((sum, d) => sum + d, 0) / durations.length
          : 0;

      // Volume progression (first vs last session)
      const firstVolume = volumes[0];
      const lastVolume = volumes[volumes.length - 1];
      const volumeProgression =
        firstVolume > 0 ? ((lastVolume - firstVolume) / firstVolume) * 100 : 0;

      // Last performed date
      const lastPerformed =
        templateSessions[templateSessions.length - 1].start_time;

      // Exercise breakdown
      const exerciseMap = new Map();
      templateSessions.forEach((session) => {
        session.set_logs?.forEach((setLog) => {
          const exerciseName = setLog.exercise?.name || "Unknown Exercise";
          if (!exerciseMap.has(exerciseName)) {
            exerciseMap.set(exerciseName, {
              exerciseName,
              totalSets: 0,
              weights: [],
              totalReps: 0,
            });
          }

          const exercise = exerciseMap.get(exerciseName);
          exercise.totalSets += 1;
          exercise.totalReps += setLog.reps || 0;
          if (setLog.weight && setLog.weight > 0) {
            exercise.weights.push(setLog.weight);
          }
        });
      });

      const exerciseBreakdown = Array.from(exerciseMap.values()).map(
        (exercise) => ({
          exerciseName: exercise.exerciseName,
          totalSets: exercise.totalSets,
          averageWeight:
            exercise.weights.length > 0
              ? exercise.weights.reduce(
                  (sum: number, w: number) => sum + w,
                  0
                ) / exercise.weights.length
              : 0,
          bestWeight:
            exercise.weights.length > 0 ? Math.max(...exercise.weights) : 0,
          totalReps: exercise.totalReps,
        })
      );

      return {
        templateId,
        templateName,
        totalSessions: templateSessions.length,
        averageVolume,
        bestVolume,
        totalVolume,
        averageDuration,
        lastPerformed,
        volumeProgression,
        exerciseBreakdown,
      };
    } catch (error) {
      console.error("Error calculating template stats:", error);
      throw error;
    }
  };

  const viewTemplateStats = async (templateId: number) => {
    try {
      setLoading(true);
      const stats = await calculateTemplateStats(templateId);
      setSelectedTemplateStats(stats);
      setShowTemplateStats(true);
    } catch (error) {
      Alert.alert("Error", "Failed to load template statistics");
    } finally {
      setLoading(false);
    }
  };

  const getMaxVolume = () => {
    return Math.max(...volumeData.map((d: VolumeData) => d.volume), 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getTemplateColor = (templateId: number) => {
    const template = templates.find((t) => t.id === templateId);
    const templateName = template?.name?.toLowerCase() || "";

    // Assign colors based on template name patterns
    let color;
    if (templateName.includes("pull") || templateName.includes("back")) {
      color = "#FF3B30"; // Red for Pull
    } else if (
      templateName.includes("push") ||
      templateName.includes("chest")
    ) {
      color = "#34C759"; // Green for Push
    } else if (templateName.includes("leg") || templateName.includes("squat")) {
      color = "#007AFF"; // Blue for Legs
    } else {
      // Fallback to position-based colors for other templates
      const colors = [
        "#FF9500",
        "#AF52DE",
        "#FF2D92",
        "#00C7BE",
        "#FFD60A",
        "#BF5AF2",
      ];
      const index = templates.findIndex((t) => t.id === templateId);
      color = colors[index % colors.length];
    }

    return color;
  };

  const renderChart = () => {
    if (volumeData.length === 0) {
      return (
        <View style={[styles.chartContainer, styles.emptyChart]}>
          <Ionicons name="analytics-outline" size={48} color="#C7C7CC" />
          <Text style={styles.emptyChartText}>No workout data available</Text>
          <Text style={styles.emptyChartSubtext}>
            Complete some workouts to see your progress
          </Text>
        </View>
      );
    }

    // Prepare data for LineChart with multiple lines
    const prepareChartData = () => {
      // Sort all data by date
      const sortedData = volumeData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Get unique dates for x-axis
      const uniqueDates = [...new Set(sortedData.map(d => d.date.split('T')[0]))].sort();
      
      // Group data by template
      const groupedData = new Map();
      sortedData.forEach((data) => {
        let key;
        if (data.workoutDayId) {
          key = data.workoutDayId;
        } else {
          // Quick workout categorization
          if (data.workoutName.toLowerCase().includes("pull")) {
            key = "pull-workouts";
          } else if (data.workoutName.toLowerCase().includes("push")) {
            key = "push-workouts";
          } else if (data.workoutName.toLowerCase().includes("leg")) {
            key = "leg-workouts";
          } else {
            key = "other-workouts";
          }
        }

        if (!groupedData.has(key)) {
          groupedData.set(key, []);
        }
        groupedData.get(key).push(data);
      });

      // Create datasets for each template/workout type
      const datasets = [];
      const colors = ["#FF3B30", "#007AFF", "#34C759", "#FF9500", "#AF52DE"]; // Red, Blue, Green, Orange, Purple
      let colorIndex = 0;

      groupedData.forEach((templateData, key) => {
        // Sort by date within each template
        templateData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let color, name;
        if (typeof key === "number") {
          color = getTemplateColor(key);
          name = templates.find((t) => t.id === key)?.name || `Template ${key}`;
        } else {
          switch (key) {
            case "pull-workouts":
              color = "#FF3B30"; // Red for Pull
              name = "Pull Day";
              break;
            case "push-workouts":
              color = "#34C759"; // Green for Push
              name = "Push Day";
              break;
            case "leg-workouts":
              color = "#007AFF"; // Blue for Legs
              name = "Leg Day";
              break;
            default:
              color = colors[colorIndex % colors.length];
              name = "Other Workouts";
          }
        }

        // Map data to chart points, filling missing dates with null
        const dataPoints = uniqueDates.map(date => {
          const workout = templateData.find(w => w.date.split('T')[0] === date);
          return workout ? workout.volume : null;
        }).filter(point => point !== null); // Remove null values

        if (dataPoints.length > 0) {
          datasets.push({
            data: dataPoints,
            color: (opacity = 1) => {
              // Extract RGB from hex color
              const hex = color.replace('#', '');
              const r = parseInt(hex.substr(0, 2), 16);
              const g = parseInt(hex.substr(2, 2), 16);
              const b = parseInt(hex.substr(4, 2), 16);
              return `rgba(${r}, ${g}, ${b}, ${opacity})`;
            },
            strokeWidth: 3,
          });
        }

        colorIndex++;
      });

      // Create labels (show every 3rd date for readability)
      const labels = uniqueDates.filter((_, index) => 
        index === 0 || index === uniqueDates.length - 1 || index % 3 === 0
      ).map(date => formatDate(date + 'T00:00:00'));

      return {
        labels,
        datasets: datasets.length > 0 ? datasets : [{
          data: [0],
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          strokeWidth: 3,
        }]
      };
    };

    const chartData = prepareChartData();

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Volume Progress</Text>
        
        <LineChart
          data={chartData}
          width={chartWidth}
          height={chartHeight}
          chartConfig={{
            backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
            backgroundGradientFrom: isDark ? "#1C1C1E" : "#FFFFFF",
            backgroundGradientTo: isDark ? "#1C1C1E" : "#FFFFFF",
            decimalPlaces: 0,
            color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => isDark ? `rgba(142, 142, 147, ${opacity})` : `rgba(109, 109, 112, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "4",
              strokeWidth: "2",
              stroke: isDark ? "#1C1C1E" : "#FFFFFF"
            },
            propsForBackgroundLines: {
              strokeDasharray: "",
              stroke: isDark ? "#3A3A3C" : "#E5E5EA",
              strokeWidth: 1,
              opacity: 0.4
            }
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
          withHorizontalLabels={true}
          withVerticalLabels={true}
          withDots={true}
          withShadow={false}
          withInnerLines={true}
          withOuterLines={false}
        />
      </View>
    );
  };

  const renderTemplateSelector = () => {
    return (
      <Modal
        visible={showTemplateSelector}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                if (selectedTemplates.length === templates.length) {
                  setSelectedTemplates([]);
                } else {
                  setSelectedTemplates(templates.map((t) => t.id));
                }
              }}
            >
              <Text style={styles.selectAllButton}>
                {selectedTemplates.length === templates.length
                  ? "Deselect All"
                  : "Select All"}
              </Text>
            </TouchableOpacity>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>Select Workouts</Text>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const templatesData = await supabaseApi.getTemplates();
                    setTemplates(templatesData);
                  } catch (error) {
                    console.error("Error refreshing templates:", error);
                  }
                }}
                style={styles.refreshButton}
              >
                <Ionicons name="refresh" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setShowTemplateSelector(false)}>
              <Text style={styles.doneButton}>Done</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={templates}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, index }) => {
              const isSelected = selectedTemplates.includes(item.id);
              const color = getTemplateColor(item.id);

              return (
                <TouchableOpacity
                  style={styles.templateItem}
                  onPress={() => toggleTemplate(item.id)}
                >
                  <View style={styles.templateItemLeft}>
                    <View
                      style={[
                        styles.templateColorDot,
                        { backgroundColor: color },
                      ]}
                    />
                    <Text style={styles.templateName}>{item.name}</Text>
                  </View>
                  <Ionicons
                    name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={isSelected ? "#007AFF" : "#C7C7CC"}
                  />
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    );
  };

  const renderTemplateStatsModal = () => {
    if (!selectedTemplateStats) return null;

    return (
      <Modal
        visible={showTemplateStats}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTemplateStats(false)}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedTemplateStats.templateName}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.statsModalContent}>
            {/* Summary Statistics */}
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>Summary</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>
                    {selectedTemplateStats.totalSessions}
                  </Text>
                  <Text style={styles.statCardLabel}>Sessions</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>
                    {Math.round(
                      selectedTemplateStats.averageVolume
                    ).toLocaleString()}
                  </Text>
                  <Text style={styles.statCardLabel}>Avg Volume</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>
                    {Math.round(
                      selectedTemplateStats.bestVolume
                    ).toLocaleString()}
                  </Text>
                  <Text style={styles.statCardLabel}>Best Volume</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>
                    {Math.round(selectedTemplateStats.averageDuration)}min
                  </Text>
                  <Text style={styles.statCardLabel}>Avg Duration</Text>
                </View>
                <View style={styles.statCard}>
                  <Text
                    style={[
                      styles.statCardValue,
                      {
                        color:
                          selectedTemplateStats.volumeProgression >= 0
                            ? "#34C759"
                            : "#FF3B30",
                      },
                    ]}
                  >
                    {selectedTemplateStats.volumeProgression >= 0 ? "+" : ""}
                    {Math.round(selectedTemplateStats.volumeProgression)}%
                  </Text>
                  <Text style={styles.statCardLabel}>Progress</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>
                    {selectedTemplateStats.lastPerformed
                      ? new Date(
                          selectedTemplateStats.lastPerformed
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A"}
                  </Text>
                  <Text style={styles.statCardLabel}>Last Done</Text>
                </View>
              </View>
            </View>

            {/* Exercise Breakdown */}
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>Exercise Breakdown</Text>
              {selectedTemplateStats.exerciseBreakdown.map(
                (exercise, index) => (
                  <View key={index} style={styles.exerciseStatsCard}>
                    <Text style={styles.exerciseStatsName}>
                      {exercise.exerciseName}
                    </Text>
                    <View style={styles.exerciseStatsRow}>
                      <View style={styles.exerciseStatItem}>
                        <Text style={styles.exerciseStatValue}>
                          {exercise.totalSets}
                        </Text>
                        <Text style={styles.exerciseStatLabel}>Sets</Text>
                      </View>
                      <View style={styles.exerciseStatItem}>
                        <Text style={styles.exerciseStatValue}>
                          {exercise.totalReps}
                        </Text>
                        <Text style={styles.exerciseStatLabel}>Reps</Text>
                      </View>
                      <View style={styles.exerciseStatItem}>
                        <Text style={styles.exerciseStatValue}>
                          {exercise.averageWeight > 0
                            ? `${Math.round(exercise.averageWeight)}lbs`
                            : "-"}
                        </Text>
                        <Text style={styles.exerciseStatLabel}>Avg Weight</Text>
                      </View>
                      <View style={styles.exerciseStatItem}>
                        <Text style={styles.exerciseStatValue}>
                          {exercise.bestWeight > 0
                            ? `${Math.round(exercise.bestWeight)}lbs`
                            : "-"}
                        </Text>
                        <Text style={styles.exerciseStatLabel}>
                          Best Weight
                        </Text>
                      </View>
                    </View>
                  </View>
                )
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const styles = getStyles(isDark);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading progress data...</Text>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Filter Button */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              setShowTemplateSelector(true);
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="filter" size={16} color="#007AFF" />
            <Text style={styles.filterButtonText}>
              {selectedTemplates.length === 0
                ? "Select workouts to view"
                : `${selectedTemplates.length} workout${
                    selectedTemplates.length !== 1 ? "s" : ""
                  } selected`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chart */}
        {renderChart()}

        {/* Legend */}
        {selectedTemplates.length > 0 && (
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>Workouts</Text>
            {templates
              .filter((template) => selectedTemplates.includes(template.id))
              .map((template) => (
                <View key={template.id} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendColorDot,
                      { backgroundColor: getTemplateColor(template.id) },
                    ]}
                  />
                  <Text style={styles.legendText}>{template.name}</Text>
                </View>
              ))}
          </View>
        )}

        {/* Stats Summary */}
        {volumeData.length > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Summary</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{volumeData.length}</Text>
                <Text style={styles.statLabel}>Total Workouts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Math.round(
                    volumeData.reduce((sum, d) => sum + d.volume, 0) /
                      volumeData.length
                  ).toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Avg Volume</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Math.round(
                    Math.max(...volumeData.map((d) => d.volume))
                  ).toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Best Volume</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {renderTemplateSelector()}
      {renderTemplateStatsModal()}
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
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      fontSize: 16,
      color: isDark ? "#FFFFFF" : "#8E8E93",
    },
    filterContainer: {
      marginBottom: 20,
    },
    filterButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
      minHeight: 44, // Ensure minimum tappable area
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    filterButtonText: {
      fontSize: 16,
      color: "#007AFF",
    },
    chartContainer: {
      backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
      borderRadius: 20, // More rounded for sleeker look
      padding: 24, // Increased padding
      marginBottom: 24,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 3 }, // Slightly deeper shadow
      shadowOpacity: isDark ? 0.4 : 0.12, // More prominent shadow
      shadowRadius: 12, // Larger shadow radius
      elevation: 6, // Higher elevation for Android
    },
    emptyChart: {
      height: 200,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyChartText: {
      fontSize: 18,
      fontWeight: "600",
      color: "#8E8E93",
      marginTop: 12,
    },
    emptyChartSubtext: {
      fontSize: 14,
      color: "#8E8E93",
      textAlign: "center",
      marginTop: 4,
    },
    chartTitle: {
      fontSize: 26,
      fontWeight: "700",
      fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
      color: isDark ? "#FFFFFF" : "#000000",
      marginBottom: 20,
      textAlign: "center",
      letterSpacing: -0.8, // Tighter letter spacing for modern look
      textTransform: "uppercase" as const,
    },
    legend: {
      backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    legendTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: isDark ? "#FFFFFF" : "#000000",
      marginBottom: 12,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    legendColorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 12,
    },
    legendText: {
      fontSize: 14,
      color: isDark ? "#FFFFFF" : "#000000",
    },
    statsContainer: {
      backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    statsTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: isDark ? "#FFFFFF" : "#000000",
      marginBottom: 16,
    },
    statsGrid: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    statItem: {
      alignItems: "center",
    },
    statValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#007AFF",
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: "#8E8E93",
      textAlign: "center",
    },
    modalContainer: {
      flex: 1,
      backgroundColor: isDark ? "#000000" : "#F2F2F7",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#E5E5EA",
    },
    modalTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: isDark ? "#FFFFFF" : "#000000",
    },
    refreshButton: {
      padding: 4,
    },
    doneButton: {
      fontSize: 16,
      color: "#007AFF",
      fontWeight: "600",
    },
    selectAllButton: {
      fontSize: 16,
      color: "#007AFF",
      fontWeight: "600",
    },
    templateItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor: "#E5E5EA",
    },
    templateItemLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    templateColorDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginRight: 12,
    },
    templateName: {
      fontSize: 16,
      color: isDark ? "#FFFFFF" : "#000000",
    },
    statsModalContent: {
      flex: 1,
      padding: 16,
    },
    statsSection: {
      marginBottom: 24,
    },
    statsSectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: isDark ? "#FFFFFF" : "#000000",
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
      borderRadius: 8,
      padding: 12,
      alignItems: "center",
      marginHorizontal: 4,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    statCardValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#007AFF",
      marginBottom: 4,
    },
    statCardLabel: {
      fontSize: 12,
      color: "#8E8E93",
      textAlign: "center",
    },
    exerciseStatsCard: {
      backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    exerciseStatsName: {
      fontSize: 16,
      fontWeight: "600",
      color: isDark ? "#FFFFFF" : "#000000",
      marginBottom: 12,
    },
    exerciseStatsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    exerciseStatItem: {
      alignItems: "center",
      flex: 1,
    },
    exerciseStatValue: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#007AFF",
      marginBottom: 2,
    },
    exerciseStatLabel: {
      fontSize: 10,
      color: "#8E8E93",
      textAlign: "center",
    },
  });
