// Quick schema diagnostic
import { supabase } from '../../lib/supabase';

export const checkSchema = async () => {
  try {
    console.log('🔍 Checking database schema...');
    
    // Try to query user_profiles table structure
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
      
    if (error) {
      console.log('❌ user_profiles table error:', error.message);
      
      // Check if the table exists at all
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log('📋 user_profiles table does not exist. Run the SQL schema first.');
        return { tableExists: false, error: error.message };
      }
      
      // Check if specific columns are missing
      if (error.message.includes('auth_user_id')) {
        console.log('📋 auth_user_id column is missing from user_profiles table');
        return { tableExists: true, missingColumns: ['auth_user_id'], error: error.message };
      }
      
      return { tableExists: true, error: error.message };
    }
    
    console.log('✅ user_profiles table structure looks good');
    console.log('Sample data:', data);
    return { tableExists: true, error: null, sampleData: data };
    
  } catch (e) {
    console.error('Failed to check schema:', e);
    return { error: e };
  }
};

// Make it globally available for testing
(global as any).checkSchema = checkSchema;