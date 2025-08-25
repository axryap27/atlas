// app/services/social-api.ts
import { supabase } from '../../lib/supabase';
import { 
  UserProfile, 
  Friendship, 
  Achievement,
  UserAchievement,
  WorkoutPost,
  WorkoutPostLike,
  WorkoutPostComment,
  LeaderboardEntry,
  ActivityFeedItem 
} from '../../lib/supabase';

export class SocialApi {
  // User Profile Management
  static async createUserProfile(userId: number, username: string, displayName?: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        username,
        display_name: displayName || username
      })
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  }

  static async getUserProfile(userId: number) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data as UserProfile;
  }

  static async updateUserProfile(userId: number, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  }

  static async searchUsers(query: string, limit: number = 20) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .eq('is_public', true)
      .limit(limit);

    if (error) throw error;
    return data as UserProfile[];
  }

  // Friend System
  static async sendFriendRequest(requesterId: number, addresseeId: number) {
    const { data, error } = await supabase
      .from('friendships')
      .insert({
        requester_id: requesterId,
        addressee_id: addresseeId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data as Friendship;
  }

  static async acceptFriendRequest(friendshipId: number) {
    const { data, error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', friendshipId)
      .select()
      .single();

    if (error) throw error;
    return data as Friendship;
  }

  static async rejectFriendRequest(friendshipId: number) {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
  }

  static async getFriends(userId: number) {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:user_profiles!friendships_requester_id_fkey(*),
        addressee:user_profiles!friendships_addressee_id_fkey(*)
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) throw error;
    return data as Friendship[];
  }

  static async getFriendRequests(userId: number) {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:user_profiles!friendships_requester_id_fkey(*),
        addressee:user_profiles!friendships_addressee_id_fkey(*)
      `)
      .eq('addressee_id', userId)
      .eq('status', 'pending');

    if (error) throw error;
    return data as Friendship[];
  }

  static async removeFriend(userId: number, friendId: number) {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`);

    if (error) throw error;
  }


  // Achievement System
  static async getUserAchievements(userId: number) {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) throw error;
    return data as UserAchievement[];
  }

  static async awardAchievement(userId: number, achievementId: number, progressData?: any) {
    const { data, error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        progress_data: progressData
      })
      .select(`
        *,
        achievement:achievements(*)
      `)
      .single();

    if (error) throw error;
    return data as UserAchievement;
  }

  static async getAvailableAchievements() {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)
      .order('rarity', { ascending: true });

    if (error) throw error;
    return data as Achievement[];
  }

  // Workout Posts (Social Feed)
  static async createWorkoutPost(userId: number, sessionId: number, caption?: string, visibility: 'private' | 'friends' | 'public' = 'friends') {
    const { data, error } = await supabase
      .from('workout_posts')
      .insert({
        user_id: userId,
        session_id: sessionId,
        caption,
        visibility
      })
      .select(`
        *,
        user:user_profiles!workout_posts_user_id_fkey(*),
        session:sessions(*)
      `)
      .single();

    if (error) throw error;
    return data as WorkoutPost;
  }

  static async getFeed(userId: number, limit: number = 20) {
    // Get posts from friends and public posts
    const { data, error } = await supabase
      .from('workout_posts')
      .select(`
        *,
        user:user_profiles!workout_posts_user_id_fkey(*),
        session:sessions(
          *,
          set_logs(
            *,
            exercise:exercises(*)
          )
        ),
        is_liked_by_user:workout_post_likes!inner(user_id)
      `)
      .or('visibility.eq.public,user_id.eq.' + userId) // TODO: Add friend filtering
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as WorkoutPost[];
  }

  static async likeWorkoutPost(postId: number, userId: number) {
    const { data, error } = await supabase
      .from('workout_post_likes')
      .insert({
        post_id: postId,
        user_id: userId
      })
      .select()
      .single();

    if (error) throw error;

    // Update likes count
    await supabase.rpc('increment_post_likes', { post_id: postId });

    return data as WorkoutPostLike;
  }

  static async unlikeWorkoutPost(postId: number, userId: number) {
    const { error } = await supabase
      .from('workout_post_likes')
      .delete()
      .match({ post_id: postId, user_id: userId });

    if (error) throw error;

    // Update likes count
    await supabase.rpc('decrement_post_likes', { post_id: postId });
  }

  static async addComment(postId: number, userId: number, content: string) {
    const { data, error } = await supabase
      .from('workout_post_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content
      })
      .select(`
        *,
        user:user_profiles!workout_post_comments_user_id_fkey(*)
      `)
      .single();

    if (error) throw error;

    // Update comments count
    await supabase.rpc('increment_post_comments', { post_id: postId });

    return data as WorkoutPostComment;
  }

  // Leaderboards
  static async getLeaderboard(metricType: LeaderboardEntry['metric_type'], limit: number = 50) {
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select(`
        *,
        user:user_profiles!leaderboard_entries_user_id_fkey(*)
      `)
      .eq('metric_type', metricType)
      .order('rank_position', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data as LeaderboardEntry[];
  }

  static async updateLeaderboard(userId: number, metricType: LeaderboardEntry['metric_type'], value: number, periodStart: string, periodEnd: string) {
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .upsert({
        user_id: userId,
        metric_type: metricType,
        value,
        period_start: periodStart,
        period_end: periodEnd
      })
      .select()
      .single();

    if (error) throw error;
    return data as LeaderboardEntry;
  }

  // Activity Feed
  static async getActivityFeed(userId: number, limit: number = 50) {
    const { data, error } = await supabase
      .from('activity_feed')
      .select(`
        *,
        actor:user_profiles!activity_feed_actor_id_fkey(*),
        user:user_profiles!activity_feed_user_id_fkey(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as ActivityFeedItem[];
  }

  static async addActivityFeedItem(userId: number, actorId: number, activityType: ActivityFeedItem['activity_type'], targetId?: number, targetType?: string, metadata?: any) {
    const { data, error } = await supabase
      .from('activity_feed')
      .insert({
        user_id: userId,
        actor_id: actorId,
        activity_type: activityType,
        target_id: targetId,
        target_type: targetType,
        metadata
      })
      .select()
      .single();

    if (error) throw error;
    return data as ActivityFeedItem;
  }
}