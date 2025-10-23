import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { GroupData, Message } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import io, { Socket } from 'socket.io-client';

import { useTheme } from "@/src/hooks/useTheme";
import { ThemeContext } from "@/src/services/ThemeContext";


interface ForwardContact {
    id: string;
    name: string;
    username: string;
    avatar?: string;
    type: 'friend' | 'group';
    initial: string;
    bgColor: string;
}

const SOCKET_URL = ENDPOINTS.socket;

export default function GroupChatScreen() {
    const { theme, toggleTheme } = useContext(ThemeContext);
    const { isDark, colors, shadows } = useTheme();
    const styles = createStyles(isDark, colors, shadows);
    const currentTheme = colors;
    const router = useRouter();
    const params = useLocalSearchParams();
    const groupId = params.groupId as string;
    const forwardMessage = params.forwardMessage as string;

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [groupData, setGroupData] = useState<GroupData | null>(null);
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(true);
    const [messageVisible, setMessageVisible] = useState(false);
    const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
    const [messageText, setMessageText] = useState('');

    // Socket and typing states
    const [isTyping, setIsTyping] = useState(false);
    const [currentUserId, setCurrentUserId] = useState('');
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    // Forward message states
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [forwardContacts, setForwardContacts] = useState<ForwardContact[]>([]);
    const [forwardGroups, setForwardGroups] = useState<ForwardContact[]>([]);
    const [forwardLoading, setForwardLoading] = useState(false);
    const [isForwarding, setIsForwarding] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);
    const socketRef = useRef<Socket | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);
    const forwardedMessageRef = useRef<string | null>(null);

    useEffect(() => {
        if (groupId) {
            fetchGroupData();
            initializeSocket();
        }
    }, [groupId]);

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    // Socket initialization
    const initializeSocket = async () => {
        try {
            const token = await (Storage as any).getItem("accessToken");
            const userData = await (Storage as any).getItem("user");
            if (!token || !userData) return;

            setCurrentUserId(userData.id);
            await fetchGroupMessages(groupId);
            await markAllMessagesAsRead();

            socketRef.current = io(SOCKET_URL, {
                auth: { token },
                reconnection: true,
                transports: ['websocket'],
            });

            // Join group room
            if (socketRef.current) {
                socketRef.current.emit('group:join', groupId);
                console.log("group:join", groupId);


                socketRef.current.on('group:message:receive', handleIncomingGroupMessage);
                socketRef.current.on('group:message:error', handleMessageError);
                socketRef.current.on('group:message:read', handleMessageReadReceipt);

                // Listen for typing indicators
                socketRef.current.on('group:typing:start', handleTypingStart);
                socketRef.current.on('group:typing:stop', handleTypingStop);
            }

            console.log('Socket initialized for group:', groupId);
        } catch (err) {
            console.error('Socket init error:', err);
        }
    };

    // Handle incoming group messages
    const handleIncomingGroupMessage = (msg: any) => {
        setMessages((prev) => {
            // console.log(msg.sender._id , currentUserId , "msg.sender._id === currentUserId")
            if (msg.sender._id === currentUserId) {
                const tempMessageIndex = prev.findIndex(existingMsg =>
                    existingMsg.senderId === currentUserId &&
                    existingMsg.text === msg.content &&
                    !existingMsg._id // temporary message doesn't have _id
                );

                if (tempMessageIndex !== -1) {
                    // Update the temporary message with server data
                    const updatedMessages = [...prev];
                    updatedMessages[tempMessageIndex] = {
                        ...updatedMessages[tempMessageIndex],
                        _id: msg._id,
                        id: msg._id,
                        isDelivered: true,
                        isRead: msg.readBy?.some((read: any) => read.user.toString() === currentUserId) || false,
                        messageType: msg.messageType || 'text',
                    };
                    return updatedMessages;
                }
            }

            // Check if message already exists to prevent duplicates
            const messageExists = prev.some(existingMsg => existingMsg._id === msg._id);
            if (messageExists) {
                return prev;
            }
            setTypingUsers([]);

            const newMsg: Message = {
                _id: msg._id,
                id: msg._id,
                senderId: msg.sender._id,
                sender: msg.sender,
                text: msg.content,
                content: msg.content,
                time: formatTime(msg.createdAt),
                isSent: msg.sender._id === currentUserId,
                isDelivered: true,
                isRead: msg.readBy?.some((read: any) => read.user.toString() === currentUserId) || false,
                messageType: msg.messageType || 'text',
                isSystemMessage: isSystemMessage(msg.content),
            };

            return [...prev, newMsg];
        });
        scrollToEnd();

        // Mark message as read if it's not from current user

    };

    // Handle message errors
    const handleMessageError = (error: any) => {
        console.error('Message error:', error);
        showMessage('error', error.error || 'Failed to send message');
    };

    // Handle read receipt updates
    const handleMessageReadReceipt = (data: any) => {
        const { messageId, readBy, readAt } = data;
        setMessages(prev => prev.map(msg => {
            if (msg._id === messageId) {
                return {
                    ...msg,
                    isRead: true,
                    readBy: [...(msg.readBy || []), { user: readBy, readAt }]
                };
            }
            return msg;
        }));
    };

    // Handle typing start
    const handleTypingStart = (data: any) => {
        if (data.userId !== currentUserId) {
            setTypingUsers(prev => {
                if (!prev.includes(data.userId)) {
                    return [...prev, data.userId];
                }
                return prev;
            });
        }
    };

    // Handle typing stop
    const handleTypingStop = (data: any) => {
        setTypingUsers(prev => prev.filter(userId => userId !== data.userId));
    };

    // Fetch group messages
    const fetchGroupMessages = async (groupId: string) => {
        try {
            setMessagesLoading(true);
            console.log(`${ENDPOINTS.groups.messages.getHistory}/${groupId}/messages`, "response.data.data.messages")
            const response = await api.get(`${ENDPOINTS.groups.messages.getHistory}/${groupId}/messages`);
            if (response.data.success && response.data.data?.messages) {
                const formattedMessages: Message[] = response.data.data.messages.map((msg: any) => ({
                    _id: msg._id,
                    id: msg._id,
                    senderId: msg.sender._id,
                    sender: msg.sender,
                    text: msg.content,
                    content: msg.content,
                    time: formatTime(msg.createdAt),
                    isSent: msg.sender._id === currentUserId,
                    isDelivered: true,
                    isRead: msg.readBy?.some((read: any) => read.user.toString() === currentUserId) || false,
                    messageType: msg.messageType || 'text',
                    isSystemMessage: isSystemMessage(msg.content),
                }));
                setMessages(formattedMessages);
                setTimeout(() => scrollToEnd(), 300);
            }
        } catch (error) {
            console.error('Error fetching group messages:', error);
        } finally {
            setMessagesLoading(false);
        }
    };

    // Format time helper
    const formatTime = (timestamp: string): string =>
        new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Scroll to end helper
    const scrollToEnd = () => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);

    // Mark message as read
    const markMessageAsRead = async (messageId: string) => {
        // try {
        //     await api.put(`${ENDPOINTS.groups.messages.markAsRead}/${messageId}/read`);
        // } catch (error) {
        //     console.error('Error marking message as read:', error);
        // }
    };

    // Mark all messages as read when entering the chat
    const markAllMessagesAsRead = async () => {
        try {
            await api.put(`${ENDPOINTS.groups.messages.markAllAsRead}/${groupId}/messages/read-all`);
        } catch (error) {
            console.error('Error marking all messages as read:', error);
        }
    };

    // Handle forwarded message
    useEffect(() => {
        if (forwardMessage && socketRef.current && !loading && forwardedMessageRef.current !== forwardMessage) {
            forwardedMessageRef.current = forwardMessage;
            setIsForwarding(true);
            console.log('Forwarding message to group:', forwardMessage);

            // Auto-send the forwarded message
            setTimeout(() => {
                if (socketRef.current && currentUserId) {
                    const tempId = Date.now().toString();
                    const newMessage: Message = {
                        id: tempId,
                        senderId: currentUserId,
                        text: forwardMessage,
                        content: forwardMessage,
                        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                        isSent: true,
                    };

                    setMessages((prev) => [...prev, newMessage]);
                    setMessage('');
                    scrollToEnd();

                    if (socketRef.current) {
                        socketRef.current.emit('group:message:send', {
                            groupId: groupId,
                            content: forwardMessage,
                            messageType: 'text',
                        });
                    }

                    console.log('Message forwarded to group successfully');
                    setIsForwarding(false);
                }
            }, 2000);
        }
    }, [forwardMessage, loading, currentUserId, groupId]);

    const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
        setMessageType(type);
        setMessageText(text);
        setMessageVisible(true);
    };

    const fetchGroupData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`${ENDPOINTS.groups.get}${groupId}`);

            if (response.data.success && response.data.data) {
                setGroupData(response.data.data);
            } else {
                showMessage('error', 'Failed to load group data');
            }
        } catch (error: any) {
            console.log('Error fetching group:', error);
            showMessage('error', error?.response?.data?.message || 'Failed to load group');
        } finally {
            setLoading(false);
        }
    };

    // Get unread message count
    const getUnreadMessageCount = async () => {
        try {
            const response = await api.get(`${ENDPOINTS.groups.messages.getUnreadCount}/${groupId}/messages/unread/count`);
            if (response.data.success) {
                return response.data.data.count;
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
        return 0;
    };

    const getAvatarUrl = (profileImage?: string, fullName?: string) => {
        if (profileImage) {
            return profileImage;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=009BFF&color=fff&size=128`;
    };

    const handleSend = async () => {
        if (!message.trim() || !socketRef.current) return;

        const messageText = message.trim();
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const newMessage: Message = {
            id: tempId,
            senderId: currentUserId,
            text: messageText,
            content: messageText,
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            isSent: true,
            isDelivered: false,
            messageType: 'text',
        };

        // Add temporary message immediately for better UX
        // setMessages((prev) => [...prev, newMessage]);
        setMessage('');
        scrollToEnd();

        // Send message via socket
        if (socketRef.current) {
            socketRef.current.emit('group:message:send', {
                groupId: groupId,
                content: messageText,
                messageType: 'text',
            });
        }
    };

    const isUserAdmin = () => {
        if (!groupData) return false;
        return groupData.admins.some(admin => admin._id === currentUserId);
    };

    // Check if a message is a system message
    const isSystemMessage = (messageText: string): boolean => {
        const systemMessagePatterns = [
            'was promoted to admin',
            'created the group',
            'was added to the group',
            'left the group',
            'was removed from the group',
            'changed the group name',
            'changed the group description',
            'changed the group image'
        ];

        return systemMessagePatterns.some(pattern =>
            messageText.toLowerCase().includes(pattern.toLowerCase())
        );
    };

    // Handle typing functionality
    const handleTyping = (text: string) => {
        setMessage(text);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (socketRef.current && text.length > 0) {
            socketRef.current.emit('group:typing:start', { groupId: groupId });
        }
        typingTimeoutRef.current = setTimeout(() => emitTypingStop(), 2000);
    };

    const emitTypingStop = () => {
        if (socketRef.current) {
            socketRef.current.emit('group:typing:stop', { groupId: groupId });
        }
    };

    // Forward message functions
    const getRandomColor = () => {
        const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    // Utility function to handle forwarded message text
    const getForwardText = (originalText: string): string => {
        // Check if message is already forwarded
        if (originalText.startsWith('Forwarded: ')) {
            return originalText; // Don't add another "Forwarded:" prefix
        }
        return `Forwarded: ${originalText}`;
    };

    const handleMessageLongPress = (message: Message) => {
        setSelectedMessage(message);
        setShowForwardModal(true);
        fetchForwardContacts();
    };

    const fetchForwardContacts = async () => {
        try {
            setForwardLoading(true);

            // Fetch friends
            const friendsResponse = await api.get(ENDPOINTS.friends.getAll);
            if (friendsResponse.data.success && friendsResponse.data.data) {
                const friends: ForwardContact[] = friendsResponse.data.data.map((friend: any) => ({
                    id: friend._id,
                    name: friend.fullName || friend.username,
                    username: friend.username,
                    avatar: friend.profileImage,
                    type: 'friend' as const,
                    initial: friend.fullName ? friend.fullName.charAt(0).toUpperCase() : friend.username.charAt(0).toUpperCase(),
                    bgColor: getRandomColor(),
                }));
                setForwardContacts(friends);
            }

            // Fetch groups (exclude current group)
            const groupsResponse = await api.get(ENDPOINTS.groups.get);
            if (groupsResponse.data.success && groupsResponse.data.data) {
                const groups: ForwardContact[] = groupsResponse.data.data
                    .filter((group: any) => group._id !== groupId) // Exclude current group
                    .map((group: any) => ({
                        id: group._id,
                        name: group.name,
                        username: group.name,
                        avatar: group.groupImage,
                        type: 'group' as const,
                        initial: group.name.charAt(0).toUpperCase(),
                        bgColor: getRandomColor(),
                    }));
                setForwardGroups(groups);
            }
        } catch (error) {
            console.error('Error fetching forward contacts:', error);
        } finally {
            setForwardLoading(false);
        }
    };

    const handleForwardMessage = async (contact: ForwardContact) => {
        if (!selectedMessage) return;

        try {
            // Use utility function to handle forwarded message text
            const forwardText = getForwardText(selectedMessage.text);
            const isAlreadyForwarded = selectedMessage.text.startsWith('Forwarded: ');

            console.log('Forwarding to:', contact.name, 'Type:', contact.type);
            console.log('Original message:', selectedMessage.text);
            console.log('Is already forwarded:', isAlreadyForwarded);
            console.log('Forward text:', forwardText);

            if (contact.type === 'friend') {
                // Forward to personal chat
                console.log('Navigating to personal chat with:', contact.id);
                router.push({
                    pathname: "/(personalChats)/ChatInPerson",
                    params: {
                        friendId: contact.id,
                        friendName: contact.name,
                        friendUsername: contact.username,
                        friendAvatar: contact.avatar || '',
                        forwardMessage: forwardText,
                    }
                });
            } else {
                // Forward to group chat
                console.log('Navigating to group chat with:', contact.id);
                router.push({
                    pathname: "/(GroupChats)/ChatInGroup",
                    params: {
                        groupId: contact.id,
                        forwardMessage: forwardText,
                    }
                });
            }

            setShowForwardModal(false);
            setSelectedMessage(null);
        } catch (error) {
            console.error('Error forwarding message:', error);
        }
    };

    const closeForwardModal = () => {
        setShowForwardModal(false);
        setSelectedMessage(null);
    };

    // Cleanup socket connection
    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.emit('group:leave', groupId);
                socketRef.current.disconnect();
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [groupId]);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#009BFF" />
                    <Text style={styles.loadingText}>Loading group...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!groupData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
                    <Text style={styles.errorText}>Group not found</Text>
                    <TouchableOpacity
                        style={styles.backToChatsButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backToChatsText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* <StatusBar backgroundColor="#2196F3" barStyle={Platform.OS === 'ios' ? 'light-content' : 'dark-content'} /> */}
            <StatusBar
                barStyle={theme === 'dark' ? "light-content" : "dark-content"}
                // backgroundColor="transparent"
                translucent={true}
            />
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.replace("/(chats)/Groups")}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.headerCenter}
                    onPress={() => {
                        router.push({
                            pathname: "/(GroupChats)/GroupDescription",
                            params: { groupId }
                        });
                    }}
                    activeOpacity={0.7}
                >
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatarPlaceholder, { backgroundColor: '#2196F3' }]}>
                            <Text style={styles.avatarText}>{groupData.name.charAt(0).toUpperCase()}</Text>
                        </View>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.groupName}>{groupData.name}</Text>
                        <Text style={styles.memberCount}>
                            {groupData.members.length} {groupData.members.length === 1 ? 'member' : 'members'}
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.headerIcons}>
                    <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.7}>
                        <Ionicons name="videocam-outline" size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.7}>
                        <Ionicons name="call-outline" size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.7}>
                        <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>


            {isUserAdmin() && (
                <View style={styles.adminBanner}>
                    <Ionicons name="shield-checkmark" size={16} color="#FF9800" />
                    <Text style={styles.adminBannerText}>You are an admin</Text>
                </View>
            )}



            <KeyboardAvoidingView
                style={styles.keyboardAvoidingContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Messages */}
                <View style={styles.chatContainer}>
                    <ScrollView
                        ref={scrollViewRef}
                        contentContainerStyle={styles.chatScroll}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled={true}
                    >
                        {messagesLoading ? (
                            <View style={styles.messagesLoadingContainer}>
                                <ActivityIndicator size="large" color="#007AFF" />
                                <Text style={styles.messagesLoadingText}>Loading messages...</Text>
                            </View>
                        ) : messages.length === 0 ? (
                            <View style={styles.emptyMessagesContainer}>
                                <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
                                <Text style={styles.emptyMessagesText}>No messages yet</Text>
                                <Text style={styles.emptyMessagesSubtext}>
                                    Be the first to send a message!
                                </Text>
                            </View>
                        ) : (
                            messages.map((msg, index) => {
                                const isMe = msg.senderId === currentUserId;
                                const prevMsg = index > 0 ? messages[index - 1] : null;
                                const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

                                // Check if this is a system message
                                const isSystemMsg = msg.isSystemMessage || isSystemMessage(msg.text);

                                // Check if this is the first message from this sender in a group
                                const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;
                                // Check if this is the last message from this sender in a group
                                const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;

                                // Render system message differently
                                if (isSystemMsg) {
                                    return (
                                        <View key={msg._id || msg.id} style={styles.systemMessageContainer}>
                                            <View style={styles.systemMessageBubble}>
                                                <Text style={styles.systemMessageText}>
                                                    {msg.text}
                                                </Text>
                                                <Text style={styles.systemMessageTime}>
                                                    {msg.time}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                }

                                return (
                                    <TouchableOpacity
                                        key={msg._id || msg.id}
                                        style={[
                                            styles.messageRow,
                                            isMe ? styles.messageRight : styles.messageLeft,
                                            isFirstInGroup && styles.firstMessageInGroup,
                                            isLastInGroup && styles.lastMessageInGroup
                                        ]}
                                        onLongPress={() => handleMessageLongPress(msg)}
                                        activeOpacity={0.8}
                                    >
                                        {/* Sender Name - Only for first message in group and not for current user */}
                                        {!isMe && isFirstInGroup && (
                                            <View style={styles.senderNameContainer}>
                                                <Text style={styles.senderName}>
                                                    {msg.sender?.fullName || msg.sender?.username || 'Unknown'}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Message Bubble */}
                                        <View style={[
                                            styles.messageBubble,
                                            isMe ? styles.myBubble : styles.theirBubble,
                                            isFirstInGroup && (isMe ? styles.myFirstBubble : styles.theirFirstBubble),
                                            isLastInGroup && (isMe ? styles.myLastBubble : styles.theirLastBubble),
                                            !isFirstInGroup && !isLastInGroup && styles.middleBubble,
                                        ]}>
                                            <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
                                                {msg.text.startsWith('Forwarded: ') ? msg.text.substring(11) : msg.text}
                                            </Text>

                                            {/* Timestamp and Status inside bubble */}
                                            <View style={styles.messageFooter}>
                                                <Text style={[styles.msgTime, isMe ? styles.myTime : styles.theirTime]}>
                                                    {msg.time}
                                                </Text>
                                                {isMe && (
                                                    <View style={styles.messageStatusContainer}>
                                                        <Ionicons
                                                            name={msg.isRead ? "checkmark-done" : (msg.isDelivered ? "checkmark-done" : "checkmark")}
                                                            size={16}
                                                            color={msg.isRead ? "#4CAF50" : (msg.isDelivered ? "#4CAF50" : "rgba(255, 255, 255, 0.6)")}
                                                            style={styles.checkmark}
                                                        />
                                                        {msg.isRead && msg.readBy && msg.readBy.length > 1 && (
                                                            <Text style={styles.readCount}>
                                                                {msg.readBy.length - 1}
                                                            </Text>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                        {/* Typing indicators */}
                        {typingUsers.length > 0 && (
                            <View style={[styles.messageRow, styles.messageLeft, styles.typingIndicatorContainer]}>
                                <View style={styles.typingBubble}>
                                    <Text style={styles.typingText}>
                                        {typingUsers.length === 1 ? 'Someone is typing...' : `${typingUsers.length} people are typing...`}
                                    </Text>
                                </View>
                            </View>
                        )}
                        {/* Forwarding indicator */}
                        {isForwarding && (
                            <View style={[styles.messageRow, styles.messageRight]}>
                                <View style={[styles.messageBubble, styles.myBubble, styles.forwardingBubble]}>
                                    <Text style={[styles.messageText, styles.myText]}>
                                        Forwarding message...
                                    </Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* Input */}
                <View style={[styles.inputBar, messagesLoading && styles.inputBarDisabled]}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        disabled={messagesLoading}
                    >
                        <Ionicons name="add" size={24} color={messagesLoading ? colors.textLight : colors.primary} />
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.input, messagesLoading && styles.inputDisabled]}
                        placeholder={messagesLoading ? "Loading messages..." : "Type a message..."}
                        placeholderTextColor={colors.textLight}
                        value={message}
                        onChangeText={handleTyping}
                        multiline
                        editable={!messagesLoading}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!message.trim() || messagesLoading) && { opacity: 0.5 }]}
                        onPress={handleSend}
                        disabled={!message.trim() || messagesLoading}
                    >
                        <Ionicons name="send" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <Modal
                visible={showForwardModal}
                transparent={true}
                animationType="slide"
                onRequestClose={closeForwardModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.forwardModal}>
                        <View style={styles.forwardModalHeader}>
                            <Text style={styles.forwardModalTitle}>Forward Message</Text>
                            <TouchableOpacity onPress={closeForwardModal}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {selectedMessage && (
                            <View style={styles.selectedMessagePreview}>
                                <View style={styles.messagePreviewHeader}>
                                    <Text style={styles.messagePreviewLabel}>Message to forward:</Text>
                                    {selectedMessage.text.startsWith('Forwarded: ') && (
                                        <View style={styles.forwardedBadge}>
                                            <Ionicons name="arrow-forward" size={12} color="#fff" />
                                            <Text style={styles.forwardedBadgeText}>Already Forwarded</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.selectedMessageText} numberOfLines={2}>
                                    "{selectedMessage.text}"
                                </Text>
                            </View>
                        )}

                        {forwardLoading ? (
                            <View style={styles.forwardLoadingContainer}>
                                <ActivityIndicator size="large" color="#009BFF" />
                                <Text style={styles.forwardLoadingText}>Loading contacts...</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={[...forwardContacts, ...forwardGroups]}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.forwardContactItem}
                                        onPress={() => handleForwardMessage(item)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.forwardContactAvatar}>
                                            <View style={[styles.forwardAvatarPlaceholder, { backgroundColor: item.bgColor }]}>
                                                <Text style={styles.forwardAvatarText}>{item.initial}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.forwardContactInfo}>
                                            <Text style={styles.forwardContactName}>{item.name}</Text>
                                            <Text style={styles.forwardContactType}>
                                                {item.type === 'friend' ? 'Personal Chat' : 'Group Chat'}
                                            </Text>
                                        </View>
                                        <Ionicons name="arrow-forward" size={20} color="#009BFF" />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={() => (
                                    <View style={styles.forwardEmptyContainer}>
                                        <Ionicons name="people-outline" size={48} color="#ccc" />
                                        <Text style={styles.forwardEmptyText}>No contacts available</Text>
                                    </View>
                                )}
                                contentContainerStyle={styles.forwardListContent}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            <GlobalMessage
                type={messageType}
                message={messageText}
                visible={messageVisible}
                onClose={() => setMessageVisible(false)}
            />
        </SafeAreaView>
    );
}

const createStyles = (isDark: boolean, colors: any, shadows: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textSecondary,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    errorText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: 16,
    },
    backToChatsButton: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#009BFF',
        borderRadius: 24,
    },
    backToChatsText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    keyboardAvoidingContainer: {
        flex: 1,
    },
    chatContainer: {
        flex: 1,
        marginTop: 8,
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        marginHorizontal: 10,
        marginBottom: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 0,
        marginHorizontal: 10,
        marginTop: 20, // Top margin for status bar
        backgroundColor: colors.background,
        borderRadius: 45,
        elevation: 4,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        zIndex: 1000, // Ensure header stays on top
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
    headerIconButton: {
        padding: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    userInfo: {
        flex: 1,
        marginLeft: 8,
    },
    groupName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary
    },
    memberCount: { fontSize: 11, color: 'gray' },
    adminBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF3E0',
        paddingVertical: 6,
        gap: 6,
        marginHorizontal: 10,
        borderRadius: 20,
        marginTop: 5,
    },
    adminBannerText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FF9800',
    },
    membersPreview: {
        backgroundColor: '#F8F8F8',
        paddingVertical: 8,
        marginHorizontal: 10,
        borderRadius: 20,
        marginTop: 5,
    },
    membersScrollContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    memberPreviewItem: {
        position: 'relative',
    },
    memberPreviewAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#fff',
    },
    adminBadgeSmall: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#FF9800',
        borderRadius: 8,
        width: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    moreMembers: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    moreMembersText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#666',
    },
    chatScroll: {
        flexGrow: 1,
        paddingVertical: 16,
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    messageRow: {
        flexDirection: 'column',
        marginVertical: 2,
        alignItems: 'flex-start',
        paddingHorizontal: 4,
    },
    messageLeft: {
        alignItems: 'flex-start'
    },
    messageRight: {
        alignItems: 'flex-end',
    },
    firstMessageInGroup: {
        marginTop: 8,
    },
    lastMessageInGroup: {
        marginBottom: 8,
    },
    // Sender name container for proper stacking
    senderNameContainer: {
        marginBottom: 4,
        marginLeft: 4,
    },
    // Header avatar styles
    avatarContainer: {
        position: 'relative',
    },
    avatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: 12,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    myBubble: {
        backgroundColor: '#007AFF',
    },
    theirBubble: {
        backgroundColor: '#FFFFFF',
    },
    // WhatsApp-style bubble grouping
    myFirstBubble: {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 4,
    },
    myLastBubble: {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 18,
    },
    theirFirstBubble: {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 18,
    },
    theirLastBubble: {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 4,
    },
    middleBubble: {
        borderRadius: 18,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
        fontWeight: '400',
    },
    myText: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
    theirText: {
        color: '#1C1C1E',
        fontWeight: '400',
    },

    // Forwarded message styles
    messageContentContainer: {
        flex: 1,
        maxWidth: '75%',
    },
    messageTextContainer: {
        flex: 1,
    },
    forwardedMessageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    forwardedLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
    myForwardedLabel: {
        color: 'rgba(255,255,255,0.7)',
    },
    theirForwardedLabel: {
        color: '#666',
    },

    msgTime: {
        fontSize: 11,
        fontWeight: '400',
    },
    myTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    theirTime: {
        color: '#8E8E93',
    },
    emptyMessagesContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyMessagesText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginTop: 16,
    },
    emptyMessagesSubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    },
    messagesLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    messagesLoadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    senderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        marginLeft: 4,
    },
    senderName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#007AFF',
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        justifyContent: 'flex-end',
        gap: 4,
    },
    checkmark: {
        marginLeft: 4,
    },
    messageStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    readCount: {
        fontSize: 10,
        color: '#4CAF50',
        marginLeft: 2,
        fontWeight: '600',
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: colors.surface,
        marginHorizontal: 12,
        marginBottom: 20,
        borderRadius: 28,
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    iconButton: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 24,
        backgroundColor: 'rgba(0, 122, 255, 0.08)',
        marginRight: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        minHeight: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: colors.textPrimary,
        fontWeight: '400',
        backgroundColor: 'transparent',
        borderRadius: 24,
        marginVertical: 2,
    },
    sendButton: {
        backgroundColor: '#007AFF',
        borderRadius: 24,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 6,
    },
    inputBarDisabled: {
        opacity: 0.5,
        backgroundColor: colors.gray[100],
    },
    inputDisabled: {
        color: colors.textLight,
        opacity: 0.7,
    },

    // Forward Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    forwardModal: {
        backgroundColor: colors.cardBackground,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        minHeight: '50%',
    },
    forwardModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    forwardModalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    selectedMessagePreview: {
        backgroundColor:colors.containerBackground,
        marginHorizontal: 20,
        marginVertical: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
    },
    messagePreviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    messagePreviewLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    forwardedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF9800',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    forwardedBadgeText: {
        fontSize: 10,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    selectedMessageText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    forwardLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    forwardLoadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },
    forwardListContent: {
        paddingVertical: 8,
    },
    forwardContactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    forwardContactAvatar: {
        marginRight: 12,
    },
    forwardAvatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    forwardAvatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    forwardContactInfo: {
        flex: 1,
    },
    forwardContactName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 2,
    },
    forwardContactType: {
        fontSize: 12,
        color: colors.textLight,
    },
    forwardEmptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    forwardEmptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 12,
    },

    // Typing indicator styles
    typingIndicatorContainer: {
        marginBottom: 0,
    },
    typingBubble: {
        backgroundColor: '#f0f0f0',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxWidth: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    typingText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
        fontStyle: 'italic',
    },
    forwardingBubble: {
        backgroundColor: '#FF9800',
        opacity: 0.8,
    },

    // System message styles (WhatsApp-like admin messages)
    systemMessageContainer: {
        alignItems: 'center',
        marginVertical: 8,
        paddingHorizontal: 16,
    },
    systemMessageBubble: {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        borderRadius: 7.5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        maxWidth: '70%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    systemMessageText: {
        fontSize: 9,
        color: 'rgba(0, 0, 0, 0.6)',
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 12,
        letterSpacing: 0,
    },
    systemMessageTime: {
        fontSize: 7,
        color: 'rgba(0, 0, 0, 0.4)',
        marginTop: 2,
        fontWeight: '400',
        letterSpacing: 0,
    },
});