// app/(tabs)/_layout.tsx
import { Tabs, router } from 'expo-router';
import { TouchableOpacity, Alert, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/auth';

export default function TabLayout() {

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
        tabBarActiveTintColor: '#84CC16', // Toned-down lime green accent
        tabBarInactiveTintColor: '#94A3B8', // Lighter slate gray for dark background
        tabBarStyle: {
          backgroundColor: '#334155', // Dark slate background
          borderTopWidth: 0,
          height: 90,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 12,
          letterSpacing: -0.1,
        },
        headerStyle: {
          backgroundColor: '#334155', // Dark slate background
        },
        headerTintColor: '#F1F5F9', // Light text for dark background
        headerTitleStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 18,
          letterSpacing: -0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerTitle: 'atlas',
          headerTitleStyle: {
            fontFamily: 'FunnelDisplay_600SemiBold',
            fontSize: 20,
            letterSpacing: -0.5,
          },
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.push('/(tabs)/')}
              style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}
            >
              <Image 
                source={require('../../assets/images/atlas-logo.png')}
                style={{ width: 30, height: 30, borderRadius: 8 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSignOut}
              style={{ marginRight: 16 }}
            >
              <Ionicons 
                name="log-out-outline" 
                size={24} 
                color="#F1F5F9"
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
          headerTitle: 'atlas',
          headerTitleStyle: {
            fontFamily: 'FunnelDisplay_600SemiBold',
            fontSize: 20,
            letterSpacing: -0.5,
          },
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.push('/(tabs)/')}
              style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}
            >
              <Image 
                source={require('../../assets/images/atlas-logo.png')}
                style={{ width: 30, height: 30, borderRadius: 8 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSignOut}
              style={{ marginRight: 16 }}
            >
              <Ionicons 
                name="log-out-outline" 
                size={24} 
                color="#F1F5F9"
              />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
          headerTitle: 'atlas',
          headerTitleStyle: {
            fontFamily: 'FunnelDisplay_600SemiBold',
            fontSize: 20,
            letterSpacing: -0.5,
          },
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.push('/(tabs)/')}
              style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}
            >
              <Image 
                source={require('../../assets/images/atlas-logo.png')}
                style={{ width: 30, height: 30, borderRadius: 8 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSignOut}
              style={{ marginRight: 16 }}
            >
              <Ionicons 
                name="log-out-outline" 
                size={24} 
                color="#F1F5F9"
              />
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}