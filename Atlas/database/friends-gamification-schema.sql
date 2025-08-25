-- Friends and Gamification System Schema Extension
-- Add to existing Supabase database

-- User profiles (simple social profiles)
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  is_public BOOLEAN DEFAULT true,
  total_workouts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friends relationships
CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);


-- Simple achievements system (optional - can add later)
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('workout', 'social', 'milestone')),
  criteria JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Workout sharing and social feed
CREATE TABLE IF NOT EXISTS workout_posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
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
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Comments on workout posts
CREATE TABLE IF NOT EXISTS workout_post_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES workout_posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_workout_posts_user_id ON workout_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_posts_created_at ON workout_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_post_likes_post_id ON workout_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_workout_post_likes_user_id ON workout_post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_post_comments_post_id ON workout_post_comments(post_id);

-- Insert basic achievements (optional)
INSERT INTO achievements (name, description, category, criteria) VALUES
('First Steps', 'Complete your first workout', 'workout', '{"type": "workout_count", "target": 1}'),
('Social Butterfly', 'Add 5 friends', 'social', '{"type": "friend_count", "target": 5}'),
('Milestone 100', 'Complete 100 workouts', 'milestone', '{"type": "workout_count", "target": 100}')
ON CONFLICT (name) DO NOTHING;

-- Simple trigger to update workout count
CREATE OR REPLACE FUNCTION update_user_workout_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total workouts when a session is completed
  IF TG_OP = 'UPDATE' AND OLD.end_time IS NULL AND NEW.end_time IS NOT NULL THEN
    UPDATE user_profiles 
    SET 
      total_workouts = total_workouts + 1,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workout_count
  AFTER UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_workout_count();