// app/components/social/ChallengeCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Challenge, ChallengeParticipant } from '../../../lib/supabase';

interface ChallengeCardProps {
  challenge: Challenge;
  onJoin: (challengeId: number) => void;
  onViewDetails: (challenge: Challenge) => void;
  userParticipation?: ChallengeParticipant;
}

export default function ChallengeCard({ challenge, onJoin, onViewDetails, userParticipation }: ChallengeCardProps) {
  const isParticipating = !!userParticipation;
  const daysLeft = Math.ceil((new Date(challenge.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const participantCount = challenge.participant_count || 0;
  const progressPercentage = userParticipation && challenge.target_value 
    ? Math.min((userParticipation.current_progress / challenge.target_value) * 100, 100)
    : 0;

  const getChallengeIcon = () => {
    switch (challenge.type) {
      case 'volume':
        return 'barbell-outline';
      case 'workouts':
        return 'fitness-outline';
      case 'streak':
        return 'flame-outline';
      case 'duration':
        return 'timer-outline';
      case 'exercise_specific':
        return 'muscle-outline';
      default:
        return 'trophy-outline';
    }
  };

  const getChallengeTypeLabel = () => {
    switch (challenge.type) {
      case 'volume':
        return 'Total Volume';
      case 'workouts':
        return 'Workout Count';
      case 'streak':
        return 'Daily Streak';
      case 'duration':
        return 'Total Duration';
      case 'exercise_specific':
        return `${challenge.exercise?.name || 'Exercise'} Challenge`;
      default:
        return 'Challenge';
    }
  };

  const getTargetDisplay = () => {
    if (!challenge.target_value) return '';
    
    switch (challenge.type) {
      case 'volume':
        return `${challenge.target_value.toLocaleString()} lbs`;
      case 'workouts':
        return `${challenge.target_value} workouts`;
      case 'streak':
        return `${challenge.target_value} days`;
      case 'duration':
        return `${Math.floor(challenge.target_value / 60)} hours`;
      default:
        return challenge.target_value.toString();
    }
  };

  const getRarityColor = () => {
    if (daysLeft <= 1) return '#EF4444'; // Red for urgent
    if (daysLeft <= 3) return '#F59E0B'; // Orange for soon
    return '#84CC16'; // Green for plenty of time
  };

  const handleJoinPress = () => {
    if (challenge.max_participants && participantCount >= challenge.max_participants) {
      Alert.alert('Challenge Full', 'This challenge has reached its maximum number of participants.');
      return;
    }

    Alert.alert(
      'Join Challenge',
      `Are you sure you want to join "${challenge.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Join', onPress: () => onJoin(challenge.id) }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconContainer, { backgroundColor: getRarityColor() + '20' }]}>
            <Ionicons name={getChallengeIcon() as any} size={20} color={getRarityColor()} />
          </View>
          <View style={styles.titleInfo}>
            <Text style={styles.title} numberOfLines={1}>{challenge.title}</Text>
            <Text style={styles.typeLabel}>{getChallengeTypeLabel()}</Text>
          </View>
        </View>
        <View style={styles.timeInfo}>
          <Text style={[styles.timeLeft, { color: getRarityColor() }]}>
            {daysLeft > 0 ? `${daysLeft}d left` : 'Ending today'}
          </Text>
          <Text style={styles.participants}>{participantCount} joined</Text>
        </View>
      </View>

      {/* Description */}
      {challenge.description && (
        <Text style={styles.description} numberOfLines={2}>
          {challenge.description}
        </Text>
      )}

      {/* Target and Progress */}
      <View style={styles.targetSection}>
        <View style={styles.targetInfo}>
          <Text style={styles.targetLabel}>Target:</Text>
          <Text style={styles.targetValue}>{getTargetDisplay()}</Text>
        </View>
        
        {challenge.prize_description && (
          <View style={styles.prizeInfo}>
            <Ionicons name="gift-outline" size={14} color="#F59E0B" />
            <Text style={styles.prizeText}>{challenge.prize_description}</Text>
          </View>
        )}
      </View>

      {/* Progress Bar (if participating) */}
      {isParticipating && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Your Progress</Text>
            <Text style={styles.progressValue}>
              {userParticipation.current_progress.toLocaleString()} / {getTargetDisplay()}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${progressPercentage}%`,
                  backgroundColor: progressPercentage >= 100 ? '#84CC16' : '#3B82F6'
                }
              ]} 
            />
          </View>
          <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}% complete</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.detailsButton}
          onPress={() => onViewDetails(challenge)}
        >
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
        
        {!isParticipating && (
          <TouchableOpacity 
            style={[
              styles.joinButton,
              (challenge.max_participants && participantCount >= challenge.max_participants) 
                ? styles.disabledButton 
                : {}
            ]}
            onPress={handleJoinPress}
            disabled={challenge.max_participants && participantCount >= challenge.max_participants}
          >
            <Text style={styles.joinButtonText}>
              {challenge.max_participants && participantCount >= challenge.max_participants 
                ? 'Full' 
                : 'Join Challenge'
              }
            </Text>
          </TouchableOpacity>
        )}
        
        {isParticipating && progressPercentage >= 100 && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#84CC16" />
            <Text style={styles.completedText}>Completed!</Text>
          </View>
        )}
      </View>

      {/* Creator Info */}
      <View style={styles.footer}>
        <Text style={styles.creatorText}>
          Created by {challenge.creator?.display_name || 'Unknown'}
        </Text>
        {challenge.is_public && (
          <View style={styles.publicBadge}>
            <Ionicons name="globe-outline" size={12} color="#94A3B8" />
            <Text style={styles.publicText}>Public</Text>
          </View>
        )}
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  typeLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  timeLeft: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  participants: {
    fontSize: 12,
    color: '#94A3B8',
  },
  description: {
    fontSize: 14,
    color: '#E2E8F0',
    marginBottom: 12,
    lineHeight: 18,
  },
  targetSection: {
    marginBottom: 12,
  },
  targetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginRight: 8,
  },
  targetValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#84CC16',
  },
  prizeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prizeText: {
    fontSize: 12,
    color: '#F59E0B',
    marginLeft: 4,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#F1F5F9',
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 12,
    color: '#94A3B8',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#64748B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginRight: 8,
  },
  detailsButtonText: {
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
  joinButton: {
    backgroundColor: '#84CC16',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginLeft: 8,
  },
  joinButtonText: {
    color: '#1F2937',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#64748B',
    opacity: 0.6,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#84CC16' + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  completedText: {
    color: '#84CC16',
    fontWeight: '600',
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatorText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  publicText: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 4,
  },
});