// app/(tabs)/social.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SocialApi } from '../services/social-api';
import { UserProfile, Friendship, WorkoutPost, LeaderboardEntry } from '../../lib/supabase';
import { authService } from '../services/auth';

type SocialTab = 'feed' | 'friends' | 'leaderboard' | 'profile';

export default function SocialScreen() {
  const [activeTab, setActiveTab] = useState<SocialTab>('feed');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileSetupData, setProfileSetupData] = useState({
    username: '',
    displayName: ''
  });
  
  // Feed data
  const [workoutFeed, setWorkoutFeed] = useState<WorkoutPost[]>([]);
  
  // Friends data
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendRequests, setFriendRequests] = useState<Friendship[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  
  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardType, setLeaderboardType] = useState<'weekly_volume' | 'monthly_volume' | 'weekly_workouts'>('weekly_volume');
  
  const styles = getStyles();

  useEffect(() => {
    checkUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile && !showProfileSetup) {
      loadTabData();
    }
  }, [activeTab, userProfile, showProfileSetup]);

  const checkUserProfile = async () => {
    try {
      setLoading(true);
      const profile = await SocialApi.getCurrentUserProfile();
      
      if (!profile) {
        // User needs to set up profile
        const currentUser = authService.getCurrentUser();
        const username = authService.getCurrentUsername();
        
        setProfileSetupData({
          username: username || '',
          displayName: username || currentUser?.email?.split('@')[0] || ''
        });
        setShowProfileSetup(true);
      } else {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
      Alert.alert('Error', 'Failed to load user profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async () => {
    if (!profileSetupData.username.trim()) {
      Alert.alert('Error', 'Please enter a username.');
      return;
    }

    try {
      setLoading(true);
      const profile = await SocialApi.createUserProfile(
        profileSetupData.username.trim(),
        profileSetupData.displayName.trim() || profileSetupData.username.trim()
      );
      
      setUserProfile(profile);
      setShowProfileSetup(false);
      Alert.alert('Success', 'Profile created successfully!');
    } catch (error) {
      console.error('Error creating profile:', error);
      Alert.alert('Error', 'Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'feed':
          await loadFeed();
          break;
        case 'friends':
          await loadFriends();
          break;
        case 'leaderboard':
          await loadLeaderboard();
          break;
        case 'profile':
          // Load user profile data
          break;
      }
    } catch (error) {
      console.error('Error loading tab data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTabData();
    setRefreshing(false);
  };

  const loadFeed = async () => {
    // const feed = await SocialApi.getFeed();
    // setWorkoutFeed(feed);
    setWorkoutFeed([]); // Placeholder for now
  };

  const loadFriends = async () => {
    const [friendsData, requestsData] = await Promise.all([
      SocialApi.getFriends(),
      SocialApi.getFriendRequests()
    ]);
    setFriends(friendsData);
    setFriendRequests(requestsData);
  };


  const loadLeaderboard = async () => {
    const leaderboardData = await SocialApi.getLeaderboard(leaderboardType);
    setLeaderboard(leaderboardData);
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const results = await SocialApi.searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const sendFriendRequest = async (addresseeId: number) => {
    try {
      await SocialApi.sendFriendRequest(addresseeId);
      Alert.alert('Success', 'Friend request sent!');
      setSearchResults(prev => prev.filter(user => user.user_id !== addresseeId));
    } catch (error) {
      console.error('Friend request error:', error);
      Alert.alert('Error', 'Failed to send friend request.');
    }
  };

  const handleFriendRequest = async (requestId: number, accept: boolean) => {
    try {
      if (accept) {
        await SocialApi.acceptFriendRequest(requestId);
      } else {
        await SocialApi.rejectFriendRequest(requestId);
      }
      await loadFriends();
    } catch (error) {
      console.error('Friend request handling error:', error);
      Alert.alert('Error', 'Failed to handle friend request.');
    }
  };


  const likePost = async (postId: number) => {
    try {
      if (!userProfile) return;
      await SocialApi.likeWorkoutPost(postId, userProfile.user_id);
      // Update local state
      setWorkoutFeed(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes_count: post.likes_count + 1, is_liked_by_user: true }
          : post
      ));
    } catch (error) {
      console.error('Like post error:', error);
    }
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'feed', icon: 'home-outline', label: 'Feed' },
        { key: 'friends', icon: 'people-outline', label: 'Friends' },
        { key: 'leaderboard', icon: 'podium-outline', label: 'Rankings' },
        { key: 'profile', icon: 'person-outline', label: 'Profile' }
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tabItem, activeTab === tab.key && styles.activeTabItem]}
          onPress={() => setActiveTab(tab.key as SocialTab)}
        >
          <Ionicons 
            name={tab.icon as any} 
            size={20} 
            color={activeTab === tab.key ? '#84CC16' : '#94A3B8'} 
          />
          <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFeed = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Workout Feed</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="add" size={20} color="#84CC16" />
          <Text style={styles.shareButtonText}>Share Workout</Text>
        </TouchableOpacity>
      </View>
      
      {workoutFeed.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={64} color="#94A3B8" />
          <Text style={styles.emptyStateTitle}>No workouts yet</Text>
          <Text style={styles.emptyStateSubtext}>Follow friends to see their workouts!</Text>
        </View>
      ) : (
        workoutFeed.map(post => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.postUserInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {post.user?.display_name?.[0]?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.postUsername}>{post.user?.display_name || 'User'}</Text>
                  <Text style={styles.postTime}>
                    {new Date(post.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
            
            {post.caption && (
              <Text style={styles.postCaption}>{post.caption}</Text>
            )}
            
            <View style={styles.workoutSummary}>
              <Text style={styles.workoutTitle}>Workout Summary</Text>
              <Text style={styles.workoutDetails}>
                Duration: {post.session?.duration || 'N/A'} min • Volume: {
                  post.session?.set_logs?.reduce((sum, log) => 
                    sum + ((log.weight || 0) * (log.reps || 0)), 0
                  )?.toLocaleString() || '0'
                } lbs
              </Text>
            </View>
            
            <View style={styles.postActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => likePost(post.id)}
              >
                <Ionicons 
                  name={post.is_liked_by_user ? "heart" : "heart-outline"} 
                  size={20} 
                  color={post.is_liked_by_user ? "#EF4444" : "#94A3B8"} 
                />
                <Text style={styles.actionText}>{post.likes_count}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={20} color="#94A3B8" />
                <Text style={styles.actionText}>{post.comments_count}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="share-outline" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderFriends = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Friends</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowSearch(true)}
        >
          <Ionicons name="person-add" size={20} color="#84CC16" />
          <Text style={styles.addButtonText}>Add Friends</Text>
        </TouchableOpacity>
      </View>

      {friendRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>Friend Requests</Text>
          {friendRequests.map(request => (
            <View key={request.id} style={styles.friendRequestCard}>
              <View style={styles.friendInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {request.requester?.display_name?.[0]?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.friendName}>{request.requester?.display_name}</Text>
                  <Text style={styles.friendUsername}>@{request.requester?.username}</Text>
                </View>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity 
                  style={styles.acceptButton}
                  onPress={() => handleFriendRequest(request.id, true)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.declineButton}
                  onPress={() => handleFriendRequest(request.id, false)}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.subsectionTitle}>My Friends ({friends.length})</Text>
        {friends.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#94A3B8" />
            <Text style={styles.emptyStateTitle}>No friends yet</Text>
            <Text style={styles.emptyStateSubtext}>Add friends to compete and share workouts!</Text>
          </View>
        ) : (
          friends.map(friendship => {
            const friend = friendship.requester_id === userProfile?.user_id 
              ? friendship.addressee 
              : friendship.requester;
            
            return (
              <View key={friendship.id} style={styles.friendCard}>
                <View style={styles.friendInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {friend?.display_name?.[0]?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.friendName}>{friend?.display_name}</Text>
                    <Text style={styles.friendUsername}>@{friend?.username}</Text>
                    <Text style={styles.friendStats}>
                      {friend?.total_workouts} workouts
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.challengeButton}>
                  <Text style={styles.challengeButtonText}>Challenge</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#84CC16" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'feed':
        return renderFeed();
      case 'friends':
        return renderFriends();
      case 'leaderboard':
        return (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Coming Soon: Leaderboards</Text>
          </View>
        );
      case 'profile':
        return (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Coming Soon: Profile</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#F1F5F9" />
        </TouchableOpacity>
      </View>

      {renderContent()}
      {renderTabBar()}

      {/* User Search Modal */}
      <Modal
        visible={showSearch}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSearch(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Friends</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchUsers(text);
              }}
            />
          </View>

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.searchResultCard}>
                <View style={styles.friendInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.display_name?.[0]?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.friendName}>{item.display_name}</Text>
                    <Text style={styles.friendUsername}>@{item.username}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.addFriendButton}
                  onPress={() => sendFriendRequest(item.user_id)}
                >
                  <Text style={styles.addFriendButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
            style={styles.searchResults}
          />
        </SafeAreaView>
      </Modal>

      {/* Profile Setup Modal */}
      <Modal
        visible={showProfileSetup}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.setupContainer}>
            <View style={styles.setupHeader}>
              <Ionicons name="people" size={64} color="#84CC16" />
              <Text style={styles.setupTitle}>Welcome to Social!</Text>
              <Text style={styles.setupSubtitle}>
                Set up your profile to connect with friends
              </Text>
            </View>

            <View style={styles.setupForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username *</Text>
                <TextInput
                  style={styles.setupInput}
                  placeholder="Enter username..."
                  placeholderTextColor="#94A3B8"
                  value={profileSetupData.username}
                  onChangeText={(text) => 
                    setProfileSetupData(prev => ({ ...prev, username: text }))
                  }
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Display Name</Text>
                <TextInput
                  style={styles.setupInput}
                  placeholder="Enter display name..."
                  placeholderTextColor="#94A3B8"
                  value={profileSetupData.displayName}
                  onChangeText={(text) => 
                    setProfileSetupData(prev => ({ ...prev, displayName: text }))
                  }
                />
              </View>
            </View>

            <TouchableOpacity 
              style={styles.setupButton}
              onPress={createUserProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#1F2937" />
              ) : (
                <Text style={styles.setupButtonText}>Create Profile</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  notificationButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#475569',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#64748B',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTabItem: {
    // Active styling handled by icon/text color
  },
  tabLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#84CC16',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shareButtonText: {
    color: '#84CC16',
    marginLeft: 4,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#84CC16',
    marginLeft: 4,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  postCard: {
    backgroundColor: '#475569',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#64748B',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  postUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#84CC16',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#1F2937',
    fontWeight: 'bold',
    fontSize: 16,
  },
  postUsername: {
    color: '#F1F5F9',
    fontWeight: '600',
    fontSize: 16,
  },
  postTime: {
    color: '#94A3B8',
    fontSize: 12,
  },
  postCaption: {
    color: '#E2E8F0',
    fontSize: 14,
    marginBottom: 12,
  },
  workoutSummary: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  workoutTitle: {
    color: '#F1F5F9',
    fontWeight: '600',
    marginBottom: 4,
  },
  workoutDetails: {
    color: '#94A3B8',
    fontSize: 12,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    color: '#94A3B8',
    marginLeft: 4,
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 12,
  },
  friendRequestCard: {
    backgroundColor: '#475569',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#64748B',
  },
  friendCard: {
    backgroundColor: '#475569',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#64748B',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendName: {
    color: '#F1F5F9',
    fontWeight: '600',
    fontSize: 16,
  },
  friendUsername: {
    color: '#94A3B8',
    fontSize: 14,
  },
  friendStats: {
    color: '#84CC16',
    fontSize: 12,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: '#84CC16',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  acceptButtonText: {
    color: '#1F2937',
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#64748B',
  },
  declineButtonText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  challengeButton: {
    backgroundColor: '#84CC16',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  challengeButtonText: {
    color: '#1F2937',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  modalCancelButton: {
    color: '#84CC16',
    fontSize: 16,
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    backgroundColor: '#475569',
    borderRadius: 8,
    padding: 12,
    color: '#F1F5F9',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#64748B',
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchResultCard: {
    backgroundColor: '#475569',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#64748B',
  },
  addFriendButton: {
    backgroundColor: '#84CC16',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addFriendButtonText: {
    color: '#1F2937',
    fontWeight: '600',
  },
  // Profile Setup Styles
  setupContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  setupHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginTop: 20,
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  setupForm: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#F1F5F9',
    fontWeight: '600',
    marginBottom: 8,
  },
  setupInput: {
    backgroundColor: '#475569',
    borderRadius: 8,
    padding: 16,
    color: '#F1F5F9',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#64748B',
  },
  setupButton: {
    backgroundColor: '#84CC16',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  setupButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: 'bold',
  },
});