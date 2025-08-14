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

    // If signup successful and we have a user, create/update profile
    if (!error && data.user && username) {
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username: username,
            email: email,
            display_name: username
          })
        
        if (profileError) {
          console.error('Failed to create profile:', profileError)
        }
      } catch (profileError) {
        console.error('Error creating profile:', profileError)
      }
    }

    return { data, error }
  }

  // Helper function to check if input is email or username
  private isEmail(input: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(input)
  }

  // Get email from username by checking user profiles table
  private async getEmailFromUsername(username: string): Promise<string | null> {
    try {
      // First try to find user by username in a profiles table if it exists
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email, user_id')
        .eq('username', username)
        .single()
      
      if (!profileError && profileData) {
        return profileData.email
      }
      
      // If no profiles table, we'll need to return null and let the user know
      console.log('Username lookup not available - user should use email')
      return null
    } catch (error) {
      console.log('Username lookup failed:', error)
      return null
    }
  }

  // Sign in with email/username and password
  async signIn(emailOrUsername: string, password: string) {
    let email = emailOrUsername

    // If input is not an email, try to get email from username
    if (!this.isEmail(emailOrUsername)) {
      const foundEmail = await this.getEmailFromUsername(emailOrUsername)
      if (foundEmail) {
        email = foundEmail
      } else {
        return { 
          data: null, 
          error: { message: 'Username not found. Please check your username or use your email address.' }
        }
      }
    }

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