// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { useColorScheme, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/auth';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await authService.signOut();
            if (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#84CC16',
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#94A3B8' : '#64748B',
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#334155' : '#FFFFFF',
          borderTopWidth: 0,
          height: 90,
          paddingBottom: 20,
          paddingTop: 10,
        },
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#F1F5F9',
        },
        headerTintColor: colorScheme === 'dark' ? '#F1F5F9' : '#334155',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerTitle: 'WorkoutTracker',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSignOut}
              style={{ marginRight: 16 }}
            >
              <Ionicons 
                name="log-out-outline" 
                size={24} 
                color={colorScheme === 'dark' ? '#F1F5F9' : '#334155'} 
              />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fitness" size={size} color={color} />
          ),
          headerTitle: 'Workout',
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
          headerTitle: 'Progress',
        }}
      />
    </Tabs>
  );
}