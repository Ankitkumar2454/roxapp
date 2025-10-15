import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { Friend } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';



export default function ChatScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messageVisible, setMessageVisible] = useState(false);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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

  useEffect(() => {
    handleInitialSetup();
  }, []);

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
      activeOpacity={0.7}
    >

      (
      <View style={styles.avatarContainer}>
        <View style={[styles.avatarPlaceholder, { backgroundColor: item.bgColor }]}>
          <Text style={styles.avatarText}>{item.initial}</Text>
        </View>
        {item.isActive && <View style={styles.activeIndicator} />}
      </View>
      )

      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{item.name}</Text>
            {/* {item.isActive && (
              <View style={styles.onlineBadge}>
                <Text style={styles.onlineText}>Online</Text>
              </View>
            )} */}
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
    </TouchableOpacity>
  );

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={80} color="#ccc" />
      <Text style={styles.emptyText}>No Friends Yet</Text>
      <Text style={styles.emptySubtext}>
        Add friends to start chatting
      </Text>
      <TouchableOpacity
        style={styles.addFriendsButton}
        onPress={() => router.push("/(contacts)/Contacts")}
      >
        <Ionicons name="person-add" size={20} color="#fff" />
        <Text style={styles.addFriendsButtonText}>Add Friends</Text>
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
      <View style={styles.listHeader}>
        <Text style={styles.headerTitle}>Your Friends</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or username..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>
      <FlatList
        data={friends}
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
        contentContainerStyle={friends.length === 0 ? styles.emptyListContent : undefined}
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
    backgroundColor: '#fff',
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#000',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  selectedConversation: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  unreadChat: {
    backgroundColor: '#E3F2FD',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  onlineBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  onlineText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  username: {
    fontSize: 12,
    color: '#009BFF',
    marginTop: 2,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00BCD4',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 78,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  addFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#009BFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
    gap: 8,
  },
  addFriendsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});