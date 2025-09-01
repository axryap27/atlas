-- Add missing leaderboard_entries table
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
  metric_type TEXT CHECK (metric_type IN ('weekly_volume', 'monthly_volume', 'weekly_workouts', 'monthly_workouts', 'current_streak')),
  value NUMERIC NOT NULL DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  rank_position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for leaderboard
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user_id ON leaderboard_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_metric_type ON leaderboard_entries(metric_type);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_rank_position ON leaderboard_entries(rank_position);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_period ON leaderboard_entries(period_start, period_end);

-- Enable RLS
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Create policy for leaderboard (all users can view, only own entries can be updated)
CREATE POLICY "Anyone can view leaderboard entries" ON leaderboard_entries FOR SELECT USING (true);
CREATE POLICY "Users can update own leaderboard entries" ON leaderboard_entries FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = user_id AND auth_user_id = auth.uid())
);

-- Grant permissions
GRANT ALL ON leaderboard_entries TO authenticated;

SELECT 'Leaderboard table created successfully! 🏆' as result;