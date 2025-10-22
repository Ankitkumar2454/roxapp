import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { darkTheme, lightTheme } from "@/src/constants/color";
import { ThemeContext } from "@/src/services/ThemeContext";
import { Friend } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
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
  const { theme, toggleTheme } = useContext(ThemeContext);
  const currentTheme = theme === 'dark' ? darkTheme : lightTheme;
  const styles = createStyles(currentTheme);
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
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${item.name}&backgroundColor=${item.bgColor.replace('#', '')}&fontSize=20&fontWeight=600` }}
            style={styles.avatarImage}
            defaultSource={{ uri: `https://ui-avatars.com/api/?name=${item.name}&background=${item.bgColor.replace('#', '')}&color=fff&size=48&bold=true&format=png&font-size=0.6` }}
          />
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.time}>{item.lastMessageTime}</Text>
          </View>
          <View style={styles.messageRow}>
            <Text style={styles.message} numberOfLines={1}>
              {item.lastMessage}
            </Text>
            {item.unread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>1</Text>
              </View>
            )}
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
      {/* <StatusBar backgroundColor="#667eea" barStyle="light-content" /> */}
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={currentTheme.background}
      />
      <View style={styles.listHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#667eea" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={currentTheme.placeholderText}
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

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },

  // Header Styles
  headerGradient: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
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
    backgroundColor: theme.searchBackground,
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 50,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: theme.searchInputText,
  },

  // Chat Item Styles
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: theme.chatItemBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    //borderWidth: 0.5,
    //marginVertical: 1,
    borderBottomColor: theme.chatItemBorder,
    //elevation: 1
  },

  // Avatar Styles
  avatarContainer: {
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },

  // Chat Content Styles
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '500',
    color: theme.primaryText,
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: theme.tertiaryText,
    fontWeight: '400',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    color: theme.tertiaryText,
    flex: 1,
    fontWeight: '400',
  },
  unreadBadge: {
    backgroundColor: theme.unreadBadgeBackground,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },


  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.emptyStateSubtext,
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
    color: theme.emptyStateText,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: theme.emptyStateSubtext,
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