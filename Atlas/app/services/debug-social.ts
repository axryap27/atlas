// Debug utility for social features
import { supabase } from '../../lib/supabase';
import { authService } from './auth';

export const debugSocial = {
  async checkDatabaseConnection() {
    try {
      console.log('=== Database Connection Test ===');
      
      // Test basic connection
      const { data, error } = await supabase.from('user_profiles').select('count').single();
      console.log('Database connection:', error ? 'FAILED' : 'SUCCESS');
      if (error) console.error('Connection error:', error);
      
      return !error;
    } catch (e) {
      console.error('Database connection failed:', e);
      return false;
    }
  },

  async checkCurrentUser() {
    try {
      console.log('=== Current User Test ===');
      const user = authService.getCurrentUser();
      console.log('Current auth user:', {
        id: user?.id,
        email: user?.email,
        username: user?.user_metadata?.username
      });
      
      return user;
    } catch (e) {
      console.error('Failed to get current user:', e);
      return null;
    }
  },

  async checkUsersTable() {
    console.log('=== Users Table Test (Skipped) ===');
    console.log('Using user_profiles table instead of separate users table');
    return { users: [], error: null };
  },

  async checkUserProfilesTable() {
    try {
      console.log('=== User Profiles Table Test ===');
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(10);
      
      console.log('Profiles in user_profiles table:', { count: profiles?.length || 0, profiles, error });
      return { profiles, error };
    } catch (e) {
      console.error('Failed to query user_profiles table:', e);
      return { profiles: null, error: e };
    }
  },

  async createTestProfile(username: string, displayName: string, authUserId: string) {
    try {
      console.log('=== Creating Test Profile ===');
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({ 
          username, 
          display_name: displayName,
          auth_user_id: authUserId 
        })
        .select()
        .single();
      
      console.log('Created profile:', { data, error });
      return { data, error };
    } catch (e) {
      console.error('Failed to create test profile:', e);
      return { data: null, error: e };
    }
  },

  async runFullDiagnostic() {
    console.log('🔍 Starting Social Features Diagnostic...\n');
    
    await this.checkDatabaseConnection();
    await this.checkCurrentUser();
    await this.checkUsersTable();
    await this.checkUserProfilesTable();
    
    console.log('\n✅ Diagnostic complete. Check logs above for issues.');
  },

  async checkSpecificUsers() {
    console.log('=== Checking for specific users (aarya, testerlolz) ===');
    
    // Check in user_profiles table
    const { data: profilesData } = await supabase
      .from('user_profiles')
      .select('*')
      .in('username', ['aarya', 'testerlolz']);
    
    console.log('Found profiles in user_profiles table:', profilesData);
    
    return { profilesData };
  }
};

// Make it globally available for testing
(global as any).debugSocial = debugSocial;