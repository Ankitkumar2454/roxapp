import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { darkTheme, lightTheme } from "@/src/constants/color";
import { ThemeContext } from "@/src/services/ThemeContext";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io, Socket } from 'socket.io-client';

// Updated types based on new API response
interface ApiConversation {
  _id: string;
  phoneNumber: string;
  profileName: string;
  waId: string;
  lastMessage: {
    content: string;
    messageType: string;
    timestamp: string;
    direction: 'incoming' | 'outgoing';
  };
  unreadCount: number;
  lastMessageAt: string;
}

interface ApiMessage {
  _id: string;
  messageId: string;
  from: string;
  content: string;
  messageType: string;
  timestamp: string;
  platform: string;
  direction: 'incoming' | 'outgoing';
  metadata: {
    profileName: string;
    waId: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  sender: 'customer' | 'support';
  text: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'failed';
}

interface Conversation {
  id: string;
  waId: string;
  phoneNumber: string;
  customerName: string;
  lastMessage: string;
  messageType: string;
  direction: 'incoming' | 'outgoing';
  lastMessageTime: string;
  timestamp: string;
  unread: number;
  status: 'active' | 'resolved' | 'pending';
  messages: Message[];
}

export default function SupportScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messageVisible, setMessageVisible] = useState(false);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [messageText, setMessageText] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const ws = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const reconnectTimeout = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const screenHeight = useWindowDimensions().height;

  const { theme, toggleTheme } = useContext(ThemeContext);
  const currentTheme = theme === 'dark' ? darkTheme : lightTheme;
  const styles = createStyles(currentTheme);



  const navigation = useNavigation();

  const showMessage = (type: 'success' | 'error' | 'info', message: string) => {
    setMessageType(type);
    setMessageText(message);
    setMessageVisible(true);
  };

  const formatTimestamp = (timestamp: string): string => {
    const now = new Date();
    const msgDate = new Date(timestamp);
    const diffMs = now.getTime() - msgDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return msgDate.toLocaleDateString();
  };

  const determineStatus = (direction: string, lastMessageTime: string, unreadCount: number): 'active' | 'resolved' | 'pending' => {
    const diffMins = Math.floor((new Date().getTime() - new Date(lastMessageTime).getTime()) / 60000);

    if (direction === 'incoming' && unreadCount > 0) {
      return 'active';
    }
    else if (direction === 'outgoing' && unreadCount === 0) {
      return 'resolved';
    }
    else if (direction === 'incoming' && diffMins > 30) {
      return 'pending';
    }

    return 'active';
  };

  const transformApiToConversations = (apiConversations: ApiConversation[]): Conversation[] => {
    return apiConversations.map((conv) => ({
      id: conv._id,
      waId: conv.waId,
      phoneNumber: conv.phoneNumber,
      customerName: conv.profileName || 'Unknown',
      lastMessage: conv.lastMessage.content,
      messageType: conv.lastMessage.messageType,
      direction: conv.lastMessage.direction,
      lastMessageTime: formatTimestamp(conv.lastMessage.timestamp),
      timestamp: conv.lastMessage.timestamp,
      unread: conv.unreadCount,
      status: determineStatus(conv.lastMessage.direction, conv.lastMessage.timestamp, conv.unreadCount),
      messages: [
        {
          id: '1',
          sender: conv.lastMessage.direction === 'incoming' ? 'customer' : 'support',
          text: conv.lastMessage.content,
          timestamp: new Date(conv.lastMessage.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
        }
      ],
    }));
  };

  const transformApiMessages = (apiMessages: ApiMessage[]): Message[] => {
    if (!Array.isArray(apiMessages) || apiMessages.length === 0) {
      return [];
    }

    return apiMessages.map((msg) => ({
      id: msg._id || msg.messageId || Math.random().toString(),
      sender: msg.direction === 'incoming' ? 'customer' : 'support',
      text: msg.content || '',
      timestamp: new Date(msg.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: 'sent'
    }));
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await api.get(ENDPOINTS.whatsappchats.getAllChats);

      if (response.data?.data?.conversations) {
        const transformedConversations = transformApiToConversations(response.data.data.conversations);
        console.log('Transformed conversations:', transformedConversations);
        setConversations(transformedConversations);
      } else {
        console.warn('Unexpected API response structure:', response.data);
        showMessage('error', 'Unexpected data format from server');
      }
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      showMessage('error', error?.response?.data?.message || error?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  const handleConversationPress = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setLoadingMessages(true);

    try {
      const URL = `${ENDPOINTS.whatsappchats.getChatHistory}/${conversation.waId}`;
      console.log('Fetching chat history from:', URL);

      const response = await api.get(URL);
      console.log('Chat history response:', response.data);

      if (response.data?.success && response.data?.data?.messages) {
        const apiMessages: ApiMessage[] = response.data.data.messages;
        console.log('Raw API messages:', apiMessages);

        if (Array.isArray(apiMessages) && apiMessages.length > 0) {
          const transformedMessages = transformApiMessages(apiMessages);
          console.log('Transformed messages:', transformedMessages);
          setMessages(transformedMessages);
        } else {
          console.log('No messages found, using conversation messages');
          setMessages(conversation.messages);
        }
      } else {
        console.warn('Unexpected message response structure:', response.data);
        setMessages(conversation.messages);
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      console.error('Error details:', error.response?.data);
      showMessage('error', 'Failed to load chat history');
      setMessages(conversation.messages);
    } finally {
      setLoadingMessages(false);
    }

    // Mark conversation as read
    const updatedConversations = conversations.map(conv => {
      if (conv.id === conversation.id) {
        return { ...conv, unread: 0, status: 'resolved' as const };
      }
      return conv;
    });
    setConversations(updatedConversations);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedConversation || sendingMessage) return;

    const messageContent = inputValue.trim();
    const tempId = `temp-${Date.now()}`;

    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      sender: 'support',
      text: messageContent,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: 'sending'
    };

    // Add message to UI immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setInputValue('');
    setSendingMessage(true);
    const msg = {
      receiverId: selectedConversation.waId,
      content: messageContent,
      messageType: 'text',
      profileName: selectedConversation.customerName
    }

    try {

      if (ws.current?.connected) {
        ws.current.emit('whatsapp:send', msg);

        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempId
              ? { ...msg, status: 'sent' as const }
              : msg
          )
        );

        // Update conversation in list
        setConversations(prev => {
          const updatedConversations = prev.map(conv => {
            if (conv.id === selectedConversation.id) {
              return {
                ...conv,
                lastMessage: messageContent,
                lastMessageTime: 'just now',
                timestamp: new Date().toISOString(),
                direction: 'outgoing' as const,
              };
            }
            return conv;
          });

          // Move conversation to top
          const convIndex = updatedConversations.findIndex(c => c.id === selectedConversation.id);
          if (convIndex > 0) {
            const [movedConv] = updatedConversations.splice(convIndex, 1);
            return [movedConv, ...updatedConversations];
          }
          return updatedConversations;
        });

        // Update selected conversation
        setSelectedConversation(prev => {
          if (prev) {
            return {
              ...prev,
              lastMessage: messageContent,
              lastMessageTime: 'just now',
              timestamp: new Date().toISOString(),
              direction: 'outgoing' as const,
            };
          }
          return prev;
        });

      } else {
        throw new Error('WebSocket not connected');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      showMessage('error', 'Failed to send message');

      // Update message status to failed
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId
            ? { ...msg, status: 'failed' as const }
            : msg
        )
      );
    } finally {
      setSendingMessage(false);
      Keyboard.dismiss();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.phoneNumber.includes(searchTerm) ||
    conv.waId.includes(searchTerm)
  );

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return '#2196F3';
      case 'resolved':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'active':
        return 'chatbubble';
      case 'resolved':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      default:
        return 'alert-circle';
    }
  };
  const maskPhoneNumber = (number: any) => {
    if (!number) return '';
    const lastThree = number.slice(-3);
    const masked = '*'.repeat(number.length - 3);
    return masked + lastThree;
  };


  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleConversationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>{item.customerName.charAt(0).toUpperCase()}</Text>
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.customerName} numberOfLines={1}>{item.customerName}</Text>
          <Text style={styles.time}>{item.lastMessageTime}</Text>
        </View>
        <View style={styles.conversationMessageRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.direction === 'outgoing' ? 'You: ' : ''}{item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMessageBubble = ({ item }: { item: Message }) => {
    const isSupport = item.sender === 'support';
    return (
      <View style={[styles.messageRow, isSupport ? styles.messageRight : styles.messageLeft]}>
        {!isSupport && (
          <View style={styles.msgAvatarContainer}>
            <View style={styles.msgAvatarPlaceholder}>
              <Text style={styles.msgAvatarText}>{selectedConversation?.customerName?.charAt(0)?.toUpperCase()}</Text>
            </View>
          </View>
        )}
        <View style={[styles.messageBubble, isSupport ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isSupport ? styles.myText : styles.theirText]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.msgTime, isSupport ? styles.myTime : styles.theirTime]}>
              {item.timestamp}
            </Text>
            {isSupport && item.status && (
              <View style={styles.messageStatusContainer}>
                {item.status === 'sending' && (
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" style={styles.messageStatusIcon} />
                )}
                {item.status === 'sent' && (
                  <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.7)" style={styles.messageStatusIcon} />
                )}
                {item.status === 'failed' && (
                  <Ionicons name="alert-circle" size={14} color="#ff6b6b" style={styles.messageStatusIcon} />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={80} color="#ccc" />
      <Text style={styles.emptyText}>No Support Conversations</Text>
      <Text style={styles.emptySubtext}>Messages from customers will appear here</Text>
    </View>
  );

  const handleWebSocketMessage = (event: any) => {
    const data = event;

    console.log('Received WebSocket message:', data);

    if (!data || !data.messageId) {
      console.warn('⚠️ Invalid WhatsApp message format:', data);
      return;
    }

    const waId = data.metadata?.waId;
    const profileName = data.metadata?.profileName || 'Unknown';

    const newMessage: Message = {
      id: data.messageId,
      sender: data.direction === 'incoming' ? 'customer' : 'support',
      text: data.content,
      timestamp: new Date(data.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: 'sent'
    };

    setConversations(prev => {
      const existingConvIndex = prev.findIndex(c => c.waId === waId);

      if (existingConvIndex !== -1) {
        const updatedConversations = [...prev];
        const existingConv = updatedConversations[existingConvIndex];

        updatedConversations[existingConvIndex] = {
          ...existingConv,
          lastMessage: data.content,
          lastMessageTime: formatTimestamp(data.timestamp),
          timestamp: data.timestamp,
          direction: data.direction,
          unread: data.direction === 'incoming'
            ? existingConv.unread + 1
            : existingConv.unread,
          status: determineStatus(
            data.direction,
            data.timestamp,
            data.direction === 'incoming' ? existingConv.unread + 1 : existingConv.unread
          ),
          messages: [...existingConv.messages, newMessage],
        };

        const [updated] = updatedConversations.splice(existingConvIndex, 1);
        return [updated, ...updatedConversations];
      } else {
        const newConversation: Conversation = {
          id: waId,
          waId,
          phoneNumber: data.from,
          customerName: profileName,
          lastMessage: data.content,
          messageType: data.messageType,
          direction: data.direction,
          lastMessageTime: formatTimestamp(data.timestamp),
          timestamp: data.timestamp,
          unread: data.direction === 'incoming' ? 1 : 0,
          status: determineStatus(
            data.direction,
            data.timestamp,
            data.direction === 'incoming' ? 1 : 0
          ),
          messages: [newMessage],
        };

        return [newConversation, ...prev];
      }
    });

    setSelectedConversation(prev => {
      if (prev && prev.waId === waId) {
        setMessages(prevMessages => [...prevMessages, newMessage]);

        return {
          ...prev,
          lastMessage: data.content,
          lastMessageTime: formatTimestamp(data.timestamp),
          timestamp: data.timestamp,
          direction: data.direction,
        };
      }
      return prev;
    });

    if (data.direction === 'incoming') {
      showMessage('info', `New message from ${profileName}`);
    }
  };

  const connectWebSocket = async () => {
    try {
      console.log("Attempting to connect to WebSocket...");

      const token = await Storage.getItem("accessToken");
      const userData = await Storage.getItem("user");
      if (!token || !userData) return;

      ws.current = io(ENDPOINTS.socket, {
        auth: { token },
        reconnection: true,
        transports: ["websocket"],
      });

      ws.current.on("connect", () => {
        console.log("✅ WebSocket connected successfully!");
        setWsConnected(true);
      });

      ws.current.on("disconnect", (reason) => {
        console.warn("⚠️ WebSocket disconnected:", reason);
        setWsConnected(false);
      });

      ws.current.on("connect_error", (error) => {
        console.error("❌ WebSocket connection failed:", error.message);
        setWsConnected(false);
      });

      ws.current.on("reconnect_attempt", (attemptNumber) => {
        console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
      });

      ws.current.on("reconnect", (attemptNumber) => {
        console.log(`✅ Reconnected after ${attemptNumber} attempts`);
        setWsConnected(true);
      });

      ws.current.on("whatsapp:notification", handleWebSocketMessage);

    } catch (error) {
      console.error("Error setting up WebSocket:", error);
    }
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
        setWsConnected(false);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      // Hide tab bar when chat is open
      navigation.setOptions({
        tabBarStyle: { display: 'none' },
        headerShown: false
      });
    } else {
      // Show tab bar when on conversation list
      navigation.setOptions({
        tabBarStyle: {
          backgroundColor: currentTheme.cardBackground,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          // paddingBottom: 8,
          shadowColor: currentTheme.shadowColor,
          // shadowOffset: { width: 0, height: -2 },
          // shadowOpacity: 0.1,
          shadowRadius: 8,
          borderWidth: 1,
          borderColor: currentTheme.chatItemBorder,
          elevation: 5,
        },
        headerShown: true
      });
    }
  }, [selectedConversation, navigation , currentTheme]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  if ((loading || !wsConnected) && conversations.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009BFF" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {selectedConversation ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={10}
          style={{ flex: 1 }}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity
              onPress={() => {
                setSelectedConversation(null);
                setMessages([]);
              }}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{selectedConversation.customerName.charAt(0).toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.friendName}>{selectedConversation.customerName}</Text>
                <Text style={styles.statusText}>
                  {maskPhoneNumber(selectedConversation.phoneNumber)}
                </Text>
              </View>
            </View>
            <View style={styles.headerIcons}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedConversation.status) + '20' }]}>
                <Ionicons
                  name={getStatusIcon(selectedConversation.status) as any}
                  size={12}
                  color={getStatusColor(selectedConversation.status)}
                />
                <Text style={[styles.statusText, { color: getStatusColor(selectedConversation.status) }]}>
                  {selectedConversation.status.charAt(0).toUpperCase() + selectedConversation.status.slice(1)}
                </Text>
              </View>
            </View>
          </View>
          {loadingMessages ? (
            <View style={styles.loadingMessagesContainer}>
              <ActivityIndicator size="large" color="#009BFF" />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : (<>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessageBubble}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={() => (
                <View style={styles.noMessagesContainer}>
                  <Text style={styles.noMessagesText}>No messages yet</Text>
                </View>
              )}
            />
            <View style={[styles.inputContainer]}>
              <TextInput
                style={[styles.textInput, { marginBottom: keyboardVisible ? 0.34 : 1 }]}
                placeholder="Type your response..."
                placeholderTextColor={currentTheme.placeholderText}
                value={inputValue}
                onChangeText={setInputValue}
                multiline
                maxLength={500}
                editable={!sendingMessage}
                onSubmitEditing={handleSendMessage}
                blurOnSubmit={false}

              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (sendingMessage || !inputValue.trim()) && styles.sendButtonDisabled
                ]}
                onPress={handleSendMessage}
                disabled={sendingMessage || !inputValue.trim()}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>


          </>
          )}


        </KeyboardAvoidingView>

      ) :
        (
          <View style={styles.mainContainer}>
            <View style={styles.listHeader}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or number..."
                  placeholderTextColor={currentTheme.placeholderText}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
                {searchTerm.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchTerm('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <FlatList
              data={filteredConversations}
              renderItem={renderConversationItem}
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
              contentContainerStyle={filteredConversations.length === 0 ? styles.emptyListContent : undefined}
            />
          </View>
        )}

      <GlobalMessage
        type={messageType}
        message={messageText}
        visible={messageVisible}
        onClose={() => setMessageVisible(false)}
      />
    </SafeAreaView>

  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  mainContainer: {
    flex: 1,
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10
  },
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
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: theme.chatItemBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    // marginVertical: 1,
    borderBottomColor: theme.chatItemBorder,
    // elevation: 2
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#009BFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerName: {
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
  conversationMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
    color: theme.secondaryText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.emptyStateText,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.emptyStateSubtext,
    marginTop: 8,
  },
  emptyListContent: {
    flex: 1,
  },

  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: theme.chatItemBackground,
    borderRadius: 45,
    marginHorizontal: 10,
    marginTop: 25,
    elevation: 4,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    // borderWidth: 1,
    borderColor: theme.inputBorder,

  },
  backButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: 12,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    marginLeft: 8,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primaryText,
  },
  avatarContainer: {
    position: 'relative',
  },
  loadingMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingVertical: 12,
    flexGrow: 1,
    marginTop: 8,
    paddingBottom: 20,
    backgroundColor: theme.cardBackground,
    // borderWidth: 1,
    borderColor: theme.inputBorder,
    borderRadius: 12,
    marginHorizontal: 10,
    marginBottom: 2,

  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
    paddingHorizontal: 10,
  },
  messageLeft: {
    justifyContent: 'flex-start',
    width: '100%',
  },
  messageRight: {
    justifyContent: 'flex-end',
    width: '100%',
  },
  msgAvatarContainer: {
    marginRight: 8,
  },
  msgAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#009BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myBubble: {
    backgroundColor: '#2196F3',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: '#fff',
  },
  theirText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  msgTime: {
    fontSize: 10,
    textAlign: 'right',
  },
  myTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  theirTime: {
    color: '#999',
  },
  messageStatusContainer: {
    marginLeft: 4,
  },
  messageStatusIcon: {
    marginLeft: 2,
  },
  noMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noMessagesText: {
    fontSize: 14,
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.cardBackground,
    marginHorizontal: 10,
    marginVertical: 7,
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: theme.shadowColor,
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.inputBorder,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingHorizontal: 10,
    color: theme.inputText,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
});