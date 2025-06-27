import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl } from 'react-native';

export default function HomeScreen() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const response = await fetch('https://workout-tracker-production-9537.up.railway.app/api/exercises');
      const data = await response.json();
      setExercises(data);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchExercises();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>💪 Workout Tracker</Text>
        <Text style={styles.loading}>Loading exercises from your API...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>💪 Workout Tracker</Text>
      <Text style={styles.subtitle}>Connected to your live API!</Text>
      
      {exercises.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🏋️ No exercises found</Text>
          <Text style={styles.emptySubtext}>
            Add exercises through your API or Postman!
          </Text>
          <Text style={styles.apiText}>
            API: workout-tracker-production-9537.up.railway.app
          </Text>
        </View>
      ) : (
        <View>
          <Text style={styles.countText}>Found {exercises.length} exercises:</Text>
          {exercises.map((exercise: any) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseDetails}>
                {exercise.category} • {exercise.muscleGroup}
              </Text>
              <Text style={styles.exerciseDescription}>{exercise.description}</Text>
              <Text style={styles.equipment}>Equipment: {exercise.equipment}</Text>
            </View>
          ))}
        </View>
      )}
      
      <Text style={styles.pullText}>Pull down to refresh</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 10,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#27ae60',
    fontWeight: '600',
  },
  loading: {
    textAlign: 'center',
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 50,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 24,
    textAlign: 'center',
    color: '#95a5a6',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    color: '#7f8c8d',
    marginBottom: 20,
  },
  apiText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#95a5a6',
    fontFamily: 'monospace',
  },
  countText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#2c3e50',
  },
  exerciseCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2c3e50',
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#3498db',
    marginBottom: 8,
    fontWeight: '600',
  },
  exerciseDescription: {
    fontSize: 15,
    color: '#34495e',
    marginBottom: 8,
    lineHeight: 20,
  },
  equipment: {
    fontSize: 13,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  pullText: {
    textAlign: 'center',
    color: '#95a5a6',
    fontSize: 12,
    marginTop: 20,
    marginBottom: 40,
  },
});