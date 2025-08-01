// app/(tabs)/progress.tsx
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabaseApi } from '../services/supabase-api';
import { Session, WorkoutDay } from '../../lib/supabase';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;
const chartHeight = 200;

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
  const isDark = colorScheme === 'dark';
  
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [templates, setTemplates] = useState<WorkoutDay[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showTemplateStats, setShowTemplateStats] = useState(false);
  const [selectedTemplateStats, setSelectedTemplateStats] = useState<TemplateStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Refresh templates when screen comes into focus (in case new templates were created)
  useFocusEffect(
    React.useCallback(() => {
      const refreshTemplates = async () => {
        try {
          const templatesData = await supabaseApi.getTemplates();
          setTemplates(templatesData);
          console.log('🔄 Refreshed templates on focus:', templatesData.length);
        } catch (error) {
          console.error('Error refreshing templates:', error);
        }
      };
      
      refreshTemplates();
    }, [])
  );

  useEffect(() => {
    if (selectedTemplates.length > 0) {
      loadVolumeData();
    }
  }, [selectedTemplates]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load templates
      const templatesData = await supabaseApi.getTemplates();
      console.log('📋 Templates loaded:', templatesData.map(t => `${t.id}: ${t.name}`));
      setTemplates(templatesData);
      
      // Select all templates by default
      const allTemplateIds = templatesData.map(t => t.id);
      setSelectedTemplates(allTemplateIds);
      
    } catch (error) {
      console.error('Error loading progress data:', error);
      Alert.alert('Error', 'Failed to load progress data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadVolumeData = async () => {
    try {
      // Get all sessions for selected templates
      const sessions = await supabaseApi.getUserSessions(undefined, 50); // Get last 50 sessions
      
      console.log('🔍 PROGRESS DEBUG: Raw sessions:', sessions.length)
      console.log('🔍 PROGRESS DEBUG: Selected templates:', selectedTemplates)
      if (sessions.length > 0) {
        console.log('🔍 PROGRESS DEBUG: First session:', sessions[0])
        console.log('🔍 PROGRESS DEBUG: All sessions:', sessions)
      } else {
        console.log('🔍 PROGRESS DEBUG: No sessions found - should show empty state')
      }
      
      // Filter sessions by selected templates and calculate volume
      console.log('🔍 PROGRESS DEBUG: Filtering sessions...')
      console.log('🔍 PROGRESS DEBUG: Sessions with workout_day_id:', sessions.filter(s => s.workout_day_id).length)
      console.log('🔍 PROGRESS DEBUG: Sessions with end_time:', sessions.filter(s => s.end_time).length)
      
      const volumeData: VolumeData[] = sessions
        .filter(session => {
          const isCompleted = !!session.end_time;
          
          // If no templates are selected or session has no template, show all completed workouts
          if (selectedTemplates.length === 0 || !session.workout_day_id) {
            console.log(`🔍 Session ${session.id}: Quick workout, isCompleted=${isCompleted}`);
            return isCompleted;
          }
          
          // If templates are selected, only show matching template workouts
          const isSelectedTemplate = selectedTemplates.includes(session.workout_day_id);
          console.log(`🔍 Session ${session.id}: Template workout, isSelectedTemplate=${isSelectedTemplate}, isCompleted=${isCompleted}`);
          
          return isSelectedTemplate && isCompleted;
        })
        .map(session => {
          // Calculate total volume for this session
          const volume = session.set_logs?.reduce((total, setLog) => {
            if (setLog.reps) {
              // For bodyweight exercises (weight = 0), use reps only
              // For weighted exercises, use weight * reps
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

          // Look up template name manually using workout_day_id
          const templateName = session.workout_day_id ? 
            templates.find(t => t.id === session.workout_day_id)?.name || `Template ${session.workout_day_id}` :
            'Custom Workout';
          
          console.log(`📊 Session ${session.id}: workout_day_id=${session.workout_day_id}, workoutDay.name=${session.workoutDay?.name}, resolved name=${templateName}`);

          return {
            date: session.start_time,
            volume,
            workoutName: templateName,
            sessionId: session.id,
            workoutDayId: session.workout_day_id,
          };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      console.log('🔍 PROGRESS DEBUG: Final volume data:', volumeData)
      setVolumeData(volumeData);
    } catch (error) {
      console.error('Error loading volume data:', error);
      Alert.alert('Error', 'Failed to load volume data. Please try again.');
    }
  };

  const toggleTemplate = (templateId: number) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const calculateTemplateStats = async (templateId: number): Promise<TemplateStats> => {
    try {
      // Get all sessions for this specific template
      const allSessions = await supabaseApi.getUserSessions(undefined, 100);
      const templateSessions = allSessions.filter(session => 
        session.workout_day_id === templateId && session.end_time
      );

      const template = templates.find(t => t.id === templateId);
      const templateName = template?.name || 'Unknown Template';

      if (templateSessions.length === 0) {
        return {
          templateId,
          templateName,
          totalSessions: 0,
          averageVolume: 0,
          bestVolume: 0,
          totalVolume: 0,
          averageDuration: 0,
          lastPerformed: '',
          volumeProgression: 0,
          exerciseBreakdown: [],
        };
      }

      // Calculate volume for each session
      const sessionVolumes = templateSessions.map(session => {
        const volume = session.set_logs?.reduce((total, setLog) => {
          if (setLog.reps) {
            const weight = setLog.weight || 0;
            return weight === 0 ? total + setLog.reps : total + (weight * setLog.reps);
          }
          return total;
        }, 0) || 0;

        const duration = session.start_time && session.end_time ? 
          (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / (1000 * 60) : 0;

        return { volume, duration, session };
      });

      // Calculate statistics
      const volumes = sessionVolumes.map(s => s.volume);
      const durations = sessionVolumes.map(s => s.duration).filter(d => d > 0);
      
      const totalVolume = volumes.reduce((sum, v) => sum + v, 0);
      const averageVolume = totalVolume / volumes.length;
      const bestVolume = Math.max(...volumes);
      const averageDuration = durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
      
      // Volume progression (first vs last session)
      const firstVolume = volumes[0];
      const lastVolume = volumes[volumes.length - 1];
      const volumeProgression = firstVolume > 0 ? ((lastVolume - firstVolume) / firstVolume) * 100 : 0;

      // Last performed date
      const lastPerformed = templateSessions[templateSessions.length - 1].start_time;

      // Exercise breakdown
      const exerciseMap = new Map();
      templateSessions.forEach(session => {
        session.set_logs?.forEach(setLog => {
          const exerciseName = setLog.exercise?.name || 'Unknown Exercise';
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

      const exerciseBreakdown = Array.from(exerciseMap.values()).map(exercise => ({
        exerciseName: exercise.exerciseName,
        totalSets: exercise.totalSets,
        averageWeight: exercise.weights.length > 0 ? 
          exercise.weights.reduce((sum, w) => sum + w, 0) / exercise.weights.length : 0,
        bestWeight: exercise.weights.length > 0 ? Math.max(...exercise.weights) : 0,
        totalReps: exercise.totalReps,
      }));

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
      console.error('Error calculating template stats:', error);
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
      Alert.alert('Error', 'Failed to load template statistics');
    } finally {
      setLoading(false);
    }
  };

  const getMaxVolume = () => {
    return Math.max(...volumeData.map(d => d.volume), 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTemplateColor = (templateId: number) => {
    const template = templates.find(t => t.id === templateId);
    const templateName = template?.name?.toLowerCase() || '';
    
    // Assign colors based on template name patterns
    let color;
    if (templateName.includes('pull') || templateName.includes('back')) {
      color = '#FF3B30'; // Red for Pull
    } else if (templateName.includes('push') || templateName.includes('chest')) {
      color = '#34C759'; // Green for Push  
    } else if (templateName.includes('leg') || templateName.includes('squat')) {
      color = '#007AFF'; // Blue for Legs
    } else {
      // Fallback to position-based colors for other templates
      const colors = ['#FF9500', '#AF52DE', '#FF2D92', '#00C7BE', '#FFD60A', '#BF5AF2'];
      const index = templates.findIndex(t => t.id === templateId);
      color = colors[index % colors.length];
    }
    
    console.log(`🎨 Color for template ${templateId} (${template?.name}): ${color}`);
    return color;
  };

  const renderChart = () => {
    console.log('🔍 RENDER CHART: volumeData.length =', volumeData.length);
    console.log('🔍 RENDER CHART: volumeData =', volumeData);
    
    if (volumeData.length === 0) {
      return (
        <View style={[styles.chartContainer, styles.emptyChart]}>
          <Ionicons name="analytics-outline" size={48} color="#C7C7CC" />
          <Text style={styles.emptyChartText}>No workout data available</Text>
          <Text style={styles.emptyChartSubtext}>
            Complete some workouts to see your progress
          </Text>
          <Text style={[styles.emptyChartSubtext, { marginTop: 8, fontSize: 12 }]}>
            Debug: {selectedTemplates.length} templates selected
          </Text>
        </View>
      );
    }

    const maxVolume = getMaxVolume();
    const minVolume = Math.min(...volumeData.map(d => d.volume), 0);

    // Create points for the line chart
    const createLinePoints = () => {
      return volumeData.map((data, index) => {
        const x = (index / (volumeData.length - 1)) * (chartWidth - 40);
        const normalizedValue = maxVolume > minVolume ? (data.volume - minVolume) / (maxVolume - minVolume) : 0.5;
        const y = chartHeight - (normalizedValue * (chartHeight - 20));
        // Use workoutDayId directly for color assignment
        const color = data.workoutDayId ? 
          getTemplateColor(data.workoutDayId) : 
          '#007AFF'; // All Quick Workouts use blue
        
        console.log(`Point ${index}: workout=${data.workoutName}, workoutDayId=${data.workoutDayId}, color=${color}`);
        
        return { 
          x: x + 20, 
          y: y + 10, 
          volume: data.volume, 
          date: data.date,
          workoutName: data.workoutName,
          color 
        };
      });
    };

    const points = createLinePoints();

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Volume Progress</Text>
        
        {/* Y-axis labels */}
        <View style={styles.yAxisLabels}>
          <Text style={styles.yAxisLabel}>{Math.round(maxVolume).toLocaleString()}</Text>
          <Text style={styles.yAxisLabel}>{Math.round((maxVolume + minVolume) * 0.5).toLocaleString()}</Text>
          <Text style={styles.yAxisLabel}>{Math.round(minVolume).toLocaleString()}</Text>
        </View>

        {/* Chart area */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScrollView}>
          <View style={[styles.chart, { width: Math.max(chartWidth, points.length * 60) }]}>
            {/* Horizontal grid lines */}
            <View style={styles.gridLines}>
              <View style={[styles.gridLine, { top: 10 }]} />
              <View style={[styles.gridLine, { top: chartHeight * 0.5 + 10 }]} />
              <View style={[styles.gridLine, { top: chartHeight + 10 }]} />
            </View>

            {/* Line chart */}
            <View style={styles.lineContainer}>
              {/* Connecting lines */}
              {points.map((point, index) => {
                if (index >= points.length - 1) return null;
                
                const nextPoint = points[index + 1];
                const distance = Math.sqrt(
                  Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.y - point.y, 2)
                );
                const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * (180 / Math.PI);
                
                console.log(`Line ${index}: from ${point.workoutName} (${point.color}) to ${nextPoint.workoutName} (${nextPoint.color})`);
                
                return (
                  <View
                    key={`line-${index}`}
                    style={[
                      {
                        position: 'absolute',
                        left: point.x,
                        top: point.y,
                        width: distance,
                        height: 3,
                        backgroundColor: point.color,
                        borderRadius: 1.5,
                        transform: [{ rotate: `${angle}deg` }],
                        transformOrigin: 'left center',
                      },
                    ]}
                  />
                );
              })}
              
              {/* Data points */}
              {points.map((point, index) => (
                <View key={`point-${index}`}>
                  <View
                    style={[
                      styles.dataPoint,
                      {
                        position: 'absolute',
                        left: point.x - 5,
                        top: point.y - 5,
                        backgroundColor: point.color,
                        borderColor: '#FFFFFF',
                      },
                    ]}
                  />
                  {/* Date labels */}
                  <Text
                    style={[
                      styles.dateLabel,
                      {
                        position: 'absolute',
                        left: point.x - 20,
                        top: chartHeight + 25,
                      },
                    ]}
                  >
                    {formatDate(point.date)}
                  </Text>
                  {/* Volume labels */}
                  <Text
                    style={[
                      styles.volumeLabel,
                      {
                        position: 'absolute',
                        left: point.x - 15,
                        top: point.y - 25,
                        color: point.color,
                      },
                    ]}
                  >
                    {Math.round(point.volume).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderTemplateSelector = () => {
    console.log('Rendering template selector, visible:', showTemplateSelector, 'templates:', templates.length);
    return (
      <Modal
        visible={showTemplateSelector}
        animationType="slide"
        presentationStyle="pageSheet"
      >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => {
            if (selectedTemplates.length === templates.length) {
              setSelectedTemplates([]);
            } else {
              setSelectedTemplates(templates.map(t => t.id));
            }
          }}>
            <Text style={styles.selectAllButton}>
              {selectedTemplates.length === templates.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTitle}>Select Workouts</Text>
            <TouchableOpacity 
              onPress={async () => {
                try {
                  const templatesData = await supabaseApi.getTemplates();
                  setTemplates(templatesData);
                  console.log('🔄 Manual refresh - templates loaded:', templatesData.length);
                } catch (error) {
                  console.error('Error refreshing templates:', error);
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
                    style={[styles.templateColorDot, { backgroundColor: color }]} 
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
            <Text style={styles.modalTitle}>{selectedTemplateStats.templateName}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.statsModalContent}>
            {/* Summary Statistics */}
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>Summary</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>{selectedTemplateStats.totalSessions}</Text>
                  <Text style={styles.statCardLabel}>Sessions</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>
                    {Math.round(selectedTemplateStats.averageVolume).toLocaleString()}
                  </Text>
                  <Text style={styles.statCardLabel}>Avg Volume</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>
                    {Math.round(selectedTemplateStats.bestVolume).toLocaleString()}
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
                  <Text style={[
                    styles.statCardValue,
                    { color: selectedTemplateStats.volumeProgression >= 0 ? '#34C759' : '#FF3B30' }
                  ]}>
                    {selectedTemplateStats.volumeProgression >= 0 ? '+' : ''}{Math.round(selectedTemplateStats.volumeProgression)}%
                  </Text>
                  <Text style={styles.statCardLabel}>Progress</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>
                    {selectedTemplateStats.lastPerformed ? 
                      new Date(selectedTemplateStats.lastPerformed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
                      : 'N/A'
                    }
                  </Text>
                  <Text style={styles.statCardLabel}>Last Done</Text>
                </View>
              </View>
            </View>

            {/* Exercise Breakdown */}
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>Exercise Breakdown</Text>
              {selectedTemplateStats.exerciseBreakdown.map((exercise, index) => (
                <View key={index} style={styles.exerciseStatsCard}>
                  <Text style={styles.exerciseStatsName}>{exercise.exerciseName}</Text>
                  <View style={styles.exerciseStatsRow}>
                    <View style={styles.exerciseStatItem}>
                      <Text style={styles.exerciseStatValue}>{exercise.totalSets}</Text>
                      <Text style={styles.exerciseStatLabel}>Sets</Text>
                    </View>
                    <View style={styles.exerciseStatItem}>
                      <Text style={styles.exerciseStatValue}>{exercise.totalReps}</Text>
                      <Text style={styles.exerciseStatLabel}>Reps</Text>
                    </View>
                    <View style={styles.exerciseStatItem}>
                      <Text style={styles.exerciseStatValue}>
                        {exercise.averageWeight > 0 ? `${Math.round(exercise.averageWeight)}lbs` : '-'}
                      </Text>
                      <Text style={styles.exerciseStatLabel}>Avg Weight</Text>
                    </View>
                    <View style={styles.exerciseStatItem}>
                      <Text style={styles.exerciseStatValue}>
                        {exercise.bestWeight > 0 ? `${Math.round(exercise.bestWeight)}lbs` : '-'}
                      </Text>
                      <Text style={styles.exerciseStatLabel}>Best Weight</Text>
                    </View>
                  </View>
                </View>
              ))}
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

  console.log('Rendering progress screen:', {
    templatesLength: templates.length,
    selectedTemplatesLength: selectedTemplates.length,
    showTemplateSelector,
    volumeDataLength: volumeData.length
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Filter Button */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              console.log('Filter button pressed, templates count:', templates.length);
              setShowTemplateSelector(true);
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="filter" size={16} color="#007AFF" />
            <Text style={styles.filterButtonText}>
              {selectedTemplates.length === 0 ? 'Select workouts to view' : 
               `${selectedTemplates.length} workout${selectedTemplates.length !== 1 ? 's' : ''} selected`}
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
              .filter(template => selectedTemplates.includes(template.id))
              .map((template) => (
                <View key={template.id} style={styles.legendItem}>
                  <View 
                    style={[
                      styles.legendColorDot, 
                      { backgroundColor: getTemplateColor(template.id) }
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
                <Text style={styles.statValue}>
                  {volumeData.length}
                </Text>
                <Text style={styles.statLabel}>Total Workouts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Math.round(volumeData.reduce((sum, d) => sum + d.volume, 0) / volumeData.length).toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Avg Volume</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Math.round(Math.max(...volumeData.map(d => d.volume))).toLocaleString()}
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

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#000000' : '#F2F2F7',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: isDark ? '#FFFFFF' : '#8E8E93',
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    minHeight: 44, // Ensure minimum tappable area
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  chartContainer: {
    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 12,
  },
  emptyChartSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#FFFFFF' : '#000000',
    marginBottom: 16,
  },
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: 40,
    height: chartHeight,
    justifyContent: 'space-between',
    width: 50,
  },
  yAxisLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
  },
  chartScrollView: {
    marginLeft: 60,
  },
  chart: {
    height: chartHeight + 60,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: chartHeight,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  lineContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  lineSegment: {
    height: 3,
    transformOrigin: 'left center',
    borderRadius: 1.5,
    backgroundColor: 'transparent', // Allow inline backgroundColor to override
  },
  dataPoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  dateLabel: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
    width: 40,
    transform: [{ rotate: '-45deg' }],
  },
  volumeLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    width: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    paddingVertical: 2,
  },
  legend: {
    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : '#000000',
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: isDark ? '#FFFFFF' : '#000000',
  },
  statsContainer: {
    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : '#000000',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: isDark ? '#000000' : '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#FFFFFF' : '#000000',
  },
  refreshButton: {
    padding: 4,
  },
  doneButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  selectAllButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  templateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  templateItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  templateName: {
    fontSize: 16,
    color: isDark ? '#FFFFFF' : '#000000',
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
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : '#000000',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  exerciseStatsCard: {
    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  exerciseStatsName: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : '#000000',
    marginBottom: 12,
  },
  exerciseStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  exerciseStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  exerciseStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  exerciseStatLabel: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
  },
});