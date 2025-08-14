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

  // Sign in with email and password (for now, username login can be added later)
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
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
}

export const authService = new AuthService()