// app/components/social/WorkoutPostCard.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutPost } from '../../../lib/supabase';

interface WorkoutPostCardProps {
  post: WorkoutPost;
  currentUserId: number;
  onLike: (postId: number) => void;
  onComment: (postId: number) => void;
}

export default function WorkoutPostCard({ post, currentUserId, onLike, onComment }: WorkoutPostCardProps) {
  const [isLiked, setIsLiked] = useState(post.is_liked_by_user || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const handleLike = () => {
    const newIsLiked = !isLiked;
    const newCount = newIsLiked ? likesCount + 1 : likesCount - 1;
    
    setIsLiked(newIsLiked);
    setLikesCount(newCount);
    onLike(post.id);
  };

  const getWorkoutSummary = () => {
    // Generate a workout summary from session data if available
    // For now, just return a basic summary
    return "Completed workout";
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {post.user?.display_name?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.displayName}>{post.user?.display_name}</Text>
            <Text style={styles.username}>@{post.user?.username}</Text>
          </View>
        </View>
        <Text style={styles.timeAgo}>{formatTimeAgo(post.created_at)}</Text>
      </View>

      {/* Caption */}
      {post.caption && (
        <Text style={styles.caption}>{post.caption}</Text>
      )}

      {/* Workout Summary */}
      <View style={styles.workoutSummary}>
        <View style={styles.workoutHeader}>
          <Ionicons name="fitness" size={18} color="#84CC16" />
          <Text style={styles.workoutTitle}>Workout Summary</Text>
        </View>
        <Text style={styles.workoutDetails}>{getWorkoutSummary()}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionButton, isLiked && styles.likedButton]} 
          onPress={handleLike}
        >
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={20} 
            color={isLiked ? "#FF3B30" : "#94A3B8"} 
          />
          <Text style={[styles.actionText, isLiked && styles.likedText]}>
            {likesCount > 0 ? likesCount : 'Like'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onComment(post.id)}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#94A3B8" />
          <Text style={styles.actionText}>
            {post.comments_count > 0 ? post.comments_count : 'Comment'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color="#94A3B8" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#475569',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#64748B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#84CC16',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  username: {
    fontSize: 14,
    color: '#94A3B8',
  },
  timeAgo: {
    fontSize: 12,
    color: '#94A3B8',
  },
  caption: {
    fontSize: 16,
    color: '#E2E8F0',
    lineHeight: 22,
    marginBottom: 12,
  },
  workoutSummary: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#84CC16',
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  workoutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#84CC16',
    marginLeft: 6,
  },
  workoutDetails: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#64748B',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 70,
    justifyContent: 'center',
  },
  likedButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  actionText: {
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 6,
    fontWeight: '500',
  },
  likedText: {
    color: '#FF3B30',
  },
});