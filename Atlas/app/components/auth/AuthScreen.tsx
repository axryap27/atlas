// app/components/auth/AuthScreen.tsx
import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { authService } from '../../services/auth'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [])

  const handleAuth = async () => {
    if (isSignUp) {
      if (!email || !username || !password) {
        Alert.alert('Error', 'Please fill in all fields')
        return
      }
      if (username.length < 3) {
        Alert.alert('Error', 'Username must be at least 3 characters')
        return
      }
    } else {
      if (!email || !password) {
        Alert.alert('Error', 'Please fill in all fields')
        return
      }
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      let result
      if (isSignUp) {
        result = await authService.signUp(email, password, username)
      } else {
        result = await authService.signIn(email, password)
      }

      if (result.error) {
        Alert.alert(
          isSignUp ? 'Sign Up Error' : 'Sign In Error',
          result.error.message
        )
      } else if (isSignUp && result.data?.user && !result.data?.session) {
        Alert.alert(
          'Account Created!',
          'Your account has been created successfully. Please check your email and click the confirmation link to complete setup.\n\n⚠️ If the link opens to an error page, don\'t worry - your account is still activated and you can sign in.',
          [
            {
              text: 'Sign In Now',
              onPress: () => setIsSignUp(false)
            },
            {
              text: 'OK',
              style: 'default'
            }
          ]
        )
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            {/* Atlas Logo */}
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../../assets/images/atlas-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>atlas</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#8E8E93" />
              <TextInput
                style={styles.input}
                placeholder={isSignUp ? "Email" : "Email or Username"}
                value={email}
                onChangeText={setEmail}
                keyboardType={isSignUp ? "email-address" : "default"}
                autoCapitalize="none"
                autoComplete={isSignUp ? "email" : "username"}
              />
            </View>

            {/* Username field - only show during sign up */}
            {isSignUp && (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#8E8E93" />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoComplete="username"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#8E8E93" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.authButton, loading && styles.authButtonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.authButtonText}>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Switch between sign in/up */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.switchButton}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  
  // Header styles
  header: {
    alignItems: 'center',
    marginBottom: 64,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 35,
    backgroundColor: '#F8FAFC', // Light background to see if logo is there
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0', // Border to see the container
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 30,
  },
  
  title: {
    fontSize: 36,
    fontFamily: 'Inter_600SemiBold',
    color: '#334155',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  
  // Form styles
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#334155',
  },
  authButton: {
    backgroundColor: '#475569',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  authButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  
  // Footer styles
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#64748B',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  switchButton: {
    color: '#475569',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
})