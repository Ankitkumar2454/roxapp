import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { GroupData, Message } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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



const CURRENT_USER_ID = 'me'; // This should come from your auth state

export default function GroupChatScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const groupId = params.groupId as string;

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [groupData, setGroupData] = useState<GroupData | null>(null);
    const [loading, setLoading] = useState(true);
    const [messageVisible, setMessageVisible] = useState(false);
    const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
    const [messageText, setMessageText] = useState('');

    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (groupId) {
            fetchGroupData();
        }
    }, [groupId]);

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

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
            {/* Header */}
            <LinearGradient
                colors={['#009BFF', '#0066CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity
                    onPress={() => router.replace("/(chats)/Groups")}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.headerCenter}
                    onPress={() => {
                        // TODO: Navigate to group info screen
                        router.replace({
                            pathname: "/(GroupChats)/GroupDescription",
                            params: {
                                groupId
                            }
                        })
                        // router.push({ pathname: '/(groups)/GroupInfo', params: { groupId } });
                    }}
                >
                    <Image
                        source={{
                            uri: groupData.groupImage ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(groupData.name)}&background=009BFF&color=fff&size=128`
                        }}
                        style={styles.avatar}
                    />
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerName} numberOfLines={1}>
                            {groupData.name}
                        </Text>
                        <Text style={styles.headerPhone}>
                            {groupData.members.length} {groupData.members.length === 1 ? 'member' : 'members'}
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Ionicons name="call-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

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

            {/* KeyboardAvoidingView wraps ScrollView + Input */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {/* Messages */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
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
                                <View key={msg.id} style={{ marginBottom: 12 }}>
                                    {!isMe && (
                                        <View style={styles.senderRow}>
                                            {msg.avatar && (
                                                <Image source={{ uri: msg.avatar }} style={styles.messageAvatar} />
                                            )}
                                            <Text style={styles.senderName}>{msg.senderName}</Text>
                                        </View>
                                    )}
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
                                                    name={msg.isDelivered ? "checkmark-done" : "checkmark"}
                                                    size={16}
                                                    color={msg.isDelivered ? "#4CAF50" : "rgba(255, 255, 255, 0.6)"}
                                                    style={styles.checkmark}
                                                />
                                            )}
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>

                {/* Input */}
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachButton}>
                        <Ionicons name="add-circle" size={32} color="#009BFF" />
                    </TouchableOpacity>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor="#999"
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            maxLength={1000}
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            !message.trim() && styles.sendButtonDisabled
                        ]}
                        onPress={handleSend}
                        disabled={!message.trim()}
                    >
                        <LinearGradient
                            colors={message.trim() ? ['#009BFF', '#0066CC'] : ['#E0E0E0', '#BDBDBD']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.sendButtonGradient}
                        >
                            <Ionicons
                                name="send"
                                size={20}
                                color="#fff"
                            />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 50,
    },
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#fff',
    },
    headerInfo: {
        flex: 1,
    },
    headerName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
    },
    headerPhone: {
        fontSize: 13,
        color: '#fff',
        marginTop: 2,
        opacity: 0.9,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        marginLeft: 16,
        padding: 4,
    },
    adminBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF3E0',
        paddingVertical: 6,
        gap: 6,
    },
    adminBannerText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FF9800',
    },
    membersPreview: {
        backgroundColor: '#F8F8F8',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
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
    messagesContainer: {
        flex: 1,
        backgroundColor: '#F0F4F8',
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 20,
        flexGrow: 1,
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
    messageAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    messageBubble: {
        maxWidth: '75%',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    sentBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#009BFF',
        borderBottomRightRadius: 4,
    },
    receivedBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    messageText: {
        fontSize: 15,
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
        justifyContent: 'flex-end',
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
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    attachButton: {
        marginRight: 8,
        marginBottom: 6,
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    input: {
        fontSize: 15,
        color: '#000',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginLeft: 8,
        overflow: 'hidden',
    },
    sendButtonDisabled: {
        opacity: 0.6,
    },
    sendButtonGradient: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
});