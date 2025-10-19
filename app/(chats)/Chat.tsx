import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { Friend } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
export default function ChatScreen() {
  const insets = useSafeAreaInsets();
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
        console.log(response.data.data, "currentUserData")

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

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    filterFriends(text);
  };

  useEffect(() => {
    handleInitialSetup();
  }, []);

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

  const renderChatItem = ({ item }: { item: Friend }) => {

    return (
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
            {/* {isOnline && <View style={styles.activeIndicator} />} */}
          </View>

          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <View style={styles.nameContainer}>
                <Text style={styles.name}>{item.name}</Text>
              </View>
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
  };

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['#009BFF', '#0066CC']}
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
          colors={['#009BFF', '#0066CC']}
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
        contentContainerStyle={filteredFriends.length === 0 ? styles.emptyListContent : {
          paddingBottom: insets.bottom + 67// 60 = tab bar height
        }}
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
    paddingHorizontal: screenWidth * 0.05,
    paddingVertical: screenHeight * 0.012,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: screenWidth * 0.07,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  addButton: {
    width: screenWidth * 0.1,
    height: screenWidth * 0.1,
    borderRadius: screenWidth * 0.05,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: screenWidth * 0.07,
    paddingHorizontal: screenWidth * 0.04,
    height: screenHeight * 0.06,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: screenWidth * 0.03,
    fontSize: screenWidth * 0.04,
    color: '#333',
  },

  // Chat Item Styles
  chatItem: {
    marginHorizontal: screenWidth * 0.03,
    marginVertical: screenHeight * 0.004,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: screenWidth * 0.03,
    padding: screenWidth * 0.03,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  unreadChat: {
    backgroundColor: '#f0f4ff',
    borderLeftWidth: screenWidth * 0.01,
    borderLeftColor: '#667eea',
  },

  // Avatar Styles
  avatarContainer: {
    position: 'relative',
    marginRight: screenWidth * 0.03,
  },
  avatarPlaceholder: {
    width: screenWidth * 0.12,
    height: screenWidth * 0.12,
    borderRadius: screenWidth * 0.06,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: screenWidth * 0.06,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: screenHeight * 0.002,
    right: screenWidth * 0.005,
    width: screenWidth * 0.03,
    height: screenWidth * 0.03,
    borderRadius: screenWidth * 0.015,
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
    marginBottom: screenHeight * 0.005,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  name: {
    fontSize: screenWidth * 0.045,
    fontWeight: '600',
    color: '#2c3e50',
    marginRight: screenWidth * 0.02,
  },
  time: {
    fontSize: screenWidth * 0.03,
    color: '#95a5a6',
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenHeight * 0.004,
  },
  message: {
    fontSize: screenWidth * 0.035,
    color: '#7f8c8d',
    flex: 1,
    lineHeight: screenHeight * 0.025,
  },
  username: {
    fontSize: screenWidth * 0.03,
    color: '#667eea',
    fontWeight: '500',
  },
  unreadDot: {
    width: screenWidth * 0.03,
    height: screenWidth * 0.03,
    borderRadius: screenWidth * 0.015,
    backgroundColor: '#667eea',
    marginLeft: screenWidth * 0.02,
  },

  // Separator
  separator: {
    height: screenHeight * 0.002,
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
    marginTop: screenHeight * 0.02,
    fontSize: screenWidth * 0.04,
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
    paddingVertical: screenHeight * 0.1,
    paddingHorizontal: screenWidth * 0.1,
  },
  emptyIconContainer: {
    width: screenWidth * 0.3,
    height: screenWidth * 0.3,
    borderRadius: screenWidth * 0.15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: screenHeight * 0.03,
  },
  emptyText: {
    fontSize: screenWidth * 0.06,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: screenHeight * 0.01,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: screenWidth * 0.04,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: screenHeight * 0.03,
    marginBottom: screenHeight * 0.04,
  },
  addFriendsButton: {
    borderRadius: screenWidth * 0.08,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.08,
    paddingVertical: screenHeight * 0.02,
    gap: screenWidth * 0.03,
  },
  addFriendsButtonText: {
    color: '#fff',
    fontSize: screenWidth * 0.04,
    fontWeight: '600',
  },
});