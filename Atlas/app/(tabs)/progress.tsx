// app/(tabs)/progress.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
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
const chartWidth = screenWidth - 80; // Reduced width to account for container padding and chart margins
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
  const [showVolumeCard, setShowVolumeCard] = useState(false);
  const [volumeCardData, setVolumeCardData] = useState<{
    volume: number;
    workoutName: string;
    date: string;
  } | null>(null);
  const [volumeCardTimer, setVolumeCardTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Refresh data when screen comes into focus (in case workouts were deleted or templates were created)
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        try {
          console.log('Progress screen focused - refreshing data...');
          const templatesData = await supabaseApi.getTemplates();
          setTemplates(templatesData);
          console.log('Templates loaded:', templatesData.length);

          // Remove deleted templates from selectedTemplates, but keep all if none selected
          const currentTemplateIds = templatesData.map(t => t.id);
          setSelectedTemplates(prev => {
            // If no templates were previously selected, select all
            if (prev.length === 0) {
              console.log('No templates selected, auto-selecting all:', currentTemplateIds);
              return currentTemplateIds;
            }
            // Otherwise, filter out deleted templates
            const filtered = prev.filter(id => currentTemplateIds.includes(id));
            console.log('Selected templates after filter:', filtered);
            return filtered;
          });

          // Always refresh volume data to pick up new sessions
          console.log('Loading volume data...');
          loadVolumeData();
        } catch (error) {
          console.error("Error refreshing data:", error);
        }
      };

      refreshData();
    }, [])
  );

  useEffect(() => {
    console.log('selectedTemplates changed:', selectedTemplates);
    if (selectedTemplates.length > 0) {
      console.log('Loading volume data for selected templates');
      loadVolumeData();
    } else {
      console.log('No templates selected, clearing volume data');
      setVolumeData([]);
    }
  }, [selectedTemplates]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (volumeTimer) {
        clearTimeout(volumeTimer);
      }
      if (volumeCardTimer) {
        clearTimeout(volumeCardTimer);
      }
    };
  }, [volumeTimer, volumeCardTimer]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load templates
      const templatesData = await supabaseApi.getTemplates();
      console.log('📊 Progress: Loaded templates:', templatesData.length);
      setTemplates(templatesData);

      // Select all templates by default
      const allTemplateIds = templatesData.map((t) => t.id);
      console.log('📊 Progress: Auto-selecting templates:', allTemplateIds);
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

      console.log('📊 Progress: Total sessions found:', sessions.length);
      console.log('📊 Progress: Selected templates:', selectedTemplates);
      
      // Log each session for debugging
      sessions.forEach(session => {
        console.log(`📊 Session ${session.id}:`, {
          workout_day_id: session.workout_day_id,
          end_time: session.end_time,
          start_time: session.start_time,
          set_logs_count: session.set_logs?.length || 0
        });
      });

      // Filter sessions by selected templates and calculate volume

      const filteredSessions = sessions.filter((session) => {
        const isCompleted = !!session.end_time;
        const hasSetLogs = (session.set_logs?.length || 0) > 0;
        const isTrackable = isCompleted || hasSetLogs;

        console.log(`Session ${session.id}:`, {
          workout_day_id: session.workout_day_id,
          end_time: session.end_time,
          isCompleted,
          hasSetLogs,
          isTrackable,
          start_time: session.start_time,
          setLogsCount: session.set_logs?.length || 0
        });

        if (selectedTemplates.length === 0) {
          return false;
        }

        if (!session.workout_day_id) {
          console.log(`Session ${session.id} filtered out: no workout_day_id`);
          return false;
        }

        const isSelectedTemplate = selectedTemplates.includes(
          session.workout_day_id
        );

        if (!isSelectedTemplate) {
          console.log(`Session ${session.id} filtered out: template not selected`);
        }
        if (!isTrackable) {
          console.log(`Session ${session.id} filtered out: not trackable`);
        }

        return isSelectedTemplate && isTrackable;
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

          console.log(`Session ${session.id} volume calculation:`, {
            setLogsCount: session.set_logs?.length || 0,
            volume,
            templateName: session.workout_day_id
              ? templates.find((t) => t.id === session.workout_day_id)?.name ||
                `Template ${session.workout_day_id}`
              : "Custom Workout"
          });

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
        .filter(data => {
          const hasVolume = data.volume > 0;
          if (!hasVolume) {
            console.log(`Session ${data.sessionId} filtered out: zero volume`);
          }
          return hasVolume;
        })
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      console.log('Final volume data:', volumeData.length, 'sessions');
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
      color = "#EF4444"; // Red for Pull
    } else if (
      templateName.includes("push") ||
      templateName.includes("chest")
    ) {
      color = "#84CC16"; // Toned-down lime green for Push
    } else if (templateName.includes("leg") || templateName.includes("squat")) {
      color = "#3B82F6"; // Blue for Legs
    } else {
      // Fallback to position-based colors for other templates - slate-friendly palette
      const colors = [
        "#F59E0B", // Amber
        "#8B5CF6", // Violet
        "#EC4899", // Pink
        "#06B6D4", // Cyan
        "#EAB308", // Yellow
        "#A855F7", // Purple
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

    // Sort all data by date and get unique dates (moved outside for click handler access)
    const sortedData = volumeData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const allDates = [...new Set(sortedData.map(d => d.date.split('T')[0]))].sort();

    // Intelligently sample data points based on total data density
    const sampleDates = (dates: string[]) => {
      const totalDates = dates.length;
      let sampledDates;
      
      if (totalDates <= 10) {
        // Show all points for small datasets
        sampledDates = dates;
      } else if (totalDates <= 30) {
        // Show every other day for medium datasets (2 weeks to 1 month)
        sampledDates = dates.filter((_: string, index: number) => index % 2 === 0 || index === dates.length - 1);
      } else if (totalDates <= 90) {
        // Show weekly for larger datasets (1-3 months)
        sampledDates = dates.filter((_: string, index: number) => index % 7 === 0 || index === dates.length - 1);
      } else {
        // Show biweekly for very large datasets (3+ months)
        sampledDates = dates.filter((_: string, index: number) => index % 14 === 0 || index === dates.length - 1);
      }
      
      // Always include the first and last dates
      if (sampledDates[0] !== dates[0]) sampledDates.unshift(dates[0]);
      if (sampledDates[sampledDates.length - 1] !== dates[dates.length - 1]) {
        sampledDates.push(dates[dates.length - 1]);
      }
      
      return [...new Set(sampledDates)].sort(); // Remove duplicates and sort
    };

    // Prepare data for LineChart with multiple lines
    const prepareChartData = () => {
      // Group data by template first
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

      const sampledDates = sampleDates(allDates);

      // Create datasets for each template/workout type
      const datasets: any[] = [];
      const datasetMetadata: any[] = []; // Store metadata about each dataset
      const colors = ["#FF3B30", "#007AFF", "#34C759", "#FF9500", "#AF52DE"]; // Red, Blue, Green, Orange, Purple
      let colorIndex = 0;

      groupedData.forEach((templateData, key) => {
        // Sort by date within each template
        templateData.sort((a: VolumeData, b: VolumeData) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let color, name;
        if (typeof key === "number") {
          color = getTemplateColor(key);
          name = templates.find((t) => t.id === key)?.name || `Template ${key}`;
        } else {
          switch (key) {
            case "pull-workouts":
              color = "#EF4444"; // Red for Pull
              name = "Pull Day";
              break;
            case "push-workouts":
              color = "#84CC16"; // Toned-down lime green for Push
              name = "Push Day";
              break;
            case "leg-workouts":
              color = "#3B82F6"; // Blue for Legs
              name = "Leg Day";
              break;
            default:
              color = colors[colorIndex % colors.length];
              name = "Other Workouts";
          }
        }

        // Create data points only for sampled dates - use closest actual workout data
        const dataPoints = sampledDates.map(date => {
          // First try to find exact match
          let workout = templateData.find((w: VolumeData) => w.date.split('T')[0] === date);
          
          // If no exact match, find the closest workout within a reasonable range
          if (!workout) {
            const targetDate = new Date(date);
            const closestWorkout = templateData.reduce((closest: VolumeData | null, current: VolumeData) => {
              const currentDate = new Date(current.date.split('T')[0]);
              const closestDate = closest ? new Date(closest.date.split('T')[0]) : null;
              
              if (!closest) return current;
              
              const currentDiff = Math.abs(targetDate.getTime() - currentDate.getTime());
              const closestDiff = closestDate ? Math.abs(targetDate.getTime() - closestDate.getTime()) : Infinity;
              
              // Only use if within 3 days and closer than current closest
              const maxDiff = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
              
              return currentDiff < closestDiff && currentDiff <= maxDiff ? current : closest;
            }, null);
            
            workout = closestWorkout;
          }
          
          return workout ? workout.volume : null;
        });

        // Only add datasets that have actual data
        if (templateData.length > 0) {
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

          // Store metadata for this dataset
          datasetMetadata.push({
            key: key,
            name: name,
            templateData: templateData,
            sampledDates: sampledDates
          });
        }

        colorIndex++;
      });

      // Create labels for sampled dates, but show fewer labels if we have many data points
      const allLabels = sampledDates.map(date => formatDate(date + 'T00:00:00'));
      
      // Show every other label if we have 6 or more data points to prevent x-axis crowding
      const displayLabels = allLabels.length >= 6 
        ? allLabels.map((label, index) => index % 2 === 0 ? label : '')
        : allLabels;

      return {
        labels: displayLabels,
        datasets: datasets.length > 0 ? datasets : [{
          data: [0],
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          strokeWidth: 3,
        }],
        metadata: datasetMetadata
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
            backgroundColor: "#475569", // Medium slate background
            backgroundGradientFrom: "#475569", 
            backgroundGradientTo: "#475569",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(241, 245, 249, ${opacity})`, // Light text color
            labelColor: (opacity = 1) => `rgba(203, 213, 225, ${opacity})`, // Light slate gray
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "4",
              strokeWidth: "2",
              stroke: "#475569" // Match chart background
            },
            propsForBackgroundLines: {
              strokeDasharray: "",
              stroke: "#64748B", // Darker slate grid lines
              strokeWidth: 1,
              opacity: 0.3
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
          fromZero={true}
          onDataPointClick={(data) => {
            console.log('Chart clicked:', data);
            
            // Get dataset metadata to know which line was clicked
            const datasetIndex = (data as any).datasetIndex || 0;
            const metadata = chartData.metadata?.[datasetIndex];
            
            if (!metadata) {
              console.log('No metadata found for dataset index:', datasetIndex);
              return;
            }
            
            console.log('Clicked dataset metadata:', metadata);
            
            // Get the clicked date from the sampled dates for this specific dataset
            const clickedDateStr = metadata.sampledDates[data.index];
            
            if (!clickedDateStr) {
              console.log('No date found for index:', data.index);
              return;
            }
            
            console.log('Clicked date string:', clickedDateStr);
            
            // Find the specific workout from this dataset's template data
            let matchingWorkout = null;
            
            // First try exact date match
            matchingWorkout = metadata.templateData.find((workout: VolumeData) => {
              return workout.date.split('T')[0] === clickedDateStr;
            });
            
            // If no exact match, find closest workout within 3 days
            if (!matchingWorkout) {
              const targetDate = new Date(clickedDateStr);
              matchingWorkout = metadata.templateData.reduce((closest: VolumeData | null, current: VolumeData) => {
                const currentDate = new Date(current.date.split('T')[0]);
                const closestDate = closest ? new Date(closest.date.split('T')[0]) : null;
                
                if (!closest) return current;
                
                const currentDiff = Math.abs(targetDate.getTime() - currentDate.getTime());
                const closestDiff = closestDate ? Math.abs(targetDate.getTime() - closestDate.getTime()) : Infinity;
                
                // Only use if within 3 days and closer than current closest
                const maxDiff = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
                
                return currentDiff < closestDiff && currentDiff <= maxDiff ? current : closest;
              }, null);
            }
            
            if (matchingWorkout) {
              console.log('Showing volume card for:', matchingWorkout);
              
              // Clear existing timer if any
              if (volumeCardTimer) {
                clearTimeout(volumeCardTimer);
              }
              
              // Set volume card data
              setVolumeCardData({
                volume: matchingWorkout.volume,
                workoutName: matchingWorkout.workoutName,
                date: new Date(matchingWorkout.date).toLocaleDateString('en-US', { 
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric' 
                })
              });
              setShowVolumeCard(true);
              
              // Set timer to hide card after 5 seconds
              const timer = setTimeout(() => {
                setShowVolumeCard(false);
                setVolumeCardData(null);
              }, 5000);
              setVolumeCardTimer(timer);
            } else {
              console.log('No matching workout found for date:', clickedDateStr, 'in dataset:', metadata.name);
            }
          }}
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
                <Ionicons name="refresh" size={20} color="#84CC16" />
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
                    color={isSelected ? "#84CC16" : "#C7C7CC"}
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
              <Ionicons name="arrow-back" size={24} color="#84CC16" />
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

  const styles = getStyles();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#84CC16" />
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
            <Ionicons name="filter" size={16} color="#84CC16" />
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

        {/* Enhanced Stats Summary */}
        {volumeData.length > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Summary Statistics</Text>
            
            {/* Overall Stats */}
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

            {/* Template Breakdown */}
            {selectedTemplates.length > 0 && (
              <View style={styles.templateBreakdownContainer}>
                <Text style={styles.templateBreakdownTitle}>Template Breakdown</Text>
                {selectedTemplates.map((templateId) => {
                  const template = templates.find(t => t.id === templateId);
                  const templateData = volumeData.filter(d => d.workoutDayId === templateId);
                  const templateColor = getTemplateColor(templateId);
                  
                  if (!template || templateData.length === 0) return null;
                  
                  const avgVolume = Math.round(templateData.reduce((sum, d) => sum + d.volume, 0) / templateData.length);
                  const bestVolume = Math.round(Math.max(...templateData.map(d => d.volume)));
                  const totalVolume = Math.round(templateData.reduce((sum, d) => sum + d.volume, 0));
                  const lastWorkout = templateData[templateData.length - 1];
                  const firstWorkout = templateData[0];
                  const progressPercent = templateData.length > 1 
                    ? Math.round(((lastWorkout.volume - firstWorkout.volume) / firstWorkout.volume) * 100)
                    : 0;

                  return (
                    <View key={templateId} style={styles.templateCard}>
                      <View style={styles.templateHeader}>
                        <View style={styles.templateTitleRow}>
                          <View style={[styles.templateColorDot, { backgroundColor: templateColor }]} />
                          <Text style={styles.templateName}>{template.name}</Text>
                          <View style={styles.templateBadge}>
                            <Text style={styles.templateBadgeText}>{templateData.length} sessions</Text>
                          </View>
                        </View>
                        <View style={[styles.progressIndicator, progressPercent >= 0 ? styles.progressPositive : styles.progressNegative]}>
                          <Ionicons 
                            name={progressPercent >= 0 ? "trending-up" : "trending-down"} 
                            size={12} 
                            color={progressPercent >= 0 ? "#34C759" : "#FF3B30"} 
                          />
                          <Text style={[styles.progressText, progressPercent >= 0 ? styles.progressTextPositive : styles.progressTextNegative]}>
                            {progressPercent > 0 ? '+' : ''}{progressPercent}%
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.templateStatsRow}>
                        <View style={styles.templateStat}>
                          <Text style={styles.templateStatValue}>{avgVolume.toLocaleString()}</Text>
                          <Text style={styles.templateStatLabel}>Avg Volume</Text>
                        </View>
                        <View style={styles.templateStat}>
                          <Text style={styles.templateStatValue}>{bestVolume.toLocaleString()}</Text>
                          <Text style={styles.templateStatLabel}>Best Volume</Text>
                        </View>
                      </View>
                      
                      <TouchableOpacity 
                        style={styles.viewDetailsButton}
                        onPress={() => {
                          // Calculate detailed template stats
                          const templateStats: TemplateStats = {
                            templateId: templateId,
                            templateName: template.name,
                            totalSessions: templateData.length,
                            averageVolume: avgVolume,
                            bestVolume: bestVolume,
                            totalVolume: totalVolume,
                            averageDuration: 0, // You can calculate this from session data
                            lastPerformed: lastWorkout.date,
                            volumeProgression: progressPercent,
                            exerciseBreakdown: [] // You can populate this from set logs
                          };
                          setSelectedTemplateStats(templateStats);
                          setShowTemplateStats(true);
                        }}
                      >
                        <Text style={styles.viewDetailsButtonText}>View Details</Text>
                        <Ionicons name="chevron-forward" size={16} color="#84CC16" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Volume Card */}
      {showVolumeCard && volumeCardData && (
        <View style={styles.volumeCardOverlay}>
          <View style={styles.volumeCard}>
            <View style={styles.volumeCardHeader}>
              <Text style={styles.volumeCardWorkoutName}>{volumeCardData.workoutName}</Text>
              <Text style={styles.volumeCardDate}>{volumeCardData.date}</Text>
            </View>
            <View style={styles.volumeCardContent}>
              <Text style={styles.volumeCardVolumeLabel}>Volume</Text>
              <Text style={styles.volumeCardVolumeValue}>{volumeCardData.volume.toLocaleString()} lbs</Text>
            </View>
          </View>
        </View>
      )}

      {renderTemplateSelector()}
      {renderTemplateStatsModal()}
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
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      fontSize: 16,
      color: "#CBD5E1", // Light slate gray
    },
    filterContainer: {
      marginBottom: 20,
    },
    filterButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#475569", // Medium slate background
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
      minHeight: 44, // Ensure minimum tappable area
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
      borderWidth: 1,
      borderColor: "#64748B", // Subtle border
    },
    filterButtonText: {
      fontSize: 16,
      color: "#84CC16", // Toned-down lime green accent
    },
    chartContainer: {
      backgroundColor: "#475569", // Medium slate background
      borderRadius: 20, // More rounded for sleeker look
      padding: 24, // Increased padding
      marginBottom: 24,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 3 }, // Slightly deeper shadow
      shadowOpacity: 0.2, // More prominent shadow for dark theme
      shadowRadius: 12, // Larger shadow radius
      elevation: 6, // Higher elevation for Android
      borderWidth: 1,
      borderColor: "#64748B", // Subtle border
    },
    emptyChart: {
      height: 200,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyChartText: {
      fontSize: 18,
      fontWeight: "600",
      color: "#CBD5E1", // Light slate gray
      marginTop: 12,
    },
    emptyChartSubtext: {
      fontSize: 14,
      color: "#CBD5E1", // Light slate gray
      textAlign: "center",
      marginTop: 4,
    },
    chartTitle: {
      fontSize: 26,
      fontFamily: "Outfit_600SemiBold",
      color: "#F1F5F9", // Light text for dark background
      marginBottom: 20,
      textAlign: "center",
      letterSpacing: -0.6, // Outfit-optimized letter spacing
    },
    legend: {
      backgroundColor: "#475569", // Medium slate background
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: "#64748B", // Subtle border
    },
    legendTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: "#F1F5F9", // Light text for dark background
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
      color: "#CBD5E1", // Light slate gray
    },
    statsContainer: {
      backgroundColor: "#475569", // Medium slate background
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: "#64748B", // Subtle border
    },
    statsTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: "#F1F5F9", // Light text for dark background
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
      color: "#84CC16", // Toned-down lime green accent
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: "#CBD5E1", // Light slate gray
      textAlign: "center",
    },
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
      borderBottomColor: "#64748B", // Darker border for dark theme
    },
    modalTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#F1F5F9", // Light text for dark background
    },
    refreshButton: {
      padding: 4,
    },
    doneButton: {
      fontSize: 16,
      color: "#84CC16", // Lime green accent
      fontWeight: "600",
    },
    selectAllButton: {
      fontSize: 16,
      color: "#84CC16", // Lime green accent
      fontWeight: "600",
    },
    templateItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      backgroundColor: "#475569", // Medium slate background
      borderBottomWidth: 1,
      borderBottomColor: "#64748B", // Darker border
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
      color: "#F1F5F9", // Light text for dark background
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
      color: "#F1F5F9", // Light text for dark background
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: "#475569", // Medium slate background
      borderRadius: 8,
      padding: 12,
      alignItems: "center",
      marginHorizontal: 4,
      marginVertical: 6,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 1,
      borderWidth: 1,
      borderColor: "#64748B", // Subtle border
    },
    statCardValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#84CC16", // Lime green accent
      marginBottom: 4,
    },
    statCardLabel: {
      fontSize: 12,
      color: "#CBD5E1", // Light slate gray
      textAlign: "center",
    },
    exerciseStatsCard: {
      backgroundColor: "#475569", // Medium slate background
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 1,
      borderWidth: 1,
      borderColor: "#64748B", // Subtle border
    },
    exerciseStatsName: {
      fontSize: 16,
      fontWeight: "600",
      color: "#F1F5F9", // Light text for dark background
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
      color: "#84CC16", // Lime green accent
      marginBottom: 2,
    },
    exerciseStatLabel: {
      fontSize: 10,
      color: "#CBD5E1", // Light slate gray
      textAlign: "center",
    },
    // Template Breakdown Styles
    templateBreakdownContainer: {
      marginTop: 20,
    },
    templateBreakdownTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: "#F1F5F9", // Light text for dark background
      marginBottom: 12,
    },
    templateCard: {
      backgroundColor: "#334155", // Darker slate background
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "#64748B", // Subtle border
    },
    templateHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    templateTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    templateBadge: {
      backgroundColor: "#64748B", // Medium slate
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      marginLeft: 8,
    },
    templateBadgeText: {
      fontSize: 10,
      fontWeight: "500",
      color: "#CBD5E1", // Light slate text
    },
    progressIndicator: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    progressPositive: {
      backgroundColor: "rgba(52, 199, 89, 0.1)", // Light green background
    },
    progressNegative: {
      backgroundColor: "rgba(255, 59, 48, 0.1)", // Light red background
    },
    progressText: {
      fontSize: 11,
      fontWeight: "600",
      marginLeft: 2,
    },
    progressTextPositive: {
      color: "#34C759", // Green
    },
    progressTextNegative: {
      color: "#FF3B30", // Red
    },
    templateStatsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 12,
    },
    templateStat: {
      alignItems: "center",
      flex: 1,
    },
    templateStatValue: {
      fontSize: 12,
      fontWeight: "bold",
      color: "#84CC16", // Lime green accent
      marginBottom: 2,
    },
    templateStatLabel: {
      fontSize: 9,
      color: "#CBD5E1", // Light slate gray
      textAlign: "center",
    },
    viewDetailsButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: "rgba(132, 204, 22, 0.1)", // Light lime background
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "#84CC16", // Lime border
    },
    viewDetailsButtonText: {
      fontSize: 11,
      fontWeight: "600",
      color: "#84CC16", // Lime green
      marginRight: 4,
    },
    // Volume Card Styles
    volumeCardOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      pointerEvents: "none", // Allow touches to pass through the overlay
    },
    volumeCard: {
      backgroundColor: "#1E293B", // Very dark slate for contrast
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 20,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 1,
      borderColor: "#84CC16", // Lime green border for accent
      minWidth: 200,
    },
    volumeCardHeader: {
      marginBottom: 8,
    },
    volumeCardWorkoutName: {
      fontSize: 14,
      fontWeight: "600",
      color: "#F1F5F9", // Light text
      textAlign: "center",
      marginBottom: 2,
    },
    volumeCardDate: {
      fontSize: 12,
      color: "#CBD5E1", // Light slate gray
      textAlign: "center",
    },
    volumeCardContent: {
      alignItems: "center",
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: "#475569", // Medium slate
    },
    volumeCardVolumeLabel: {
      fontSize: 11,
      color: "#CBD5E1", // Light slate gray
      textAlign: "center",
      marginBottom: 4,
    },
    volumeCardVolumeValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#84CC16", // Lime green accent
      textAlign: "center",
    },
  });
