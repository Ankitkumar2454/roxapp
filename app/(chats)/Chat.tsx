import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { useTheme } from '@/src/hooks/useTheme';
import { ThemeContext } from "@/src/services/ThemeContext";
import { BorderRadius, Spacing, Typography } from '@/src/styles/commonStyles';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Updated interface for chat partners
interface ChatPartner {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  initial: string;
  bgColor: string;
  isActive: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
  unreadCount: number;
  lastMessageStatus: 'sent' | 'delivered' | 'read';
  messageType: 'text' | 'image' | 'audio' | 'document' | 'video';
  isOnline: boolean;
  lastSeen?: string;
}

export default function ChatScreen() {
  const [chatPartners, setChatPartners] = useState<ChatPartner[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messageVisible, setMessageVisible] = useState(false);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredChatPartners, setFilteredChatPartners] = useState<ChatPartner[]>([]);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { isDark, colors, shadows } = useTheme();
  const styles = createStyles(isDark, colors, shadows);
  const getRandomColor = () => {
    const colorPalette = [colors.success, colors.info, colors.warning, colors.secondary, colors.error, colors.primary];
    return colorPalette[Math.floor(Math.random() * colorPalette.length)];
  };

  const showMessage = (type: 'success' | 'error' | 'info', message: string) => {
    setMessageType(type);
    setMessageText(message);
    setMessageVisible(true);
  };

  const fetchChatPartners = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${ENDPOINTS.users.all_chats}`);
      console.log("Fetched chat partners:", response.data.data.chatPartners);

      if (response.data.success && response.data.data) {
        const transformedChatPartners: ChatPartner[] = response.data.data.chatPartners.map((partner: any) => {
          const formatTime = (timestamp: string) => {
            const date = new Date(timestamp);
            const now = new Date();
            const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

            if (diffInHours < 24) {
              return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });
            } else if (diffInHours < 168) { // 7 days
              return date.toLocaleDateString('en-US', { weekday: 'short' });
            } else {
              return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              });
            }
          };

          const getMessageStatus = (status: string) => {
            switch (status) {
              case 'sent': return 'sent';
              case 'delivered': return 'delivered';
              case 'read': return 'read';
              default: return 'sent';
            }
          };

          const getMessageType = (messageType: string) => {
            switch (messageType) {
              case 'image': return 'image';
              case 'audio': return 'audio';
              case 'document': return 'document';
              case 'video': return 'video';
              case 'voice': return 'voice';
              case 'location': return 'location';
              case 'contact': return 'contact';
              case 'sticker': return 'sticker';
              case 'link': return 'link';
              case 'event': return 'event';
              case 'poll': return 'poll';
              case 'file': return 'file';
              default: return 'text';
            }
          };

          // Use unreadCount from API response
          const isUnread = partner.unreadCount > 0;

          return {
            id: partner.userId,
            name: partner.userName || partner.userUsername,
            username: partner.userUsername,
            avatar: partner.userProfileImage || undefined,
            initial: (partner.userName || partner.userUsername).charAt(0).toUpperCase(),
            bgColor: getRandomColor(),
            isActive: partner.userIsOnline || false,
            lastMessage: partner.lastMessage?.content || "No messages yet",
            lastMessageTime: formatTime(partner.lastMessageTime),
            unread: isUnread,
            unreadCount: partner.unreadCount || 0,
            lastMessageStatus: getMessageStatus(partner.lastMessage?.status),
            messageType: getMessageType(partner.lastMessage?.messageType),
            isOnline: partner.userIsOnline || false,
            lastSeen: partner.userIsOnline ? 'Online' : formatTime(partner.lastMessageTime),
          };
        });

        setChatPartners(transformedChatPartners);
        setFilteredChatPartners(transformedChatPartners);
      }
    } catch (error: any) {
      console.log("Error fetching chat partners:", error);
      showMessage("error", error?.response?.data?.message || "Failed to load chats");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChatPartners();
    setRefreshing(false);
  };

  const handleInitialSetup = async () => {
    await fetchChatPartners();
  };

  const filterChatPartners = (searchText: string) => {
    if (!searchText.trim()) {
      setFilteredChatPartners(chatPartners);
      return;
    }

    const filtered = chatPartners.filter(partner =>
      partner.name.toLowerCase().includes(searchText.toLowerCase()) ||
      partner.username.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredChatPartners(filtered);
  };

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    filterChatPartners(text);
  };

  useEffect(() => {
    handleInitialSetup();
  }, []);

  useEffect(() => {
    filterChatPartners(searchTerm);
  }, [chatPartners]);

  const handleChatPress = (partner: ChatPartner) => {
    router.push({
      pathname: "/(personalChats)/ChatInPerson",
      params: {
        friendId: partner.id,
        friendName: partner.name,
        friendUsername: partner.username,
        friendAvatar: partner.avatar || '',
      }
    });
  };

  const renderChatItem = ({ item, index }: { item: ChatPartner; index: number }) => {
    const messageType = item.messageType;
    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'sent': return 'checkmark';
        case 'delivered': return 'checkmark-done';
        case 'read': return 'checkmark-done';
        default: return 'checkmark';
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'sent': return colors.textSecondary;
        case 'delivered': return colors.textSecondary;
        case 'read': return colors.primary;
        default: return colors.textSecondary;
      }
    };
    console.log(item, "item.lastMessage")

    return (
      <TouchableOpacity
        style={styles.chatItemTouchable}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${item.name}&backgroundColor=${item.bgColor.replace('#', '')}&fontSize=20&fontWeight=600` }}
            style={styles.avatarImage}
            defaultSource={{ uri: `https://ui-avatars.com/api/?name=${item.name}&background=${item.bgColor.replace('#', '')}&color=fff&size=48&bold=true&format=png&font-size=0.6` }}
          />
          {/* Online Status Indicator */}
          <View style={[
            styles.onlineIndicator,
            { backgroundColor: item.isOnline ? colors.success : colors.textSecondary }
          ]} />

          {/* Message Type Indicator */}
          {messageType !== 'text' && (
            <View style={styles.messageTypeIndicator}>
              <Ionicons
                name={
                  messageType === 'image' ? 'image' :
                    messageType === 'audio' ? 'musical-notes' :
                      messageType === 'document' ? 'document-text' : 'chatbubble'
                }
                size={12}
                color={colors.textLight}
              />
            </View>
          )}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <View style={styles.nameContainer}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {item.isOnline && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.time}>{item.lastMessageTime}</Text>
              {item.unread && item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.messageRow}>
            <View style={styles.messageContainer}>
              <Text style={styles.message} numberOfLines={1}>
                {/* {console.log(item.lastMessage, "item.lastMessage")} */}
                {messageType === 'image' ? '📷 Photo' :
                  messageType === 'audio' ? '🎵 Audio' :
                    messageType === 'video' ? '📹 Video' :
                    messageType === 'document' ? '📄 Document' :
                  item.lastMessage}
              </Text>
            </View>
            <View style={styles.statusContainer}>
              <Ionicons
                name={getStatusIcon(item.lastMessageStatus)}
                size={16}
                color={getStatusColor(item.lastMessageStatus)}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.emptyIconContainer}
      >
        <Ionicons name="chatbubbles-outline" size={60} color={colors.white} />
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
          colors={[colors.primary, colors.primaryDark]}
          style={styles.addButtonGradient}
        >
          <Ionicons name="person-add" size={20} color={colors.white} />
          <Text style={styles.addFriendsButtonText}>Add Friends</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading && chatPartners.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme === "dark" ? colors.background : "transparent"}
        translucent={true}
      />
      <View style={styles.listHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={colors.textLight}
            value={searchTerm}
            onChangeText={handleSearchChange}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={20} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredChatPartners}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={filteredChatPartners.length === 0 ? styles.emptyListContent : undefined}
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

