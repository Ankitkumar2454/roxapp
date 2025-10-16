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

    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const SOCKET_URL = ENDPOINTS.socket;

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

    const getRandomColor = () => {
        const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const fetchPreviousMessages = async (userId: string, friendId: string) => {
        try {
            const response = await api.get(`${ENDPOINTS.chat.previous_message}/${friendId}/history`);
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
            console.error('Error fetching messages:', error);
        }
    };

    const initializeSocket = async () => {
        try {
            const token = await Storage.getItem("accessToken");
            const userData = await Storage.getItem("user");
            if (!token || !userData) return;

            setCurrentUserId(userData.id);
            await fetchPreviousMessages(userData.id, friendId);

            socketRef.current = io(SOCKET_URL, {
                auth: { token },
                reconnection: true,
                transports: ['websocket'],
            });

            socketRef.current.on('message:receive', handleIncomingMessage);
            socketRef.current.on('typing:start', (d) => setIsTyping(d.userId !== userData._id));
            socketRef.current.on('typing:stop', (d) => setIsTyping(false));

            setIsLoading(false);
        } catch (err) {
            console.error('Socket init error:', err);
            setIsLoading(false);
        }
    };

    const handleIncomingMessage = (msg: any) => {
        const newMsg: Message = {
            _id: msg._id,
            id: msg._id,
            senderId: msg.sender._id,
            sender: msg.sender,
            text: msg.content,
            content: msg.content,
            time: formatTime(msg.createdAt),
            isSent: false,
        };
        setMessages((prev) => [...prev, newMsg]);
        scrollToEnd();
    };

    const handleSend = async () => {
        if (!message.trim() || !socketRef.current) return;
        const tempId = Date.now().toString();
        const newMessage: Message = {
            id: tempId,
            senderId: currentUserId,
            text: message.trim(),
            content: message.trim(),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            isSent: true,
        };
        setMessages((prev) => [...prev, newMessage]);
        setMessage('');
        scrollToEnd();

        socketRef.current.emit('message:send', {
            receiverId: friendId,
            content: newMessage.text,
            messageType: 'text',
        });
    };

    const handleTyping = (text: string) => {
        setMessage(text);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (socketRef.current && text.length > 0) {
            socketRef.current.emit('typing:start', { receiverId: friendId });
        }
        typingTimeoutRef.current = setTimeout(() => emitTypingStop(), 2000);
    };

    const emitTypingStop = () => {
        if (socketRef.current) socketRef.current.emit('typing:stop', { receiverId: friendId });
    };

    const scrollToEnd = () => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);

    const formatTime = (timestamp: string): string =>
        new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    useEffect(() => {
        initializeSocket();
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [friendId]);

    if (isLoading) {
        return (
            <SafeAreaView style={styles.loadingWrapper}>
                <ActivityIndicator size="large" color="#00A8E8" />
                <Text style={{ color: '#777', marginTop: 10 }}>Loading chat...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    {/* <Image source={{ uri: friendAvatar }} style={styles.avatar} /> */}
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatarPlaceholder, { backgroundColor: getRandomColor() }]}>
                            <Text style={styles.avatarText}>{friendName[0]}</Text>
                        </View>
                        {/* {item.isActive && <View style={styles.activeIndicator} />} */}
                    </View>
                    <View>
                        <Text style={styles.friendName}>{friendName}</Text>
                        <Text style={styles.statusText}>{isTyping ? 'Typing...' : 'Online'}</Text>
                    </View>
                </View>
                <View style={styles.headerIcons}>
                    <Ionicons name="call-outline" size={22} color="#fff" />
                    <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
                </View>
            </View>

            {/* Messages */}
            <KeyboardAvoidingView style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                //  keyboardVerticalOffset={195}
            >
                <ScrollView ref={scrollViewRef} contentContainerStyle={styles.chatScroll}>
                    {messages.map((msg) => {
                        const isMe = msg.senderId === currentUserId;
                        return (
                            <View
                                key={msg.id}
                                style={[styles.messageRow, isMe ? styles.messageRight : styles.messageLeft]}
                            >
                                {!isMe && <Image source={{ uri: "https://api.dicebear.com/7.x/adventurer/png?seed=HappyUser" }} style={styles.msgAvatar} />}
                                <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
                                    <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
                                        {msg.text}
                                    </Text>
                                    <Text style={[styles.msgTime, isMe ? styles.myTime : styles.theirTime]}>
                                        {msg.time}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                    {isTyping && (
                        <View style={[styles.messageRow, styles.messageLeft]}>
                            <Image source={{ uri: friendAvatar }} style={styles.msgAvatar} />
                            <View style={styles.typingIndicator}>
                                <View style={styles.dot} />
                                <View style={styles.dot} />
                                <View style={styles.dot} />
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Input */}
                <View style={styles.inputBar}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="add" size={26} color="#007AFF" />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor="#888"
                        value={message}
                        onChangeText={handleTyping}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !message.trim() && { opacity: 0.5 }]}
                        onPress={handleSend}
                        disabled={!message.trim()}
                    >
                        <Ionicons name="send" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#E9F0F7' },
    loadingWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row',
         alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        // paddingBottom:20,
        height: 100,
        backgroundColor: '#2196F3',

        justifyContent: "center",
        elevation: 3,
    },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginLeft: 12 },
    headerIcons: { flexDirection: 'row', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    friendName: { fontSize: 16, fontWeight: '600', color: '#fff' },
    statusText: { fontSize: 12, color: '#D6E8FF' },

    chatScroll: { paddingVertical: 12, paddingHorizontal: 10 },
    messageRow: { flexDirection: 'row', marginVertical: 6, alignItems: 'flex-end' },
    messageLeft: { justifyContent: 'flex-start' },
    messageRight: { justifyContent: 'flex-end', alignSelf: 'flex-end' },
    msgAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },

    messageBubble: {
        maxWidth: '75%',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    myBubble: { backgroundColor: '#2196F3', borderBottomRightRadius: 4 },
    theirBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
    messageText: { fontSize: 15 },
    myText: { color: '#fff' },
    theirText: { color: '#333' },
    msgTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
    myTime: { color: 'rgba(255,255,255,0.7)' },
    theirTime: { color: '#999' },

    typingIndicator: {
        flexDirection: 'row',
        gap: 5,
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#aaa', opacity: 0.6 },

    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 10,
        borderRadius: 25,
        paddingHorizontal: 10,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 3,
        // marginBottom: 50
    },
    iconButton: { paddingHorizontal: 6 },
    input: {
        flex: 1,
        fontSize: 15,
        maxHeight: 100,
        paddingHorizontal: 10,
        color: '#000',
    },
    sendButton: {
        backgroundColor: '#007AFF',
        borderRadius: 20,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    //      avatar: {
    //     width: 56,
    //     height: 56,
    //     borderRadius: 28,
    //   },
    avatarPlaceholder: {
        width: 36,
        height: 36,
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
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
});
