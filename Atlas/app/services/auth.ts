// app/services/auth.ts
import { supabase } from '../../lib/supabase'
import { Session, User } from '@supabase/supabase-js'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

class AuthService {
  private listeners: ((state: AuthState) => void)[] = []
  private currentState: AuthState = {
    user: null,
    session: null,
    loading: true
  }

  constructor() {
    this.initialize()
  }

  private async initialize() {
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession()
    
    this.currentState = {
      user: session?.user ?? null,
      session,
      loading: false
    }
    
    this.notifyListeners()

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      this.currentState = {
        user: session?.user ?? null,
        session,
        loading: false
      }
      this.notifyListeners()
    })
  }

  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener)
    // Immediately call with current state
    listener(this.currentState)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentState))
  }

  getState(): AuthState {
    return this.currentState
  }

  // Sign up with email, password, and username
  async signUp(email: string, password: string, username?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          display_name: username
        }
      }
    })
    return { data, error }
  }

  // Sign in with email/username and password
  async signIn(emailOrUsername: string, password: string) {
    // Check if the input is an email (contains @) or username
    const isEmail = emailOrUsername.includes('@')
    
    if (isEmail) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailOrUsername,
        password
      })
      return { data, error }
    } else {
      // For username login, use RPC function to get email
      try {
        const { data: email, error: rpcError } = await supabase
          .rpc('get_user_email_by_username', { username_input: emailOrUsername })
        
        if (rpcError || !email) {
          return { data: null, error: { message: 'Username not found' } }
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password
        })
        return { data, error }
      } catch (error) {
        return { data: null, error: { message: 'Error looking up username' } }
      }
    }
  }

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  // Get current user
  getCurrentUser() {
    return this.currentState.user
  }

  // Get current username
  getCurrentUsername() {
    return this.currentState.user?.user_metadata?.username || null
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentState.user
  }

  // Update user profile (including username)
  async updateProfile(updates: { username?: string; display_name?: string }) {
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    })
    return { data, error }
  }
}

export const authService = new AuthService()