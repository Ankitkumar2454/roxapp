import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { GroupData, Message } from '@/utils/types';
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



interface ForwardContact {
    id: string;
    name: string;
    username: string;
    avatar?: string;
    type: 'friend' | 'group';
    initial: string;
    bgColor: string;
}

const CURRENT_USER_ID = 'me'; // This should come from your auth state

export default function GroupChatScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const groupId = params.groupId as string;
    const forwardMessage = params.forwardMessage as string;

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [groupData, setGroupData] = useState<GroupData | null>(null);
    const [loading, setLoading] = useState(true);
    const [messageVisible, setMessageVisible] = useState(false);
    const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
    const [messageText, setMessageText] = useState('');
    
    // Forward message states
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [forwardContacts, setForwardContacts] = useState<ForwardContact[]>([]);
    const [forwardGroups, setForwardGroups] = useState<ForwardContact[]>([]);
    const [forwardLoading, setForwardLoading] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);
    const forwardedMessageRef = useRef<string | null>(null);

    useEffect(() => {
        if (groupId) {
            fetchGroupData();
        }
    }, [groupId]);

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    // Handle forwarded message
    useEffect(() => {
        if (forwardMessage && !loading && forwardedMessageRef.current !== forwardMessage) {
            forwardedMessageRef.current = forwardMessage;
            console.log('Forwarding message to group:', forwardMessage);
            
            // Auto-send the forwarded message
            setTimeout(() => {
                const newMessage: Message = {
                    id: Date.now().toString(),
                    senderId: CURRENT_USER_ID,
                    senderName: 'You',
                    text: forwardMessage,
                    time: new Date().toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    }),
                    isSent: true,
                    isDelivered: false,
                };

                setMessages(prev => [...prev, newMessage]);
                setMessage('');

                // TODO: Send message to backend
                // sendMessageToBackend(groupId, forwardMessage);
                console.log('Message forwarded to group successfully');
            }, 2000);
        }
    }, [forwardMessage, loading]);

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
                // TODO: Fetch messages for this group
                // fetchMessages(groupId);
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

    const getAvatarUrl = (profileImage?: string, fullName?: string) => {
        if (profileImage) {
            return profileImage;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=009BFF&color=fff&size=128`;
    };

    const handleSend = () => {
        if (message.trim()) {
            const newMessage: Message = {
                id: Date.now().toString(),
                senderId: CURRENT_USER_ID,
                senderName: 'You',
                text: message.trim(),
                time: new Date().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                }),
                isSent: true,
                isDelivered: false,
            };

            setMessages([...messages, newMessage]);
            setMessage('');

            // TODO: Send message to backend
            // sendMessageToBackend(groupId, message.trim());
        }
    };

    const isUserAdmin = () => {
        if (!groupData) return false;
        return groupData.admins.some(admin => admin._id === CURRENT_USER_ID);
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
            <StatusBar backgroundColor="#2196F3" barStyle={Platform.OS === 'ios' ? 'light-content' : 'dark-content'} />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => router.replace("/(chats)/Groups")}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color="black" />
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

            {/* Group Info Banner (if admin) */}
            {isUserAdmin() && (
                <View style={styles.adminBanner}>
                    <Ionicons name="shield-checkmark" size={16} color="#FF9800" />
                    <Text style={styles.adminBannerText}>You are an admin</Text>
                </View>
            )}

            {/* Members Preview */}
            <View style={styles.membersPreview}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.membersScrollContent}
                >
                    {groupData.members.slice(0, 10).map((member, index) => (
                        <View key={member._id} style={styles.memberPreviewItem}>
                            <Image
                                source={{ uri: getAvatarUrl(member.profileImage, member.fullName) }}
                                style={styles.memberPreviewAvatar}
                            />
                            {groupData.admins.some(admin => admin._id === member._id) && (
                                <View style={styles.adminBadgeSmall}>
                                    <Ionicons name="star" size={10} color="#fff" />
                                </View>
                            )}
                        </View>
                    ))}
                    {groupData.members.length > 10 && (
                        <View style={styles.moreMembers}>
                            <Text style={styles.moreMembersText}>+{groupData.members.length - 10}</Text>
                        </View>
                    )}
                </ScrollView>
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
                        {messages.length === 0 ? (
                            <View style={styles.emptyMessagesContainer}>
                                <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
                                <Text style={styles.emptyMessagesText}>No messages yet</Text>
                                <Text style={styles.emptyMessagesSubtext}>
                                    Be the first to send a message!
                                </Text>
                            </View>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.senderId === CURRENT_USER_ID;
                                return (
                                    <TouchableOpacity
                                        key={msg.id}
                                        style={[styles.messageRow, isMe ? styles.messageRight : styles.messageLeft]}
                                        onLongPress={() => handleMessageLongPress(msg)}
                                        activeOpacity={0.8}
                                    >
                                        {!isMe && (
                                            <View style={styles.senderRow}>
                                                {msg.avatar && (
                                                    <Image source={{ uri: msg.avatar }} style={styles.messageAvatar} />
                                                )}
                                                <Text style={styles.senderName}>{msg.senderName}</Text>
                                            </View>
                                        )}
                                        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
                                            <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
                                                {msg.text}
                                            </Text>
                                            <View style={styles.messageFooter}>
                                                <Text style={[styles.msgTime, isMe ? styles.myTime : styles.theirTime]}>
                                                    {msg.time}
                                                </Text>
                                                {isMe && (
                                                    <Ionicons
                                                        name={msg.isDelivered ? "checkmark-done" : "checkmark"}
                                                        size={16}
                                                        color={msg.isDelivered ? "#4CAF50" : "rgba(255, 255, 255, 0.6)"}
                                                        style={styles.checkmark}
                                                    />
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
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
                        onChangeText={setMessage}
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

            <GlobalMessage
                type={messageType}
                message={messageText}
                visible={messageVisible}
                onClose={() => setMessageVisible(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#E9F0F7' },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
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
        color: '#666',
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
    groupName: { fontSize: 14, fontWeight: '600', color: 'black' },
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
        paddingVertical: 12, 
        paddingHorizontal: 10,
        paddingBottom: 20, // Extra padding at bottom
    },
    messageRow: { flexDirection: 'row', marginVertical: 6, alignItems: 'flex-end' },
    messageLeft: { justifyContent: 'flex-start' },
    messageRight: { justifyContent: 'flex-end', alignSelf: 'flex-end' },
    messageAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
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
    senderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        marginLeft: 4,
    },
    senderName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#009BFF',
        marginLeft: 6,
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        justifyContent: 'flex-end',
    },
    checkmark: {
        marginLeft: 4,
    },
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