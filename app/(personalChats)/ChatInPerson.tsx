import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
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

export default function ChatMessageScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState('');
    
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

    const friendId = params.friendId as string;
    const friendName = params.friendName as string;
    const friendAvatar = params.friendAvatar as string;
    const forwardMessage = params.forwardMessage as string;

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

    // Forward message functions
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
                const friends: ForwardContact[] = friendsResponse.data.data
                    .filter((friend: any) => friend._id !== friendId) // Exclude current chat
                    .map((friend: any) => ({
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

            // Fetch groups
            const groupsResponse = await api.get(ENDPOINTS.groups.get);
            if (groupsResponse.data.success && groupsResponse.data.data) {
                const groups: ForwardContact[] = groupsResponse.data.data.map((group: any) => ({
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

    useEffect(() => {
        initializeSocket();
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [friendId]);

    // Handle forwarded message
    useEffect(() => {
        if (forwardMessage && socketRef.current && !isLoading && forwardedMessageRef.current !== forwardMessage) {
            forwardedMessageRef.current = forwardMessage;
            setIsForwarding(true);
            console.log('Forwarding message:', forwardMessage);
            
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

                    socketRef.current.emit('message:send', {
                        receiverId: friendId,
                        content: forwardMessage,
                        messageType: 'text',
                    });
                    
                    console.log('Message forwarded successfully');
                    setIsForwarding(false);
                }
            }, 2000);
        }
    }, [forwardMessage, isLoading, currentUserId, friendId]);

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
            <StatusBar backgroundColor="#2196F3" barStyle={Platform.OS === 'ios' ? 'light-content' : 'dark-content'} />
            
            {/* Header */}
            <View style={styles.header}>
                 <TouchableOpacity 
                     onPress={() => router.back()}
                     style={styles.backButton}
                     activeOpacity={0.7}
                 >
                     <Ionicons name="arrow-back" size={24} color="black" />
                 </TouchableOpacity>
                 
                 <View style={styles.headerCenter}>
                     <View style={styles.avatarContainer}>
                         <View style={[styles.avatarPlaceholder, { backgroundColor: getRandomColor() }]}>
                             <Text style={styles.avatarText}>{friendName[0]}</Text>
                         </View>
                     </View>
                     <View style={styles.userInfo}>
                         <Text style={styles.friendName}>{friendName}</Text>
                         <Text style={styles.statusText}>
                             {isTyping ? '✍️ Typing...' : '🟢 Online'}
                         </Text>
                     </View>
                 </View>
                 
                 <View style={styles.headerIcons}>
                     <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.7}>
                         <Ionicons name="videocam-outline" size={22} color="black" />
                     </TouchableOpacity>
                     <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.7}>
                         <Ionicons name="call-outline" size={22} color="black" />
                     </TouchableOpacity>
                     <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.7}>
                         <Ionicons name="ellipsis-vertical" size={20} color="black" />
                     </TouchableOpacity>
                 </View>
             </View>

            {/* Main Content with Keyboard Avoidance */}
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
                        {messages.map((msg) => {
                            const isMe = msg.senderId === currentUserId;
                            return (
                                <TouchableOpacity
                                    key={msg.id}
                                    style={[styles.messageRow, isMe ? styles.messageRight : styles.messageLeft]}
                                    onLongPress={() => handleMessageLongPress(msg)}
                                    activeOpacity={0.8}
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
                                </TouchableOpacity>
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

            {/* Forward Message Modal */}
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#E9F0F7' },
    loadingWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    keyboardAvoidingContainer: { 
        flex: 1,
    },
    chatContainer: { 
        flex: 1, 
        marginTop: 10, // Space between header and chat
        backgroundColor: '#E9F0F7',
    },

     header: {
         flexDirection: 'row',
         alignItems: 'center',
         justifyContent: 'space-between',
         paddingVertical: 10,
         paddingHorizontal: 0,
         marginHorizontal: 10,
         marginTop: 20, // Top margin for status bar
         backgroundColor: '#fff',
         borderRadius: 45,
         elevation: 4,
         shadowColor: '#000',
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
     avatar: { width: 32, height: 32, borderRadius: 16 },
     friendName: { fontSize: 14, fontWeight: '600', color: 'black' },
     statusText: { fontSize: 11, color: 'gray' },

    chatScroll: { 
        flexGrow: 1,
        paddingVertical: 12, 
        paddingHorizontal: 10,
        paddingBottom: 20, // Extra padding at bottom
    },
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
    forwardingBubble: { backgroundColor: '#FF9800', opacity: 0.8 },
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
        marginBottom: 10,
        borderRadius: 25,
        paddingHorizontal: 10,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 3,
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
     activeIndicator: {
         position: 'absolute',
         bottom: 2,
         right: 2,
         width: 12,
         height: 12,
         borderRadius: 6,
         backgroundColor: '#4CAF50',
         borderWidth: 2,
         borderColor: '#fff',
     },
    
    // Forward Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    forwardModal: {
        backgroundColor: '#fff',
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
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    forwardModalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    selectedMessagePreview: {
        backgroundColor: '#F5F5F5',
        marginHorizontal: 20,
        marginVertical: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#009BFF',
    },
    messagePreviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    messagePreviewLabel: {
        fontSize: 12,
        color: '#666',
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
        color: '#fff',
        fontWeight: '600',
    },
    selectedMessageText: {
        fontSize: 14,
        color: '#666',
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
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
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
        color: '#333',
        marginBottom: 2,
    },
    forwardContactType: {
        fontSize: 12,
        color: '#666',
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
});
