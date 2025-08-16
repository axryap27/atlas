// app/components/auth/AuthProvider.tsx
import React, { useState, useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet, Text, Image, Platform } from 'react-native'
import { authService, AuthState } from '../../services/auth'
import AuthScreen from './AuthScreen'

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true
  })

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState)
    return unsubscribe
  }, [])

  // Show loading spinner while checking auth state
  if (authState.loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../../assets/images/atlas-logo2.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>atlas</Text>
        <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
      </View>
    )
  }

  // Show auth screen if not authenticated
  if (!authState.user) {
    return <AuthScreen />
  }

  // Show main app if authenticated
  return <>{children}</>
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 35,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 30,
  },
  title: {
    fontSize: 40,
    fontWeight: Platform.OS === 'ios' ? '400' : '900',
    color: '#334155',
    marginBottom: 32,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    textTransform: 'lowercase',
  },
  spinner: {
    marginTop: 8,
  },
})