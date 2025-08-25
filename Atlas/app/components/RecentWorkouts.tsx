// app/components/RecentWorkouts.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { supabaseApi } from '../services/supabase-api';
import { Session, SetLog, Exercise, WorkoutDay } from '../../lib/supabase';

// Type aliases for backwards compatibility
interface WorkoutSession extends Session {
  startTime: string; // alias for start_time
  endTime?: string; // alias for end_time
  setLogs: SetLog[]; // alias for set_logs
}

interface RecentWorkoutsProps {
  onViewWorkout?: (sessionId: number) => void;
  showDebugTools?: boolean; // Add debug prop
  refreshTrigger?: number; // Add prop to trigger refresh from outside
  onWorkoutDeleted?: () => void; // Callback when workout is deleted
  showHeader?: boolean; // Control whether to show the header
}

const apiService = {
  getRecentSessions: async (): Promise<WorkoutSession[]> => {
    try {
      const sessions = await supabaseApi.getUserSessions(undefined, 3); // Get last 3 sessions
      
      // Transform Supabase format to match existing interface
      return sessions.map(session => ({
        ...session,
        startTime: session.start_time,
        endTime: session.end_time || undefined,
        setLogs: session.set_logs || []
      }));
    } catch (error) {
      console.error('Error fetching recent sessions:', error);
      return [];
    }
  },

  deleteSession: async (sessionId: number): Promise<boolean> => {
    try {
      await supabaseApi.deleteSession(sessionId);
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  },

  deleteAllSessions: async (): Promise<boolean> => {
    try {
      await supabaseApi.deleteAllSessions();
      return true;
    } catch (error) {
      console.error('Error deleting all sessions:', error);
      return false;
    }
  },
};

export default function RecentWorkouts({ onViewWorkout, showDebugTools = false, refreshTrigger, onWorkoutDeleted, showHeader = true }: RecentWorkoutsProps) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [templates, setTemplates] = useState<WorkoutDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [animatingOut, setAnimatingOut] = useState<number[]>([]);
  const [swipedSession, setSwipedSession] = useState<number | null>(null);
  const [allWorkoutsHidden, setAllWorkoutsHidden] = useState(false);
  
  // Animation refs for each session
  const animationRefs = useRef<{ [key: number]: Animated.Value }>({});
  // Swipe animation refs for each session
  const swipeAnimationRefs = useRef<{ [key: number]: Animated.Value }>({});

  useEffect(() => {
    loadRecentSessions();
  }, []);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadRecentSessions();
    }
  }, [refreshTrigger]);

  const loadRecentSessions = async () => {
    try {
      setLoading(true);
      
      // Load templates first
      const templatesData = await supabaseApi.getTemplates();
      setTemplates(templatesData);
      
      const recentSessions = await apiService.getRecentSessions();
      
      
      // Initialize animation values for new sessions
      recentSessions.forEach(session => {
        if (!animationRefs.current[session.id]) {
          animationRefs.current[session.id] = new Animated.Value(1);
        }
        if (!swipeAnimationRefs.current[session.id]) {
          swipeAnimationRefs.current[session.id] = new Animated.Value(0);
        }
      });
      
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
      if (setLog.exercise) {
        uniqueExercises.add(setLog.exercise.id);
      }
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
      .map(setLog => setLog.exercise?.muscle_group)
      .filter((group): group is string => Boolean(group)) // Type guard to filter out undefined
      .slice(0, 3);
    
    return [...new Set(muscleGroups)];
  };

  const getWorkoutName = (session: WorkoutSession) => {
    
    // Look up template name manually using workout_day_id
    if (session.workout_day_id) {
      const template = templates.find(t => t.id === session.workout_day_id);
      if (template) {
        return template.name;
      } else {
        return `Template ${session.workout_day_id}`;
      }
    }
    
    // For Quick Workouts, try to categorize based on exercises
    const muscleGroups = getTopMuscleGroups(session);
    const stats = getWorkoutStats(session);
    
    // Simple categorization logic based on muscle groups or volume
    if (muscleGroups.some(group => group?.toLowerCase().includes('back') || group?.toLowerCase().includes('lats'))) {
      return "Pull Workout";
    } else if (muscleGroups.some(group => group?.toLowerCase().includes('chest') || group?.toLowerCase().includes('shoulder'))) {
      return "Push Workout";
    } else if (muscleGroups.some(group => group?.toLowerCase().includes('legs') || group?.toLowerCase().includes('quad'))) {
      return "Leg Workout";
    }
    
    return "Custom Workout";
  };

  const handleDeleteAllSessions = async () => {
    Alert.alert(
      "Delete All Workouts",
      "Are you sure you want to delete all workout sessions? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            setRefreshing(true);
            const success = await apiService.deleteAllSessions();
            if (success) {
              setSessions([]);
              // Notify parent component that workouts were deleted
              onWorkoutDeleted?.();
              Alert.alert("Success", "All workout sessions deleted");
            } else {
              Alert.alert("Error", "Failed to delete all sessions");
            }
            setRefreshing(false);
          }
        }
      ]
    );
  };

  const animateSessionOut = (sessionId: number, onComplete: () => void) => {
    if (!animationRefs.current[sessionId]) {
      animationRefs.current[sessionId] = new Animated.Value(1);
    }
    
    setAnimatingOut(prev => [...prev, sessionId]);
    
    Animated.timing(animationRefs.current[sessionId], {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setAnimatingOut(prev => prev.filter(id => id !== sessionId));
      onComplete();
    });
  };

  const createSwipeGesture = (sessionId: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        
        // More strict horizontal detection to prevent scroll interference
        const isHorizontal = Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) > 15;
        
        if (isHorizontal) {
          // Close any other open swipes
          if (swipedSession && swipedSession !== sessionId) {
            closeSwipe(swipedSession);
          }
          return true;
        }
        return false;
      },
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const { dx, dy } = gestureState;
        
        // Capture the gesture early if it's clearly horizontal
        const isDefinitelyHorizontal = Math.abs(dx) > Math.abs(dy) * 3 && Math.abs(dx) > 20;
        return isDefinitelyHorizontal;
      },
      onPanResponderGrant: () => {
        // Add haptic feedback for iOS
        if (Platform.OS === 'ios') {
          const Haptics = require('expo-haptics');
          Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Light);
        }
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx } = gestureState;
        const maxSwipe = -80; // Reduced from -120 since we only have one button
        
        // Apple Mail style: follow finger exactly, allow both directions but limit left swipe
        let swipeValue;
        if (dx < 0) {
          // Left swipe: limit to maxSwipe
          swipeValue = Math.max(maxSwipe, dx);
        } else {
          // Right swipe: allow some bounce back but limit
          swipeValue = Math.min(20, dx * 0.3);
        }
        
        if (swipeAnimationRefs.current[sessionId]) {
          swipeAnimationRefs.current[sessionId].setValue(swipeValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        
        // Apple Mail style: simple threshold-based logic
        const shouldShowActions = dx < -60 || (dx < -20 && vx < -0.5);
        
        if (shouldShowActions) {
          // Show action buttons
          setSwipedSession(sessionId);
          Animated.spring(swipeAnimationRefs.current[sessionId], {
            toValue: -80, // Reduced from -120 since we only have one button
            useNativeDriver: true,
            speed: 20,
            bounciness: 0,
          }).start();
        } else {
          // Hide action buttons
          setSwipedSession(null);
          Animated.spring(swipeAnimationRefs.current[sessionId], {
            toValue: 0,
            useNativeDriver: true,
            speed: 20,
            bounciness: 0,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // Reset on interruption
        setSwipedSession(null);
        Animated.spring(swipeAnimationRefs.current[sessionId], {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 0,
        }).start();
      },
    });
  };

  const closeSwipe = (sessionId: number) => {
    if (swipeAnimationRefs.current[sessionId]) {
      setSwipedSession(null);
      Animated.spring(swipeAnimationRefs.current[sessionId], {
        toValue: 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }).start();
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    // Close swipe first
    closeSwipe(sessionId);
    
    Alert.alert(
      "Delete Workout",
      "Are you sure you want to delete this workout session? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            animateSessionOut(sessionId, async () => {
              try {
                const success = await apiService.deleteSession(sessionId);
                if (success) {
                  setSessions(prev => prev.filter(s => s.id !== sessionId));
                  delete animationRefs.current[sessionId];
                  delete swipeAnimationRefs.current[sessionId];
                  // Notify parent component that a workout was deleted
                  onWorkoutDeleted?.();
                } else {
                  // If delete failed, restore the session
                  if (animationRefs.current[sessionId]) {
                    animationRefs.current[sessionId].setValue(1);
                  }
                  Alert.alert("Error", "Failed to delete workout. The backend may need to be updated with the latest delete functionality.");
                }
              } catch (error: any) {
                // If delete failed, restore the session
                if (animationRefs.current[sessionId]) {
                  animationRefs.current[sessionId].setValue(1);
                }
                
                Alert.alert("Error", error.message || "Failed to delete workout");
              }
            });
          }
        }
      ]
    );
  };


  const styles = getStyles();

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
      {showHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Recent Workouts</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => setAllWorkoutsHidden(!allWorkoutsHidden)} 
              style={styles.headerButton}
            >
              <Ionicons 
                name={allWorkoutsHidden ? "eye-off" : "eye"} 
                size={20} 
                color="#007AFF" 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRefresh} style={styles.headerButton}>
              <Ionicons name="refresh" size={20} color="#007AFF" />
            </TouchableOpacity>
            {showDebugTools && (
              <TouchableOpacity onPress={handleDeleteAllSessions} style={styles.deleteButton}>
                <Ionicons name="trash" size={20} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {sessions.length === 0 || allWorkoutsHidden ? (
        <View style={styles.emptyState}>
          <Ionicons 
            name={allWorkoutsHidden ? "eye-off-outline" : "barbell-outline"} 
            size={48} 
            color="#C7C7CC" 
          />
          <Text style={styles.emptyStateTitle}>
            {allWorkoutsHidden ? "Workouts Hidden" : "No Workouts Yet"}
          </Text>
          <Text style={styles.emptyStateSubtitle}>
            {allWorkoutsHidden 
              ? "Tap the eye icon to show your recent workouts" 
              : "Start your first workout to see your history here"
            }
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
            const swipeGesture = createSwipeGesture(session.id);
            
            // Initialize animation values if they don't exist
            if (!animationRefs.current[session.id]) {
              animationRefs.current[session.id] = new Animated.Value(1);
            }
            if (!swipeAnimationRefs.current[session.id]) {
              swipeAnimationRefs.current[session.id] = new Animated.Value(0);
            }

            return (
              <Animated.View
                key={session.id}
                style={[
                  styles.animatedCard,
                  {
                    opacity: animationRefs.current[session.id],
                    transform: [
                      {
                        scale: animationRefs.current[session.id].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        })
                      },
                      {
                        translateX: animationRefs.current[session.id].interpolate({
                          inputRange: [0, 1],
                          outputRange: [100, 0],
                        })
                      }
                    ]
                  }
                ]}
              >
                <View style={styles.swipeContainer}>
                  {/* Action buttons behind the card */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.deleteActionButton}
                      onPress={() => handleDeleteSession(session.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Swipeable card */}
                  <Animated.View
                    style={[
                      styles.swipeableCard,
                      {
                        transform: [
                          { translateX: swipeAnimationRefs.current[session.id] }
                        ]
                      }
                    ]}
                    {...swipeGesture.panHandlers}
                  >
                    <TouchableOpacity
                      style={styles.workoutCard}
                      onPress={() => {
                        if (swipedSession === session.id) {
                          closeSwipe(session.id);
                        } else {
                          onViewWorkout?.(session.id);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>
                      {templates.length > 0 ? getWorkoutName(session) : (session.workout_day?.name || "Loading...")}
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
                        {stats.volume.toLocaleString()} lbs
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
                          {group ? group.charAt(0).toUpperCase() + group.slice(1) : 'Unknown'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Completion Status */}
                <View style={styles.statusContainer}>
                  <View style={styles.statusLeft}>
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
                  </View>
                  <View style={styles.statusRight}>
                    <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                  </View>
                </View>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#334155', // Dark slate background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#64748B', // Slate border
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F1F5F9', // Light text for dark background
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#CBD5E1', // Light slate gray for dark background
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
    color: '#CBD5E1', // Light slate gray for dark background
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#CBD5E1', // Light slate gray for dark background
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  animatedCard: {
    marginVertical: 6,
  },
  swipeContainer: {
    position: 'relative',
    height: 'auto',
  },
  actionButtons: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    width: 80, // Reduced from 120 since we only have one button
    zIndex: 1,
  },
  deleteActionButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 12, // Full border radius since it's the only button
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  swipeableCard: {
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  workoutCard: {
    backgroundColor: '#475569', // Medium slate background
    borderRadius: 12,
    padding: 16,
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
    color: '#F1F5F9', // Light text for dark background
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 14,
    color: '#CBD5E1', // Light slate gray for dark background
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155', // Darker slate background
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1', // Light slate gray
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
    color: '#84CC16', // Green accent instead of blue
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#CBD5E1', // Light slate gray
    textAlign: 'center',
  },
  muscleGroupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  muscleGroupTag: {
    backgroundColor: '#334155', // Darker slate background like duration container
    paddingHorizontal: 10,
    height: 28, // Fixed height
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muscleGroupText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#CBD5E1', // Light slate gray text
    textAlign: 'center',
    lineHeight: 28, // Match the container height exactly
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusLeft: {
    flex: 1,
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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