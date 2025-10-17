import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { Friend } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';



export default function ChatScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messageVisible, setMessageVisible] = useState(false);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);

  const getRandomColor = () => {
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const showMessage = (type: 'success' | 'error' | 'info', message: string) => {
    setMessageType(type);
    setMessageText(message);
    setMessageVisible(true);
  };

  const fetchAllFriends = async () => {
    try {
      setLoading(true);
      const response = await api.get(ENDPOINTS.friends.getAll);
      console.log("Fetched friends:", response.data);

      if (response.data.success && response.data.data) {
        const currentUserData = await Storage.getItem("user");

        const transformedFriends: Friend[] = response.data.data
          .filter((user: any) => user._id !== currentUserData?._id) // Exclude yourself
          .map((user: any) => ({
            id: user._id || user.id,
            name: user.fullName || user.username,
            username: user.username,
            avatar: user.profileImage || undefined,
            initial: user.fullName ? user.fullName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase(),
            bgColor: getRandomColor(),
            isActive: user.isActive || false,
            lastMessage: "Start a conversation", // Default message
            lastMessageTime: "Now", // Default time
            unread: false,
          }));

        setFriends(transformedFriends);
        setFilteredFriends(transformedFriends);
      }
    } catch (error: any) {
      console.log("Error fetching friends:", error);
      showMessage("error", error?.response?.data?.message || "Failed to load friends");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllFriends();
    setRefreshing(false);
  };

  const handleInitialSetup = async () => {
    await fetchAllFriends();
  };

  // Search filtering function
  const filterFriends = (searchText: string) => {
    if (!searchText.trim()) {
      setFilteredFriends(friends);
      return;
    }
    
    const filtered = friends.filter(friend => 
      friend.name.toLowerCase().includes(searchText.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredFriends(filtered);
  };

  // Handle search input change
  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    filterFriends(text);
  };

  useEffect(() => {
    handleInitialSetup();
  }, []);

  // Update filtered friends when friends list changes
  useEffect(() => {
    filterFriends(searchTerm);
  }, [friends]);

  const handleChatPress = (friend: Friend) => {
    router.push({
      pathname: "/(personalChats)/ChatInPerson",
      params: {
        friendId: friend.id,
        friendName: friend.name,
        friendUsername: friend.username,
        friendAvatar: friend.avatar || '',
      }
    });
  };

  const renderChatItem = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={[styles.chatItem, item.unread && styles.unreadChat]}
      onPress={() => handleChatPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.chatCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Image 
              source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${item.name}&backgroundColor=${item.bgColor.replace('#', '')}&fontSize=20&fontWeight=600` }}
              style={styles.avatarImage}
              defaultSource={{ uri: `https://ui-avatars.com/api/?name=${item.name}&background=${item.bgColor.replace('#', '')}&color=fff&size=48&bold=true&format=png&font-size=0.6` }}
            />
          </View>
          {item.isActive && <View style={styles.activeIndicator} />}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{item.name}</Text>
              {item.isActive && (
                <View style={styles.onlineBadge}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Online</Text>
                </View>
              )}
            </View>
            <Text style={styles.time}>{item.lastMessageTime}</Text>
          </View>

          <View style={styles.messageRow}>
            <Text style={styles.message} numberOfLines={1}>
              {item.lastMessage}
            </Text>
            {item.unread && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.username}>@{item.username}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.emptyIconContainer}
      >
        <Ionicons name="chatbubbles-outline" size={60} color="#fff" />
      </LinearGradient>
      <Text style={styles.emptyText}>No Conversations Yet</Text>
      <Text style={styles.emptySubtext}>
        Start chatting with your friends
      </Text>
      <TouchableOpacity
        style={styles.addFriendsButton}
        onPress={() => router.push("/(contacts)/Contacts")}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.addButtonGradient}
        >
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={styles.addFriendsButtonText}>Add Friends</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading && friends.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009BFF" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#667eea" barStyle="light-content" />
      <View style={styles.listHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#667eea" />
           <TextInput
             style={styles.searchInput}
             placeholder="Search conversations..."
             placeholderTextColor="#999"
             value={searchTerm}
             onChangeText={handleSearchChange}
           />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredFriends}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#009BFF']}
            tintColor="#009BFF"
          />
        }
        contentContainerStyle={filteredFriends.length === 0 ? styles.emptyListContent : undefined}
      />

      <GlobalMessage
        type={messageType}
        message={messageText}
        visible={messageVisible}
        onClose={() => setMessageVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // Header Styles
  headerGradient: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical:10
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },

  // Chat Item Styles
  chatItem: {
    marginHorizontal: 12,
    marginVertical: 3,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  unreadChat: {
    backgroundColor: '#f0f4ff',
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },

  // Avatar Styles
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },

  // Chat Content Styles
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginRight: 8,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 4,
  },
  onlineText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    color: '#95a5a6',
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 1,
    lineHeight: 20,
  },
  username: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
  },
  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#667eea',
    marginLeft: 8,
  },

  // Separator
  separator: {
    height: 2,
    backgroundColor: 'transparent',
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },

  // Empty State Styles
  emptyListContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  addFriendsButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 12,
  },
  addFriendsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});