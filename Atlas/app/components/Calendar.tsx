import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Modal,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { supabaseApi } from '../services/supabase-api';
import { Session } from '../../lib/supabase';

interface CalendarProps {
  onDateSelect?: (date: string) => void;
}

export interface CalendarRef {
  showFullMonth: () => void;
}

interface DayProps {
  day: number | null;
  isToday: boolean;
  isSelected: boolean;
  hasWorkout: boolean;
  onPress: () => void;
  disabled?: boolean;
}

const Day: React.FC<DayProps> = ({ day, isToday, isSelected, hasWorkout, onPress, disabled }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const dayStyles = getDayStyles(isDark);

  if (!day) {
    return <View style={dayStyles.emptyDay} />;
  }

  return (
    <TouchableOpacity
      style={[
        dayStyles.day,
        isToday && dayStyles.today,
        isSelected && dayStyles.selectedDay,
        disabled && dayStyles.disabledDay,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          dayStyles.dayText,
          isToday && dayStyles.todayText,
          isSelected && dayStyles.selectedDayText,
          disabled && dayStyles.disabledDayText,
          { color: isDark ? '#FFFFFF' : '#000000' }
        ]}
      >
        {day}
      </Text>
      {hasWorkout && (
        <View style={[dayStyles.workoutIndicator, { backgroundColor: '#34C759' }]} />
      )}
    </TouchableOpacity>
  );
};

