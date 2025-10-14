import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import io, { Socket } from 'socket.io-client';

interface Message {
    _id?: string;
    id: string;
    senderId: string;
    sender?: {
        _id: string;
        username: string;
        fullName: string;
        profileImage?: string;
    };
    text: string;
    content: string;
    time: string;
    isSent: boolean;
    isDelivered?: boolean;
    isRead?: boolean;
}

const SOCKET_URL = "ws://polobet247.in";

export default function ChatMessageScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState('');

    const scrollViewRef = useRef<ScrollView>(null);
    const socketRef = useRef<Socket | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);

    const friendId = params.friendId as string;
    const friendName = params.friendName as string;
    const friendAvatar = params.friendAvatar as string;
    const friendUsername = params.friendUsername as string;

    // Fetch previous chat messages
    const fetchPreviousMessages = async (userId: string, friendId: string) => {
        try {
            const response = await api.get(`${ENDPOINTS.chat.previous_message}/${friendId}/history`);
            console.log(response, "response");
            
            // Updated path to access messages array
            if (response.data.success && response.data.data?.result?.messages) {
                const formattedMessages: Message[] = response.data.data.result.messages.map((msg: any) => ({
                    _id: msg._id,
                    id: msg._id,
                    senderId: msg.sender._id,
                    sender: msg.sender,
                    text: msg.content,
                    content: msg.content,
                    time: formatTime(msg.createdAt),
                    isSent: msg.sender._id === userId,
                    isDelivered: msg.status === 'delivered' || msg.status === 'read',
                    isRead: msg.status === 'read',
                }));

                setMessages(formattedMessages);
                setTimeout(() => scrollToEnd(), 300);
            }
        } catch (error) {
            console.error('Error fetching previous messages:', error);
        }
    };

    // Initialize socket connection
    const initializeSocket = async () => {
        try {
            const token = await Storage.getItem("accessToken");
            const userData = await Storage.getItem("user");

            if (!token || !userData) {
                console.error('No authentication data');
                return;
            }

            setCurrentUserId(userData.id);
            console.log(userData , "user")

            // Fetch previous messages first
            await fetchPreviousMessages(userData.id, friendId);

            socketRef.current = io(SOCKET_URL, {
                auth: {
                    token: token,
                },
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5,
                transports: ['websocket'],
            });

            socketRef.current.on('connect', () => {
                console.log('Socket connected');
            });

            // Receive incoming messages
            socketRef.current.on('message:receive', (data) => {
                console.log('Message received:', data);
                handleIncomingMessage(data);
            });

            // Message delivery confirmation
            socketRef.current.on('message:delivered', (data) => {
                console.log('Message delivered:', data);
                updateMessageStatus(data.messageId, 'delivered');
            });

            // Message read receipt
            socketRef.current.on('message:read', (data) => {
                console.log('Message read:', data);
                updateMessageStatus(data.messageId, 'read');
            });

            // Message sent confirmation
            socketRef.current.on('message:sent', (data) => {
                console.log('Message sent:', data);
                // Update local message with server _id
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === data._id.toString() || msg.senderId === data.sender._id
                            ? { ...msg, _id: data._id, id: data._id }
                            : msg
                    )
                );
            });

            // Typing indicators
            socketRef.current.on('typing:start', (data) => {
                if (data.userId !== userData._id) {
                    setIsTyping(true);
                }
            });

            socketRef.current.on('typing:stop', (data) => {
                if (data.userId !== userData._id) {
                    setIsTyping(false);
                }
            });

            // Error handling
            socketRef.current.on('connect_error', (error) => {
                console.error('Socket error:', error);
            });

            setIsLoading(false);
        } catch (error) {
            console.error('Socket initialization error:', error);
            setIsLoading(false);
        }
    };

    const handleIncomingMessage = (messageData: any) => {
        const newMessage: Message = {
            _id: messageData._id,
            id: messageData._id,
            senderId: messageData.sender._id,
            sender: messageData.sender,
            text: messageData.content,
            content: messageData.content,
            time: formatTime(messageData.createdAt),
            isSent: false,
            isDelivered: messageData.status === 'delivered',
            isRead: messageData.status === 'read',
        };

        setMessages((prev) => [...prev, newMessage]);
        scrollToEnd();

        // Mark message as read
        setTimeout(() => {
            markMessageAsRead(messageData._id, messageData.sender._id);
        }, 500);
    };

    const handleSend = async () => {
        if (!message.trim() || !socketRef.current) return;

        const tempId = Date.now().toString();
        const newMessage: Message = {
            id: tempId,
            senderId: currentUserId,
            text: message.trim(),
            content: message.trim(),
            time: new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            }),
            isSent: true,
            isDelivered: false,
        };

        setMessages((prev) => [...prev, newMessage]);
        setMessage('');
        scrollToEnd();

        // Stop typing indicator
        emitTypingStop();

        // Send message via socket
        socketRef.current.emit('message:send', {
            receiverId: friendId,
            content: message.trim(),
            messageType: 'text',
        });
    };

    const markMessageAsRead = (messageId: string, senderId: string) => {
        if (socketRef.current) {
            socketRef.current.emit('message:read', {
                messageId: messageId,
                senderId: senderId,
            });
        }
    };

    const updateMessageStatus = (messageId: string, status: 'delivered' | 'read') => {
        setMessages((prev) =>
            prev.map((msg) =>
                msg.id === messageId || msg._id === messageId
                    ? {
                        ...msg,
                        isDelivered: status === 'delivered' || status === 'read',
                        isRead: status === 'read',
                    }
                    : msg
            )
        );
    };

    const handleTyping = (text: string) => {
        setMessage(text);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (socketRef.current && text.length > 0) {
            socketRef.current.emit('typing:start', {
                receiverId: friendId,
                conversationId: `${currentUserId}-${friendId}`,
            });
        }

        typingTimeoutRef.current = setTimeout(() => {
            emitTypingStop();
        }, 3000);
    };

    const emitTypingStop = () => {
        if (socketRef.current) {
            socketRef.current.emit('typing:stop', {
                receiverId: friendId,
                conversationId: `${currentUserId}-${friendId}`,
            });
        }
    };

    const formatTime = (timestamp: string): string => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const scrollToEnd = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    useEffect(() => {
        initializeSocket();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [friendId]);

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00A8E8" />
                    <Text style={{ marginTop: 12, color: '#666' }}>Loading messages...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Image source={{ uri: friendAvatar }} style={styles.avatar} />
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerName}>{friendName}</Text>
                        <Text style={styles.headerStatus}>
                            {isTyping ? 'typing...' : 'Online'}
                        </Text>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Ionicons name="call-outline" size={24} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Ionicons name="ellipsis-vertical" size={20} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Chat Area */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {messages.length === 0 ? (
                        <View style={styles.emptyChat}>
                            <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>Start a conversation</Text>
                        </View>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.senderId === currentUserId;
                            console.log(msg.senderId , currentUserId ,isMe , "kkk")
                            return (
                                <View 
                                    key={msg.id} 
                                    style={[
                                        styles.messageRow,
                                        isMe ? styles.messageRowRight : styles.messageRowLeft
                                    ]}
                                >
                                    {/* Avatar for received messages (left side) */}
                                    {!isMe && friendAvatar && (
                                        <Image
                                            source={{ uri: friendAvatar }}
                                            style={styles.messageAvatar}
                                        />
                                    )}

                                    {/* Message Bubble */}
                                    <View
                                        style={[
                                            styles.messageBubble,
                                            isMe ? styles.sentBubble : styles.receivedBubble,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.messageText,
                                                isMe ? styles.sentText : styles.receivedText,
                                            ]}
                                        >
                                            {msg.text}
                                        </Text>
                                        <View style={styles.messageFooter}>
                                            <Text
                                                style={[
                                                    styles.messageTime,
                                                    isMe ? styles.sentTime : styles.receivedTime,
                                                ]}
                                            >
                                                {msg.time}
                                            </Text>
                                            {isMe && (
                                                <Ionicons
                                                    name={msg.isRead ? "checkmark-done" : "checkmark"}
                                                    size={16}
                                                    color={msg.isRead ? "#4CAF50" : "#fff"}
                                                    style={styles.checkmark}
                                                />
                                            )}
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}

                    {isTyping && (
                        <View style={[styles.messageRow, styles.messageRowLeft]}>
                            <Image
                                source={{ uri: friendAvatar }}
                                style={styles.messageAvatar}
                            />
                            <View style={styles.typingIndicator}>
                                <View style={styles.typingDot} />
                                <View style={styles.typingDot} />
                                <View style={styles.typingDot} />
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Input Section */}
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachButton}>
                        <Ionicons name="add" size={28} color="#00A8E8" />
                    </TouchableOpacity>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor="#999"
                            value={message}
                            onChangeText={handleTyping}
                            multiline
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            !message.trim() && styles.sendButtonDisabled,
                        ]}
                        onPress={handleSend}
                        disabled={!message.trim()}
                    >
                        <Ionicons
                            name="send"
                            size={24}
                            color={message.trim() ? '#fff' : '#ccc'}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 50,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 8,
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    headerInfo: {
        marginLeft: 12,
        flex: 1,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    headerStatus: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    headerIcon: {
        padding: 8,
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    messagesContent: {
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    emptyChat: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.5,
        paddingTop: 100,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: '#999',
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    messageRowLeft: {
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
    },
    messageRowRight: {
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
    },
    messageAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    messageBubble: {
        maxWidth: '75%',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    sentBubble: {
        backgroundColor: '#00A8E8',
        borderBottomRightRadius: 4,
    },
    receivedBubble: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    sentText: {
        color: '#fff',
    },
    receivedText: {
        color: '#000',
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    messageTime: {
        fontSize: 11,
    },
    sentTime: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    receivedTime: {
        color: '#999',
    },
    checkmark: {
        marginLeft: 2,
    },
    typingIndicator: {
        flexDirection: 'row',
        gap: 4,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    typingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#999',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    attachButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        maxHeight: 100,
    },
    input: {
        fontSize: 16,
        color: '#000',
        maxHeight: 80,
    },
    sendButton: {
        backgroundColor: '#00A8E8',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#E0E0E0',
    },
});