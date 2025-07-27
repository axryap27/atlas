// Simple test to verify Supabase connection
// Run this with: node test-supabase-connection.js

import { createClient } from '@supabase/supabase-js';

// Replace these with your NEW credentials after regenerating them
const supabaseUrl = 'https://fnnskpbrovagfmemychr.supabase.co';
const supabaseAnonKey = 'YOUR_NEW_ANON_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test 1: Check exercises
    const { data: exercises, error: exerciseError } = await supabase
      .from('exercises')
      .select('*');
    
    if (exerciseError) {
      console.error('❌ Exercise query failed:', exerciseError);
    } else {
      console.log('✅ Exercises found:', exercises.length);
      console.log('🔍 First 3 exercises:', exercises.slice(0, 3).map(e => e.name));
    }
    
    // Test 2: Check workout templates
    const { data: templates, error: templateError } = await supabase
      .from('workout_days')
      .select('*')
      .eq('is_template', true);
    
    if (templateError) {
      console.error('❌ Template query failed:', templateError);
    } else {
      console.log('✅ Templates found:', templates.length);
      console.log('🔍 Templates:', templates.map(t => t.name));
    }
    
    // Test 3: Check sessions
    const { data: sessions, error: sessionError } = await supabase
      .from('sessions')
      .select('*');
    
    if (sessionError) {
      console.error('❌ Session query failed:', sessionError);
    } else {
      console.log('✅ Sessions found:', sessions.length);
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

testConnection();