// app/components/WorkoutSummary.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = "https://workout-tracker-production-9537.up.railway.app/api";

interface Exercise {
  id: number;
  name: string;
  muscleGroup?: string;
  category: string;
  equipment?: string;
}

interface SetLog {
  id: number;
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  restTime?: number;
  rpe?: number;
  notes?: string;
  exercise: Exercise;
}

interface WorkoutSession {
  id: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  notes?: string;
  location?: string;
  bodyWeight?: number;
  workoutDay?: {
    id: number;
    name: string;
    description?: string;
  };
  setLogs: SetLog[];
}

interface WorkoutSummaryProps {
  sessionId: number;
  onBack: () => void;
}

const apiService = {
  getSession: async (sessionId: number): Promise<WorkoutSession | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
      
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to fetch session');
        return null;
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  },
};

export default function WorkoutSummary({ sessionId, onBack }: WorkoutSummaryProps) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const sessionData = await apiService.getSession(sessionId);
      setSession(sessionData);
    } catch (error) {
      console.error('Failed to load session:', error);
      Alert.alert('Error', 'Failed to load workout details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "N/A";
    
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 
        ? `${hours}h ${remainingMinutes}m` 
        : `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  };

  const getWorkoutStats = (session: WorkoutSession) => {
    const exerciseMap = new Map<number, {
      exercise: Exercise;
      sets: SetLog[];
      totalVolume: number;
    }>();
    let totalVolume = 0;
    let totalSets = session.setLogs.length;

    // Group sets by exercise
    session.setLogs.forEach(setLog => {
      const exerciseId = setLog.exercise.id;
      if (!exerciseMap.has(exerciseId)) {
        exerciseMap.set(exerciseId, {
          exercise: setLog.exercise,
          sets: [],
          totalVolume: 0,
        });
      }
      
      const exerciseData = exerciseMap.get(exerciseId)!;
      exerciseData.sets.push(setLog);
      
      if (setLog.weight && setLog.reps) {
        const volume = setLog.weight * setLog.reps;
        exerciseData.totalVolume += volume;
        totalVolume += volume;
      }
    });

    return {
      exercises: Array.from(exerciseMap.values()),
      totalExercises: exerciseMap.size,
      totalSets,
      totalVolume,
    };
  };

  const styles = getStyles();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading workout details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorTitle}>Workout Not Found</Text>
          <Text style={styles.errorSubtitle}>
            This workout session could not be loaded.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stats = getWorkoutStats(session);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.headerBack}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
            <Text style={styles.headerBackText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Workout Title */}
        <View style={styles.titleSection}>
          <Text style={styles.workoutTitle}>
            {session.workoutDay?.name || "Custom Workout"}
          </Text>
          <Text style={styles.workoutDate}>
            {formatDate(session.startTime)} at {formatTime(session.startTime)}
          </Text>
          {session.workoutDay?.description && (
            <Text style={styles.workoutDescription}>
              {session.workoutDay.description}
            </Text>
          )}
        </View>

        {/* Status Badge */}
        <View style={styles.statusSection}>
          {session.endTime ? (
            <View style={styles.statusCompleted}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.statusCompletedText}>Completed</Text>
            </View>
          ) : (
            <View style={styles.statusIncomplete}>
              <Ionicons name="time-outline" size={20} color="#FF9500" />
              <Text style={styles.statusIncompleteText}>In Progress</Text>
            </View>
          )}
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Workout Summary</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>{stats.totalExercises}</Text>
              <Text style={styles.summaryStatLabel}>
                Exercise{stats.totalExercises !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>{stats.totalSets}</Text>
              <Text style={styles.summaryStatLabel}>
                Set{stats.totalSets !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>
                {stats.totalVolume > 0 ? stats.totalVolume.toLocaleString() : '0'}
              </Text>
              <Text style={styles.summaryStatLabel}>Volume</Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>
                {formatDuration(session.duration)}
              </Text>
              <Text style={styles.summaryStatLabel}>Duration</Text>
            </View>
          </View>
        </View>

        {/* Exercise Details */}
        <View style={styles.exercisesSection}>
          <Text style={styles.exercisesSectionTitle}>Exercises</Text>
          
          {stats.exercises.map((exerciseData, index) => (
            <View key={exerciseData.exercise.id} style={styles.exerciseCard}>
              {/* Exercise Header */}
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>
                    {exerciseData.exercise.name}
                  </Text>
                  <Text style={styles.exerciseMuscle}>
                    {exerciseData.exercise.muscleGroup || 'Unknown'} • {exerciseData.exercise.category}
                  </Text>
                </View>
                <View style={styles.exerciseVolume}>
                  <Text style={styles.exerciseVolumeValue}>
                    {exerciseData.totalVolume.toLocaleString()}
                  </Text>
                  <Text style={styles.exerciseVolumeLabel}>volume</Text>
                </View>
              </View>

              {/* Sets Table */}
              <View style={styles.setsTable}>
                <View style={styles.setsTableHeader}>
                  <Text style={styles.setsTableHeaderText}>Set</Text>
                  <Text style={styles.setsTableHeaderText}>Weight</Text>
                  <Text style={styles.setsTableHeaderText}>Reps</Text>
                  <Text style={styles.setsTableHeaderText}>Volume</Text>
                </View>
                
                {exerciseData.sets.map((set, setIndex) => (
                  <View key={set.id} style={styles.setsTableRow}>
                    <Text style={styles.setsTableCell}>{set.setNumber}</Text>
                    <Text style={styles.setsTableCell}>
                      {set.weight ? `${set.weight} lbs` : '-'}
                    </Text>
                    <Text style={styles.setsTableCell}>
                      {set.reps || '-'}
                    </Text>
                    <Text style={styles.setsTableCell}>
                      {set.weight && set.reps 
                        ? (set.weight * set.reps).toLocaleString()
                        : '-'
                      }
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Additional Info */}
        {(session.notes || session.location || session.bodyWeight) && (
          <View style={styles.additionalInfoCard}>
            <Text style={styles.additionalInfoTitle}>Additional Information</Text>
            
            {session.location && (
              <View style={styles.additionalInfoItem}>
                <Ionicons name="location-outline" size={16} color="#8E8E93" />
                <Text style={styles.additionalInfoText}>
                  Location: {session.location}
                </Text>
              </View>
            )}
            
            {session.bodyWeight && (
              <View style={styles.additionalInfoItem}>
                <Ionicons name="fitness-outline" size={16} color="#8E8E93" />
                <Text style={styles.additionalInfoText}>
                  Body Weight: {session.bodyWeight} lbs
                </Text>
              </View>
            )}
            
            {session.notes && (
              <View style={styles.additionalInfoItem}>
                <Ionicons name="document-text-outline" size={16} color="#8E8E93" />
                <Text style={styles.additionalInfoText}>
                  Notes: {session.notes}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 4,
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  workoutTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  workoutDate: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 8,
  },
  workoutDescription: {
    fontSize: 14,
    color: '#6D6D70',
    fontStyle: 'italic',
  },
  statusSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statusCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  statusCompletedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  statusIncomplete: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  statusIncompleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  exercisesSection: {
    paddingHorizontal: 16,
  },
  exercisesSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  exerciseMuscle: {
    fontSize: 14,
    color: '#8E8E93',
    textTransform: 'capitalize',
  },
  exerciseVolume: {
    alignItems: 'flex-end',
  },
  exerciseVolumeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  exerciseVolumeLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  setsTable: {
    marginTop: 8,
  },
  setsTableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    marginBottom: 8,
  },
  setsTableHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  setsTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  setsTableCell: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
  },
  additionalInfoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  additionalInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  additionalInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  additionalInfoText: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
});