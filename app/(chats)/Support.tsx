import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
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
  View
} from 'react-native';
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
      style={[
        styles.conversationItem,
        selectedConversation?.id === item.id && styles.selectedConversation,
      ]}
      onPress={() => handleConversationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>{item.customerName.charAt(0).toUpperCase()}</Text>
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Ionicons name={getStatusIcon(item.status) as any} size={12} color={getStatusColor(item.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
          <View style={styles.timeAndUnread}>
            <Text style={styles.time}>{item.lastMessageTime}</Text>
            {item.unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread}</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.phoneNumber}> {maskPhoneNumber(item.phoneNumber)}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.direction === 'outgoing' ? 'You: ' : ''}{item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderMessageBubble = ({ item }: { item: Message }) => {
    const isSupport = item.sender === 'support';
    return (
      <View style={[styles.messageBubbleContainer, isSupport ? styles.supportBubble : styles.customerBubble]}>
        <View
          style={[
            styles.messageBubble,
            isSupport ? styles.supportMessage : styles.customerMessage,
          ]}
        >
          <Text style={[styles.messageText, isSupport && styles.supportMessageText]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isSupport ? styles.supportMessageTime : styles.customerMessageTime]}>
              {item.timestamp}
            </Text>
            {isSupport && item.status && (
              <View style={styles.messageStatusContainer}>
                {item.status === 'sending' && (
                  <ActivityIndicator size="small" color="#e0e0e0" style={styles.messageStatusIcon} />
                )}
                {item.status === 'sent' && (
                  <Ionicons name="checkmark-done" size={16} color="#e0e0e0" style={styles.messageStatusIcon} />
                )}
                {item.status === 'failed' && (
                  <Ionicons name="alert-circle" size={16} color="#ff6b6b" style={styles.messageStatusIcon} />
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

  if ((loading || !wsConnected) && conversations.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#009BFF" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }
  return (

    <View style={styles.container}>
      {selectedConversation ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={130}
          style={{ flex: 1 }}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => {
              setSelectedConversation(null);
              setMessages([]);
            }}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.chatHeaderContent}>
              <Text style={styles.chatHeaderName}>{selectedConversation.customerName}</Text>
              <Text style={styles.chatHeaderPhone}>
                {maskPhoneNumber(selectedConversation.phoneNumber)}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedConversation.status) + '20' }]}>
              <Ionicons
                name={getStatusIcon(selectedConversation.status) as any}
                size={14}
                color={getStatusColor(selectedConversation.status)}
              />
              <Text style={[styles.statusText, { color: getStatusColor(selectedConversation.status) }]}>
                {selectedConversation.status.charAt(0).toUpperCase() + selectedConversation.status.slice(1)}
              </Text>
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
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Type your response..."
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
              {/* <Text style={styles.headerTitle}>Support Messages</Text> */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or number..."
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
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
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
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
  },
  selectedConversation: {
    backgroundColor: '#f0f8ff',
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
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
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
  },
  timeAndUnread: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#009BFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  phoneNumber: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#999',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginLeft: 78,
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
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  emptyListContent: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chatHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '600',
  },
  chatHeaderPhone: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  loadingMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 14,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  messageBubbleContainer: {
    marginVertical: 4,
    width: '100%',
  },
  supportBubble: {
    alignItems: 'flex-end',
  },
  customerBubble: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  supportMessage: {
    backgroundColor: '#009BFF',
    borderBottomRightRadius: 4,
  },
  customerMessage: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
  supportMessageText: {
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#666',
  },
  supportMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  customerMessageTime: {
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
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
    // marginBottom: 60

  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,

  },
  sendButton: {
    marginLeft: 10,

    borderRadius: 20,
    padding: 10,
    backgroundColor: '#009BFF',
    // justifyContent: 'center',
    // alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
});