const createStyles = (isDark: boolean, colors: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as any,

  // Header Styles
  headerGradient: {
    paddingTop: 0,
    paddingBottom: 0,
  } as any,
  listHeader: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md
  } as any,
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  } as any,

  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  } as any,

  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius['2xl'],
    paddingHorizontal: Spacing.lg,
    height: 50,
    ...shadows.md,
  } as any,
  searchInput: {
    flex: 1,
    marginLeft: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
  } as any,

  // Chat Item Styles
  chatItemTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderBottomWidth: 0,
    ...shadows.sm,
  } as any,

  // Avatar Styles
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.lg,
  } as any,
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.border,
  } as any,
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.surface,
  } as any,
  messageTypeIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  } as any,

  // Chat Content Styles
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  } as any,
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  } as any,
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  } as any,
  name: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: colors.textPrimary,
    marginRight: Spacing.sm,
  } as any,
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  } as any,
  timeContainer: {
    alignItems: 'flex-end',
  } as any,
  time: {
    fontSize: Typography.fontSize.xs,
    color: colors.textLight,
    fontWeight: Typography.fontWeight.normal as any,
    marginBottom: Spacing.xs,
  } as any,
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as any,
  messageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  } as any,
  statusContainer: {
    marginLeft: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  message: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
    fontWeight: Typography.fontWeight.normal as any,
  } as any,
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginTop: 4,
  } as any,
  unreadText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: Typography.fontWeight.bold as any,
    textAlign: 'center',
  } as any,
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: Spacing.sm,
  } as any,


  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  } as any,
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium as any,
  } as any,

  // Empty State Styles
  emptyListContent: {
    flexGrow: 1,
  } as any,
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 120,
    paddingHorizontal: 40,
  } as any,
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  } as any,
  emptyText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  } as any,
  emptySubtext: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    // lineHeight: Typography.lineHeight.relaxed,
    marginBottom: Spacing['2xl'],
  } as any,
  addFriendsButton: {
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
  } as any,
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  } as any,
  addFriendsButtonText: {
    color: colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
  } as any,
});