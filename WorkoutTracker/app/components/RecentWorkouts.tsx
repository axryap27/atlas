// app/components/RecentWorkouts.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = "https://workout-tracker-production-9537.up.railway.app/api";

interface Exercise {
  id: number;
  name: string;
  muscleGroup?: string;
}

interface SetLog {
  id: number;
  setNumber: number;
  reps?: number;
  weight?: number;
  exercise: Exercise;
}

interface WorkoutSession {
  id: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  workoutDay?: {
    id: number;
    name: string;
  };
  setLogs: SetLog[];
}

interface RecentWorkoutsProps {
  onViewWorkout?: (sessionId: number) => void;
}

const apiService = {
  getRecentSessions: async (): Promise<WorkoutSession[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`);
      
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } else {
        console.error('Failed to fetch recent sessions');
        return [];
      }
    } catch (error) {
      console.error('Error fetching recent sessions:', error);
      return [];
    }
  },
};

export default function RecentWorkouts({ onViewWorkout }: RecentWorkoutsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRecentSessions();
  }, []);

  const loadRecentSessions = async () => {
    try {
      setLoading(true);
      const recentSessions = await apiService.getRecentSessions();
      setSessions(recentSessions);
    } catch (error) {
      console.error('Failed to load recent sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecentSessions();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "Unknown duration";
    
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  };

  const getWorkoutStats = (session: WorkoutSession) => {
    const uniqueExercises = new Set();
    let totalSets = 0;
    let totalVolume = 0;

    session.setLogs.forEach(setLog => {
      uniqueExercises.add(setLog.exercise.id);
      totalSets++;
      if (setLog.weight && setLog.reps) {
        totalVolume += setLog.weight * setLog.reps;
      }
    });

    return {
      exercises: uniqueExercises.size,
      sets: totalSets,
      volume: totalVolume,
    };
  };

  const getTopMuscleGroups = (session: WorkoutSession) => {
    const muscleGroups = session.setLogs
      .map(setLog => setLog.exercise.muscleGroup)
      .filter((group): group is string => Boolean(group)) // Type guard to filter out undefined
      .slice(0, 3);
    
    return [...new Set(muscleGroups)];
  };

  const styles = getStyles(isDark);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading recent workouts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Workouts</Text>
        {sessions.length > 0 && (
          <TouchableOpacity onPress={handleRefresh}>
            <Ionicons name="refresh" size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={48} color="#C7C7CC" />
          <Text style={styles.emptyStateTitle}>No Workouts Yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Start your first workout to see your history here
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
            />
          }
        >
          {sessions.map((session) => {
            const stats = getWorkoutStats(session);
            const muscleGroups = getTopMuscleGroups(session);

            return (
              <TouchableOpacity
                key={session.id}
                style={styles.workoutCard}
                onPress={() => onViewWorkout?.(session.id)}
                activeOpacity={0.7}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>
                      {session.workoutDay?.name || "Custom Workout"}
                    </Text>
                    <Text style={styles.cardDate}>
                      {formatDate(session.startTime)} • {formatTime(session.startTime)}
                    </Text>
                  </View>
                  <View style={styles.durationContainer}>
                    <Ionicons name="time-outline" size={14} color="#8E8E93" />
                    <Text style={styles.durationText}>
                      {formatDuration(session.duration)}
                    </Text>
                  </View>
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.exercises}</Text>
                    <Text style={styles.statLabel}>
                      Exercise{stats.exercises !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stats.sets}</Text>
                    <Text style={styles.statLabel}>
                      Set{stats.sets !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  {stats.volume > 0 && (
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {stats.volume.toLocaleString()}
                      </Text>
                      <Text style={styles.statLabel}>Volume</Text>
                    </View>
                  )}
                </View>

                {/* Muscle Groups */}
                {muscleGroups.length > 0 && (
                  <View style={styles.muscleGroupsContainer}>
                    {muscleGroups.map((group, index) => (
                      <View key={index} style={styles.muscleGroupTag}>
                        <Text style={styles.muscleGroupText}>
                          {group ? group.charAt(0).toUpperCase() + group.slice(1) : "Unknown"}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Completion Status */}
                <View style={styles.statusContainer}>
                  {session.endTime ? (
                    <View style={styles.statusCompleted}>
                      <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                      <Text style={styles.statusCompletedText}>Completed</Text>
                    </View>
                  ) : (
                    <View style={styles.statusIncomplete}>
                      <Ionicons name="time-outline" size={16} color="#FF9500" />
                      <Text style={styles.statusIncompleteText}>In Progress</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  workoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 14,
    color: '#8E8E93',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  muscleGroupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  muscleGroupTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  muscleGroupText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  statusCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusCompletedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34C759',
  },
  statusIncomplete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIncompleteText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF9500',
  },
});