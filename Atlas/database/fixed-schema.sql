-- Updated Social Features Schema (Safe to run multiple times)
-- This will create tables if they don't exist, or add missing columns

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  auth_user_id UUID,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  is_public BOOLEAN DEFAULT true,
  total_workouts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add auth_user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='auth_user_id') THEN
        ALTER TABLE user_profiles ADD COLUMN auth_user_id UUID;
    END IF;
    
    -- Add username column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='username') THEN
        ALTER TABLE user_profiles ADD COLUMN username TEXT UNIQUE;
    END IF;
    
    -- Add other columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='display_name') THEN
        ALTER TABLE user_profiles ADD COLUMN display_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='bio') THEN
        ALTER TABLE user_profiles ADD COLUMN bio TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='is_public') THEN
        ALTER TABLE user_profiles ADD COLUMN is_public BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='total_workouts') THEN
        ALTER TABLE user_profiles ADD COLUMN total_workouts INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add constraints
DO $$
BEGIN
    -- Add foreign key constraint to auth.users if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name='user_profiles_auth_user_id_fkey') THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_auth_user_id_fkey 
        FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add unique constraint on auth_user_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name='user_profiles_auth_user_id_key') THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_auth_user_id_key 
        UNIQUE (auth_user_id);
    END IF;
END $$;

-- Make username and auth_user_id NOT NULL (only if they're currently NULL)
DO $$
BEGIN
    -- Make auth_user_id NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_profiles' AND column_name='auth_user_id' AND is_nullable='YES') THEN
        ALTER TABLE user_profiles ALTER COLUMN auth_user_id SET NOT NULL;
    END IF;
    
    -- Make username NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='user_profiles' AND column_name='username' AND is_nullable='YES') THEN
        ALTER TABLE user_profiles ALTER COLUMN username SET NOT NULL;
    END IF;
END $$;

-- Friends relationships table
CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
  addressee_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint for friendships
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name='friendships_unique_pair') THEN
        ALTER TABLE friendships ADD CONSTRAINT friendships_unique_pair 
        UNIQUE (requester_id, addressee_id);
    END IF;
END $$;

-- Simple achievements system
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('workout', 'social', 'milestone')),
  criteria JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint for user achievements
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name='user_achievements_unique_pair') THEN
        ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_unique_pair 
        UNIQUE (user_id, achievement_id);
    END IF;
END $$;

-- Workout sharing and social feed
CREATE TABLE IF NOT EXISTS workout_posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_id INTEGER, -- We'll add the foreign key later if sessions table exists
  caption TEXT,
  visibility TEXT DEFAULT 'friends' CHECK (visibility IN ('private', 'friends', 'public')),
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Likes on workout posts
CREATE TABLE IF NOT EXISTS workout_post_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES workout_posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint for workout post likes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name='workout_post_likes_unique_pair') THEN
        ALTER TABLE workout_post_likes ADD CONSTRAINT workout_post_likes_unique_pair 
        UNIQUE (post_id, user_id);
    END IF;
END $$;

-- Comments on workout posts
CREATE TABLE IF NOT EXISTS workout_post_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES workout_posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_posts_user_id ON workout_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_posts_created_at ON workout_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_post_likes_post_id ON workout_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_workout_post_likes_user_id ON workout_post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_post_comments_post_id ON workout_post_comments(post_id);

-- Insert basic achievements (safe to run multiple times)
INSERT INTO achievements (name, description, category, criteria) VALUES
('First Steps', 'Complete your first workout', 'workout', '{"type": "workout_count", "target": 1}'),
('Social Butterfly', 'Add 5 friends', 'social', '{"type": "friend_count", "target": 5}'),
('Milestone 100', 'Complete 100 workouts', 'milestone', '{"type": "workout_count", "target": 100}')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security (RLS) 
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (users can only see/edit their own data)
CREATE POLICY "Users can view public profiles" ON user_profiles FOR SELECT USING (is_public = true OR auth.uid() = auth_user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can view own friendships" ON friendships FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = requester_id AND auth_user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = addressee_id AND auth_user_id = auth.uid())
);

CREATE POLICY "Users can manage own friendship requests" ON friendships FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = requester_id AND auth_user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = addressee_id AND auth_user_id = auth.uid())
);

-- Grant permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON friendships TO authenticated;
GRANT ALL ON workout_posts TO authenticated;
GRANT ALL ON workout_post_likes TO authenticated;
GRANT ALL ON workout_post_comments TO authenticated;
GRANT ALL ON user_achievements TO authenticated;
GRANT ALL ON achievements TO authenticated;

SELECT 'Social features schema applied successfully! 🎉' as result;