const Calendar = forwardRef<CalendarRef, CalendarProps>(({ onDateSelect }, ref) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [currentDate, setCurrentDate] = useState(new Date()); // Current date
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showFullMonth, setShowFullMonth] = useState(false);
  const [modalTranslateY, setModalTranslateY] = useState(0);
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);
  const [selectedWorkoutDate, setSelectedWorkoutDate] = useState<string | null>(null);
  const [workoutSessions, setWorkoutSessions] = useState<Session[]>([]);
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  
  // Load workout sessions on component mount
  useEffect(() => {
    loadWorkoutSessions();
  }, []);

  const loadWorkoutSessions = async () => {
    try {
      const sessions = await supabaseApi.getUserSessions();
      setWorkoutSessions(sessions);
      
      // Create a set of dates that have workouts
      const dates = new Set<string>();
      sessions.forEach(session => {
        const date = new Date(session.start_time);
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        dates.add(dateString);
      });
      setWorkoutDates(dates);
    } catch (error) {
      console.error('Error loading workout sessions:', error);
      // Fallback to empty data on error
      setWorkoutSessions([]);
      setWorkoutDates(new Set());
    }
  };

  // Get workout details for a specific date
  const getWorkoutDetailsForDate = (dateString: string) => {
    return workoutSessions.filter(session => {
      const sessionDate = new Date(session.start_time);
      const sessionDateString = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`;
      return sessionDateString === dateString;
    }).map(session => ({
      name: session.workout_day?.name || 'Workout Session',
      exercises: session.set_logs?.map(setLog => setLog.exercise?.name).filter((name): name is string => Boolean(name)) || []
    }));
  };

  useImperativeHandle(ref, () => ({
    showFullMonth: () => setShowFullMonth(true)
  }));

  const today = new Date(); // Today's actual date
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDayPress = (day: number) => {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateString);
    setSelectedWorkoutDate(dateString);
    onDateSelect?.(dateString);
  };

  const handleSwipeDown = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      const { translationY } = event.nativeEvent;
      if (translationY > 0) {
        setModalTranslateY(translationY);
      }
    } else if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;
      
      // Close modal if swiped down any amount or with downward velocity
      if (translationY > 50 || velocityY > 200) {
        setShowFullMonth(false);
        setModalTranslateY(0);
      } else {
        // Reset position if not closing
        setModalTranslateY(0);
      }
    }
  };

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const hasWorkout = (day: number) => {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return workoutDates.has(dateString);
  };

  const isSelected = (day: number) => {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return selectedDate === dateString;
  };

  const renderWeekDays = () => {
    const days = [];
    
    // Find the current week containing the currentDate
    const currentDateDay = currentDate.getDate();
    const currentDateWeekday = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Calculate the start of the current week (Sunday)
    const weekStart = currentDateDay - currentDateWeekday;
    
    // Render 7 days for the current week
    for (let i = 0; i < 7; i++) {
      const dayOfMonth = weekStart + i;
      
      // Handle days that might be from previous/next month
      if (dayOfMonth < 1) {
        // Previous month day
        const prevMonth = new Date(currentYear, currentMonth - 1, 0);
        const prevMonthDay = prevMonth.getDate() + dayOfMonth;
        days.push(
          <Day
            key={`prev-${i}`}
            day={prevMonthDay}
            isToday={false}
            isSelected={false}
            hasWorkout={false}
            onPress={() => {}}
            disabled
          />
        );
      } else if (dayOfMonth > daysInMonth) {
        // Next month day
        const nextMonthDay = dayOfMonth - daysInMonth;
        days.push(
          <Day
            key={`next-${i}`}
            day={nextMonthDay}
            isToday={false}
            isSelected={false}
            hasWorkout={false}
            onPress={() => {}}
            disabled
          />
        );
      } else {
        // Current month day
        days.push(
          <Day
            key={dayOfMonth}
            day={dayOfMonth}
            isToday={isToday(dayOfMonth)}
            isSelected={isSelected(dayOfMonth)}
            hasWorkout={hasWorkout(dayOfMonth)}
            onPress={() => handleDayPress(dayOfMonth)}
          />
        );
      }
    }

    return days;
  };

  const renderFullMonthDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayWeekday; i++) {
      days.push(
        <Day
          key={`empty-${i}`}
          day={null}
          isToday={false}
          isSelected={false}
          hasWorkout={false}
          onPress={() => {}}
          disabled
        />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(
        <Day
          key={day}
          day={day}
          isToday={isToday(day)}
          isSelected={isSelected(day)}
          hasWorkout={hasWorkout(day)}
          onPress={() => {
            handleDayPress(day);
            setShowFullMonth(false); // Close modal after selection
          }}
        />
      );
    }

    return days;
  };

  const styles = getStyles(isDark);

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goToPreviousWeek} style={styles.navButton}>
            <Text style={styles.navText}>‹</Text>
          </TouchableOpacity>
          
          <Text style={styles.monthYear}>
            {monthNames[currentMonth]} {currentYear}
          </Text>
          
          <TouchableOpacity onPress={goToNextWeek} style={styles.navButton}>
            <Text style={styles.navText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day names */}
        <View style={styles.dayNamesRow}>
          {dayNames.map((dayName) => (
            <Text key={dayName} style={styles.dayName}>
              {dayName}
            </Text>
          ))}
        </View>

        {/* Calendar grid - Week view */}
        <View style={styles.calendarGrid}>
          {renderWeekDays()}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
            <Text style={styles.legendText}>Workout</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.todayLegend]} />
            <Text style={styles.legendText}>Today</Text>
          </View>
        </View>

        {/* Workouts for Selected Date */}
        {selectedWorkoutDate && getWorkoutDetailsForDate(selectedWorkoutDate).length > 0 && (
          <View style={styles.workoutsSection}>
            <Text style={styles.workoutsSectionTitle}>
              Workouts - {new Date(selectedWorkoutDate).toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'short', 
                day: 'numeric' 
              })}
            </Text>
            <View style={styles.workoutsList}>
              {getWorkoutDetailsForDate(selectedWorkoutDate).map((workout, index) => (
                <View key={index} style={styles.workoutItem}>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                  <View style={styles.exercisesList}>
                    {workout.exercises.map((exercise, exerciseIndex) => (
                      <Text key={exerciseIndex} style={styles.exerciseItem}>
                        • {exercise}
                      </Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Full Month Modal */}
      <Modal
        visible={showFullMonth}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFullMonth(false)}
      >
        <GestureHandlerRootView style={styles.modalOverlay}>
          <PanGestureHandler onGestureEvent={handleSwipeDown}>
            <View style={[styles.modalContent, { transform: [{ translateY: modalTranslateY }] }]}>
              {/* Swipe indicator */}
              <View style={styles.swipeIndicator} />
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCurrentDate(newDate);
                }}
                style={styles.navButton}
              >
                <Text style={styles.navText}>‹</Text>
              </TouchableOpacity>
              
              <Text style={styles.modalTitle}>
                {monthNames[currentMonth]} {currentYear}
              </Text>
              
              <TouchableOpacity 
                onPress={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCurrentDate(newDate);
                }}
                style={styles.navButton}
              >
                <Text style={styles.navText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day names */}
            <View style={styles.dayNamesRow}>
              {dayNames.map((dayName) => (
                <Text key={dayName} style={styles.dayName}>
                  {dayName}
                </Text>
              ))}
            </View>

            {/* Full month grid */}
            <View style={styles.fullMonthGrid}>
              {renderFullMonthDays()}
            </View>

            {/* Close button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowFullMonth(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            </View>
          </PanGestureHandler>
        </GestureHandlerRootView>
      </Modal>

    </>
  );
});

export default Calendar;

const getDayStyles = (isDark: boolean) => StyleSheet.create({
  emptyDay: {
    width: '14.28%',
    aspectRatio: 1,
  },
  day: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginVertical: 2,
  },
  today: {
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  selectedDay: {
    backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
  },
  workoutDay: {
    borderWidth: 1,
    borderColor: '#34C759',
  },
  disabledDay: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  todayText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  disabledDayText: {
    opacity: 0.3,
  },
  workoutIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: isDark ? '#000000' : '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
  },
  navText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#FFFFFF' : '#000000',
  },
  monthYear: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#FFFFFF' : '#000000',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#8E8E93' : '#6D6D70',
    paddingVertical: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  todayLegend: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
  },
  legendText: {
    fontSize: 12,
    color: isDark ? '#8E8E93' : '#6D6D70',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#FFFFFF' : '#000000',
  },
  fullMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: isDark ? '#48484A' : '#C7C7CC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  workoutsSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#2C2C2E' : '#E5E5EA',
  },
  workoutsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDark ? '#FFFFFF' : '#000000',
    marginBottom: 12,
  },
  workoutsList: {
    marginTop: 10,
  },
  workoutItem: {
    backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#FFFFFF' : '#000000',
    marginBottom: 8,
  },
  exercisesList: {
    marginLeft: 8,
  },
  exerciseItem: {
    fontSize: 14,
    color: isDark ? '#8E8E93' : '#6D6D70',
    marginBottom: 4,
  },
  noWorkoutText: {
    fontSize: 16,
    color: isDark ? '#8E8E93' : '#6D6D70',
    textAlign: 'center',
    marginTop: 20,
  },
});