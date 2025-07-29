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
}

export default function ProgressScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [templates, setTemplates] = useState<WorkoutDay[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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
      console.log('🔍 PROGRESS DEBUG: First session:', sessions[0])
      
      // Filter sessions by selected templates and calculate volume
      const volumeData: VolumeData[] = sessions
        .filter(session => 
          session.workout_day_id && 
          selectedTemplates.includes(session.workout_day_id) &&
          session.end_time // Only completed sessions
        )
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

          return {
            date: session.start_time,
            volume,
            workoutName: session.workoutDay?.name || 'Custom Workout',
            sessionId: session.id,
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

  const getMaxVolume = () => {
    return Math.max(...volumeData.map(d => d.volume), 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTemplateColor = (templateId: number) => {
    const colors = ['#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE', '#FF2D92'];
    const index = templates.findIndex(t => t.id === templateId);
    return colors[index % colors.length];
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

    const maxVolume = getMaxVolume();
    const barWidth = Math.max(chartWidth / volumeData.length - 8, 20);

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Volume Progress</Text>
        
        {/* Y-axis labels */}
        <View style={styles.yAxisLabels}>
          <Text style={styles.yAxisLabel}>{Math.round(maxVolume).toLocaleString()}</Text>
          <Text style={styles.yAxisLabel}>{Math.round(maxVolume * 0.5).toLocaleString()}</Text>
          <Text style={styles.yAxisLabel}>0</Text>
        </View>

        {/* Chart area */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScrollView}>
          <View style={styles.chart}>
            {/* Horizontal grid lines */}
            <View style={styles.gridLines}>
              <View style={[styles.gridLine, { top: 0 }]} />
              <View style={[styles.gridLine, { top: chartHeight * 0.5 }]} />
              <View style={[styles.gridLine, { top: chartHeight }]} />
            </View>

            {/* Bars */}
            <View style={styles.barsContainer}>
              {volumeData.map((data, index) => {
                const barHeight = (data.volume / maxVolume) * chartHeight;
                const templateId = templates.find(t => t.name === data.workoutName)?.id;
                const color = templateId ? getTemplateColor(templateId) : '#8E8E93';
                
                return (
                  <View key={index} style={styles.barGroup}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          width: barWidth,
                          backgroundColor: color,
                        },
                      ]}
                    />
                    <Text style={styles.barLabel}>
                      {formatDate(data.date)}
                    </Text>
                    <Text style={styles.barVolume}>
                      {Math.round(data.volume).toLocaleString()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderTemplateSelector = () => (
    <Modal
      visible={showTemplateSelector}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Workouts</Text>
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
            onPress={() => setShowTemplateSelector(true)}
          >
            <Ionicons name="filter" size={16} color="#007AFF" />
            <Text style={styles.filterButtonText}>
              {selectedTemplates.length} workout{selectedTemplates.length !== 1 ? 's' : ''} selected
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
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: chartHeight,
    gap: 8,
  },
  barGroup: {
    alignItems: 'center',
  },
  bar: {
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    color: '#8E8E93',
    transform: [{ rotate: '-45deg' }],
    width: 40,
    textAlign: 'center',
  },
  barVolume: {
    fontSize: 9,
    color: '#8E8E93',
    marginTop: 4,
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#FFFFFF' : '#000000',
  },
  doneButton: {
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
});