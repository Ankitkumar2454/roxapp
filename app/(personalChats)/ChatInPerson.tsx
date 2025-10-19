import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Image,
    Keyboard,
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
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
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
    messageType?: 'text' | 'image' | 'voice';
    mediaUrl?: string;
    mediaThumbnail?: string;
    voiceDuration?: number; // in seconds
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

    // Media features states
    const [showMediaOptions, setShowMediaOptions] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showImagePreview, setShowImagePreview] = useState(false);

    // Audio recording states
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [recordingUri, setRecordingUri] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [playbackPosition, setPlaybackPosition] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(0);

    const scrollViewRef = useRef<ScrollView>(null);
    const socketRef = useRef<Socket | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);
    const forwardedMessageRef = useRef<string | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
    const playbackStatusRef = useRef<Audio.Sound | null>(null);

    const friendId = params.friendId as string;
    const friendName = params.friendName as string;
    const friendAvatar = params.friendAvatar as string;
    const forwardMessage = params.forwardMessage as string;
    const [keyboardVisible, setKeyboardVisible] = useState(false);


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
            socketRef.current.on('typing:start', (d) => {
                setIsTyping(d.userId !== userData._id);
                // Clear input when someone else is typing
                if (d.userId !== userData._id) {
                    setMessage('');
                }
            });
            socketRef.current.on('typing:stop', (d) => {
                setIsTyping(false);
            });

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

    // Media handling functions
    const handleImageSelection = () => {
        // TODO: Implement image picker integration
        Alert.alert('Image Selection', 'Image picker integration will be implemented here');
        setShowMediaOptions(false);
    };

    const startRecording = async () => {
        try {
            // Request audio permissions
            const permissionResponse = await Audio.requestPermissionsAsync();
            if (permissionResponse.status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant microphone permission to record voice messages.');
                return;
            }

            // Configure audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // Start recording
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(recording);
            setIsRecording(true);
            setRecordingDuration(0);

            // Start duration timer
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

            console.log('Recording started');
        } catch (error) {
            console.error('Failed to start recording:', error);
            Alert.alert('Recording Error', 'Failed to start voice recording. Please try again.');
        }
    };

    const stopRecording = async () => {
        try {
            if (!recording) return;

            setIsRecording(false);
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }

            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecordingUri(uri);
            setRecording(null);

            console.log('Recording stopped and stored at', uri);

            // Auto-send the voice message if duration > 1 second
            if (recordingDuration > 0) {
                handleSendVoice(uri!, recordingDuration);
            }
        } catch (error) {
            console.error('Failed to stop recording:', error);
            Alert.alert('Recording Error', 'Failed to stop voice recording.');
        }
    };

    const handleVoiceRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
        setShowMediaOptions(false);
    };

    const handleSendImage = () => {
        if (selectedImage) {
            const tempId = Date.now().toString();
            const newMessage: Message = {
                id: tempId,
                senderId: currentUserId,
                text: 'Image',
                content: 'Image',
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                isSent: true,
                messageType: 'image',
                mediaUrl: selectedImage,
                mediaThumbnail: selectedImage,
            };
            setMessages((prev) => [...prev, newMessage]);
            setSelectedImage(null);
            setShowImagePreview(false);
            scrollToEnd();

            // TODO: Send image to backend
            console.log('Sending image:', selectedImage);
        }
    };

    const playVoiceMessage = async (voiceUrl: string) => {
        try {
            if (isPlaying && sound) {
                // Stop current playback
                await sound.stopAsync();
                setIsPlaying(false);
                setSound(null);
                return;
            }

            // Configure audio mode for playback
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });

            // Load and play the sound
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: voiceUrl },
                { shouldPlay: true }
            );

            setSound(newSound);
            setIsPlaying(true);

            // Set up playback status updates
            newSound.setOnPlaybackStatusUpdate((status: any) => {
                if (status.isLoaded) {
                    setPlaybackPosition(status.positionMillis || 0);
                    setPlaybackDuration(status.durationMillis || 0);

                    if (status.didJustFinish) {
                        setIsPlaying(false);
                        setSound(null);
                        setPlaybackPosition(0);
                    }
                }
            });

            console.log('Playing voice message');
        } catch (error) {
            console.error('Failed to play voice message:', error);
            Alert.alert('Playback Error', 'Failed to play voice message.');
        }
    };

    const handleSendVoice = async (voiceUrl: string, duration: number) => {
        try {
            const tempId = Date.now().toString();
            const newMessage: Message = {
                id: tempId,
                senderId: currentUserId,
                text: 'Voice message',
                content: 'Voice message',
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                isSent: true,
                messageType: 'voice',
                mediaUrl: voiceUrl,
                voiceDuration: duration,
            };
            setMessages((prev) => [...prev, newMessage]);
            scrollToEnd();

            // Send voice to backend via socket
            if (socketRef.current) {
                // Convert audio file to base64 for sending
                const base64Audio = await FileSystem.readAsStringAsync(voiceUrl, {
                    encoding: 'base64',
                });

                socketRef.current.emit('message:send', {
                    receiverId: friendId,
                    content: 'Voice message',
                    messageType: 'voice',
                    mediaData: base64Audio,
                    duration: duration,
                });
            }

            console.log('Voice message sent:', voiceUrl, 'Duration:', duration);
        } catch (error) {
            console.error('Failed to send voice message:', error);
            Alert.alert('Send Error', 'Failed to send voice message. Please try again.');
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Animated Typing Indicator Component
    const AnimatedTypingIndicator = () => {
        const dot1Anim = useRef(new Animated.Value(0.3)).current;
        const dot2Anim = useRef(new Animated.Value(0.3)).current;
        const dot3Anim = useRef(new Animated.Value(0.3)).current;
        const waveAnim = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            // Create staggered dot animations
            const createDotAnimation = (animValue: Animated.Value, delay: number) => {
                return Animated.loop(
                    Animated.sequence([
                        Animated.delay(delay),
                        Animated.timing(animValue, {
                            toValue: 1,
                            duration: 400,
                            easing: Easing.out(Easing.quad),
                            useNativeDriver: true,
                        }),
                        Animated.timing(animValue, {
                            toValue: 0.3,
                            duration: 400,
                            easing: Easing.in(Easing.quad),
                            useNativeDriver: true,
                        }),
                    ])
                );
            };

            // Create wave animation
            const createWaveAnimation = () => {
                return Animated.loop(
                    Animated.timing(waveAnim, {
                        toValue: 1,
                        duration: 1200,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    })
                );
            };

            // Start all animations
            const dot1Animation = createDotAnimation(dot1Anim, 0);
            const dot2Animation = createDotAnimation(dot2Anim, 200);
            const dot3Animation = createDotAnimation(dot3Anim, 400);
            const waveAnimation = createWaveAnimation();

            dot1Animation.start();
            dot2Animation.start();
            dot3Animation.start();
            waveAnimation.start();

            return () => {
                dot1Animation.stop();
                dot2Animation.stop();
                dot3Animation.stop();
                waveAnimation.stop();
            };
        }, []);

        return (
            <View style={styles.typingIndicator}>
                <View style={styles.typingTextContainer}>
                    <Text style={styles.typingText}>Typing</Text>
                </View>
                <View style={styles.dotsContainer}>
                    <Animated.View
                        style={[
                            styles.animatedDot,
                            {
                                opacity: dot1Anim,
                                transform: [{
                                    scale: dot1Anim.interpolate({
                                        inputRange: [0.3, 1],
                                        outputRange: [0.8, 1.2]
                                    })
                                }]
                            }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.animatedDot,
                            {
                                opacity: dot2Anim,
                                transform: [{
                                    scale: dot2Anim.interpolate({
                                        inputRange: [0.3, 1],
                                        outputRange: [0.8, 1.2]
                                    })
                                }]
                            }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.animatedDot,
                            {
                                opacity: dot3Anim,
                                transform: [{
                                    scale: dot3Anim.interpolate({
                                        inputRange: [0.3, 1],
                                        outputRange: [0.8, 1.2]
                                    })
                                }]
                            }
                        ]}
                    />
                </View>
            </View>
        );
    };

    // Clear input when typing indicator is shown
    useEffect(() => {
        if (isTyping) {
            setMessage('');
        }
    }, [isTyping]);

    // Auto-scroll when typing indicator appears
    useEffect(() => {
        if (isTyping) {
            setTimeout(() => {
                scrollToEnd();
            }, 100);
        }
    }, [isTyping]);

    useEffect(() => {
        initializeSocket();
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            // Cleanup audio resources
            if (sound) {
                sound.unloadAsync();
            }
            if (recording) {
                recording.stopAndUnloadAsync();
            }
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
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
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {/* Messages */}
                <View style={styles.chatContainer}>
                    <ScrollView
                        ref={scrollViewRef}
                        contentContainerStyle={[styles.chatScroll, { paddingBottom: 20 }]}
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
                                        {msg.messageType === 'image' ? (
                                            <View style={styles.imageMessageContainer}>
                                                <Image
                                                    source={{ uri: msg.mediaUrl }}
                                                    style={styles.messageImage}
                                                    resizeMode="cover"
                                                />
                                                <View style={styles.imageOverlay}>
                                                    <Ionicons name="image" size={16} color="#fff" />
                                                </View>
                                            </View>
                                        ) : msg.messageType === 'voice' ? (
                                            <View style={styles.voiceMessageContainer}>
                                                <TouchableOpacity
                                                    style={styles.voicePlayButton}
                                                    onPress={() => msg.mediaUrl && playVoiceMessage(msg.mediaUrl)}
                                                >
                                                    <Ionicons
                                                        name={isPlaying && sound ? "pause" : "play"}
                                                        size={20}
                                                        color={isMe ? "#fff" : "#2196F3"}
                                                    />
                                                </TouchableOpacity>
                                                <View style={styles.voiceWaveform}>
                                                    <View style={[styles.voiceBar, { height: 8 }]} />
                                                    <View style={[styles.voiceBar, { height: 12 }]} />
                                                    <View style={[styles.voiceBar, { height: 6 }]} />
                                                    <View style={[styles.voiceBar, { height: 10 }]} />
                                                    <View style={[styles.voiceBar, { height: 4 }]} />
                                                </View>
                                                <Text style={[styles.voiceDuration, isMe ? styles.myText : styles.theirText]}>
                                                    {msg.voiceDuration ? formatDuration(msg.voiceDuration) : '0:00'}
                                                </Text>
                                            </View>
                                        ) : (
                                            <View style={styles.messageContentContainer}>
                                                {msg.text.startsWith('Forwarded: ') && (
                                                    <View style={styles.forwardedMessageHeader}>
                                                        <Ionicons
                                                            name="arrow-forward"
                                                            size={14}
                                                            color={isMe ? "rgba(255,255,255,0.7)" : "#666"}
                                                        />
                                                        <Text style={[styles.forwardedLabel, isMe ? styles.myForwardedLabel : styles.theirForwardedLabel]}>
                                                            Forwarded
                                                        </Text>
                                                    </View>
                                                )}
                                                <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
                                                    {msg.text.startsWith('Forwarded: ') ? msg.text.substring(11) : msg.text}
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={[styles.msgTime, isMe ? styles.myTime : styles.theirTime]}>
                                            {msg.time}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                        {isTyping && (
                            <View style={[styles.messageRow, styles.messageLeft, styles.typingIndicatorContainer]}>
                                <Image source={{ uri: friendAvatar }} style={styles.msgAvatar} />
                                <AnimatedTypingIndicator />
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
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#fff',
                    marginHorizontal: screenWidth * 0.025,
                    marginBottom: keyboardVisible ? screenHeight * 0.045 : screenHeight * 0.015 ,
                    borderRadius: screenWidth * 0.06,
                    paddingHorizontal: screenWidth * 0.03,
                    paddingVertical: screenHeight * 0.01,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                    elevation: 3,
                }}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => setShowMediaOptions(!showMediaOptions)}
                    >
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
                    {isRecording ? (
                        <View style={styles.recordingContainer}>
                            <View style={styles.recordingIndicator}>
                                <View style={styles.recordingDot} />
                            </View>
                            <Text style={styles.recordingText}>{formatDuration(recordingDuration)}</Text>
                            <TouchableOpacity
                                style={styles.recordingButton}
                                onPress={handleVoiceRecording}
                            >
                                <Ionicons name="stop" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.sendButton, !message.trim() && { opacity: 0.5 }]}
                            onPress={handleSend}
                            disabled={!message.trim()}
                        >
                            <Ionicons name="send" size={22} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Media Options Modal */}
                <Modal
                    visible={showMediaOptions}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowMediaOptions(false)}
                >
                    <TouchableOpacity
                        style={styles.mediaModalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowMediaOptions(false)}
                    >
                        <View style={styles.mediaOptionsContainer}>
                            <TouchableOpacity
                                style={styles.mediaOption}
                                onPress={handleImageSelection}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.mediaOptionIcon, { backgroundColor: '#4CAF50' }]}>
                                    <Ionicons name="image" size={24} color="#fff" />
                                </View>
                                <Text style={styles.mediaOptionText}>Photo</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.mediaOption}
                                onPress={handleVoiceRecording}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.mediaOptionIcon, { backgroundColor: '#FF9800' }]}>
                                    <Ionicons name="mic" size={24} color="#fff" />
                                </View>
                                <Text style={styles.mediaOptionText}>Voice</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Image Preview Modal */}
                <Modal
                    visible={showImagePreview}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowImagePreview(false)}
                >
                    <View style={styles.imagePreviewOverlay}>
                        <View style={styles.imagePreviewContainer}>
                            {selectedImage && (
                                <Image
                                    source={{ uri: selectedImage }}
                                    style={styles.previewImage}
                                    resizeMode="contain"
                                />
                            )}
                            <View style={styles.imagePreviewActions}>
                                <TouchableOpacity
                                    style={styles.previewCancelButton}
                                    onPress={() => {
                                        setSelectedImage(null);
                                        setShowImagePreview(false);
                                    }}
                                >
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.previewSendButton}
                                    onPress={handleSendImage}
                                >
                                    <Ionicons name="send" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
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
    keyboardAvoidingContainer: { flex: 1 },
    chatContainer: {
        flex: 1,
        marginTop: screenHeight * 0.01,
        backgroundColor: '#E9F0F7',
        paddingBottom: screenHeight * 0.015,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: screenHeight * 0.013,
        paddingHorizontal: screenWidth * 0.02,
        marginHorizontal: screenWidth * 0.025,
        marginTop: screenHeight * 0.03,
        backgroundColor: '#fff',
        borderRadius: screenWidth * 0.11,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        zIndex: 1000,
    },
    backButton: {
        padding: screenWidth * 0.015,
        borderRadius: screenWidth * 0.04,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginLeft: screenWidth * 0.03,
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginLeft: screenWidth * 0.02,
    },
    headerIcons: {
        flexDirection: 'row',
        gap: screenWidth * 0.015,
        marginRight: screenWidth * 0.03,
    },
    headerIconButton: {
        padding: screenWidth * 0.015,
        borderRadius: screenWidth * 0.03,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    userInfo: { flex: 1, marginLeft: screenWidth * 0.02 },
    avatar: { width: screenWidth * 0.08, height: screenWidth * 0.08, borderRadius: screenWidth * 0.04 },
    friendName: { fontSize: screenWidth * 0.035, fontWeight: '600', color: 'black' },
    statusText: { fontSize: screenWidth * 0.025, color: 'gray' },

    chatScroll: {
        flexGrow: 1,
        paddingVertical: screenHeight * 0.015,
        paddingHorizontal: screenWidth * 0.025,
        paddingBottom: screenHeight * 0.03,
    },
    messageRow: { flexDirection: 'row', marginVertical: screenHeight * 0.008, alignItems: 'flex-end' },
    messageLeft: { justifyContent: 'flex-start' },
    messageRight: { justifyContent: 'flex-end', alignSelf: 'flex-end' },
    typingIndicatorContainer: { marginBottom: 0 },
    msgAvatar: { width: screenWidth * 0.07, height: screenWidth * 0.07, borderRadius: screenWidth * 0.035, marginRight: screenWidth * 0.02 },

    messageBubble: {
        maxWidth: '75%',
        borderRadius: screenWidth * 0.05,
        paddingHorizontal: screenWidth * 0.035,
        paddingVertical: screenHeight * 0.012,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    myBubble: { backgroundColor: '#2196F3', borderBottomRightRadius: screenWidth * 0.01 },
    theirBubble: { backgroundColor: '#fff', borderBottomLeftRadius: screenWidth * 0.01 },
    forwardingBubble: { backgroundColor: '#FF9800', opacity: 0.8 },
    messageText: { fontSize: screenWidth * 0.035 },
    myText: { color: '#fff' },
    theirText: { color: '#333' },
    msgTime: { fontSize: screenWidth * 0.025, marginTop: screenHeight * 0.003, textAlign: 'right' },
    myTime: { color: 'rgba(255,255,255,0.7)' },
    theirTime: { color: '#999' },

    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: screenWidth * 0.05,
        paddingHorizontal: screenWidth * 0.04,
        paddingVertical: screenHeight * 0.012,
        maxWidth: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    typingTextContainer: { marginRight: screenWidth * 0.02 },
    typingText: { fontSize: screenWidth * 0.035, color: '#666', fontWeight: '500' },
    dotsContainer: { flexDirection: 'row', alignItems: 'center' },
    animatedDot: { width: screenWidth * 0.015, height: screenWidth * 0.015, borderRadius: screenWidth * 0.0075, backgroundColor: '#999', marginHorizontal: screenWidth * 0.005 },

    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: screenWidth * 0.025,
        marginBottom: screenHeight * 0.015,
        borderRadius: screenWidth * 0.06,
        paddingHorizontal: screenWidth * 0.03,
        paddingVertical: screenHeight * 0.01,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 3,
    },
    iconButton: { paddingHorizontal: screenWidth * 0.015 },
    input: {
        flex: 1,
        fontSize: screenWidth * 0.035,
        maxHeight: screenHeight * 0.12,
        paddingHorizontal: screenWidth * 0.025,
        color: '#000',
    },
    sendButton: {
        backgroundColor: '#007AFF',
        borderRadius: screenWidth * 0.05,
        width: screenWidth * 0.1,
        height: screenWidth * 0.1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordingButton: {
        backgroundColor: '#FF5722',
        borderRadius: screenWidth * 0.05,
        width: screenWidth * 0.1,
        height: screenWidth * 0.1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF5722',
        borderRadius: screenWidth * 0.05,
        paddingHorizontal: screenWidth * 0.03,
        paddingVertical: screenHeight * 0.01,
    },
    recordingIndicator: { marginRight: screenWidth * 0.02 },
    recordingDot: { width: screenWidth * 0.02, height: screenWidth * 0.02, borderRadius: screenWidth * 0.01, backgroundColor: '#fff' },
    recordingText: { color: '#fff', fontSize: screenWidth * 0.035, fontWeight: '600', marginRight: screenWidth * 0.02, minWidth: screenWidth * 0.1 },

    // Forwarded message
    messageContentContainer: { flex: 1 },
    forwardedMessageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: screenHeight * 0.005 },
    forwardedLabel: { fontSize: screenWidth * 0.03, fontWeight: '500', marginLeft: screenWidth * 0.01 },
    myForwardedLabel: { color: 'rgba(255,255,255,0.7)' },
    theirForwardedLabel: { color: '#666' },

    // Media message
    imageMessageContainer: { position: 'relative', borderRadius: screenWidth * 0.03, overflow: 'hidden' },
    messageImage: { width: screenWidth * 0.5, height: screenWidth * 0.5, borderRadius: screenWidth * 0.03 },
    imageOverlay: { position: 'absolute', top: screenHeight * 0.01, right: screenWidth * 0.02, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: screenWidth * 0.03, padding: screenWidth * 0.015 },
    voiceMessageContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: screenHeight * 0.012, paddingHorizontal: screenWidth * 0.03, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: screenWidth * 0.05, minWidth: screenWidth * 0.3 },
    voicePlayButton: { width: screenWidth * 0.08, height: screenWidth * 0.08, borderRadius: screenWidth * 0.04, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: screenWidth * 0.02 },
    voiceWaveform: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: screenWidth * 0.02, gap: screenWidth * 0.003 },
    voiceBar: { width: screenWidth * 0.008, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: screenWidth * 0.004 },
    voiceDuration: { fontSize: screenWidth * 0.03, fontWeight: '500' },

    // Media options modal
    mediaModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
    mediaOptionsContainer: { backgroundColor: '#fff', borderTopLeftRadius: screenWidth * 0.05, borderTopRightRadius: screenWidth * 0.05, paddingHorizontal: screenWidth * 0.05, paddingVertical: screenHeight * 0.03, flexDirection: 'row', justifyContent: 'space-around', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
    mediaOption: { alignItems: 'center', flex: 1 },
    mediaOptionIcon: { width: screenWidth * 0.15, height: screenWidth * 0.15, borderRadius: screenWidth * 0.075, alignItems: 'center', justifyContent: 'center', marginBottom: screenHeight * 0.008 },
    mediaOptionText: { fontSize: screenWidth * 0.035, fontWeight: '500', color: '#333' },

    // Image preview modal
    imagePreviewOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
    imagePreviewContainer: { width: screenWidth * 0.9, height: screenHeight * 0.7, position: 'relative' },
    previewImage: { width: '100%', height: '100%', borderRadius: screenWidth * 0.03 },
    imagePreviewActions: { position: 'absolute', bottom: screenHeight * 0.03, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: screenWidth * 0.05 },
    previewCancelButton: { width: screenWidth * 0.12, height: screenWidth * 0.12, borderRadius: screenWidth * 0.06, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    previewSendButton: { width: screenWidth * 0.12, height: screenWidth * 0.12, borderRadius: screenWidth * 0.06, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center' },

    avatarContainer: { position: 'relative' },
    avatarPlaceholder: { width: screenWidth * 0.08, height: screenWidth * 0.08, borderRadius: screenWidth * 0.04, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: screenWidth * 0.035, fontWeight: '600', color: '#fff' },
    activeIndicator: { position: 'absolute', bottom: screenHeight * 0.002, right: screenWidth * 0.005, width: screenWidth * 0.03, height: screenWidth * 0.03, borderRadius: screenWidth * 0.015, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#fff' },

    // Forward Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
    forwardModal: { backgroundColor: '#fff', borderTopLeftRadius: screenWidth * 0.05, borderTopRightRadius: screenWidth * 0.05, maxHeight: '80%', minHeight: '50%' },
    forwardModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: screenWidth * 0.05, paddingVertical: screenHeight * 0.02, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
    forwardModalTitle: { fontSize: screenWidth * 0.045, fontWeight: '600', color: '#333' },
    selectedMessagePreview: { backgroundColor: '#F5F5F5', marginHorizontal: screenWidth * 0.05, marginVertical: screenHeight * 0.015, paddingHorizontal: screenWidth * 0.04, paddingVertical: screenHeight * 0.015, borderRadius: screenWidth * 0.03, borderLeftWidth: 4, borderLeftColor: '#009BFF' },
    messagePreviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: screenHeight * 0.005 },
    messagePreviewLabel: { fontSize: screenWidth * 0.03, color: '#666', fontWeight: '600' },
    forwardedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF9800', paddingHorizontal: screenWidth * 0.02, paddingVertical: screenHeight * 0.005, borderRadius: screenWidth * 0.03, gap: screenWidth * 0.005 },
    forwardedBadgeText: { fontSize: screenWidth * 0.025, color: '#fff', fontWeight: '600' },
    selectedMessageText: { fontSize: screenWidth * 0.035, color: '#666', fontStyle: 'italic' },
    forwardLoadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: screenHeight * 0.05 },
    forwardLoadingText: { marginTop: screenHeight * 0.015, fontSize: screenWidth * 0.035, color: '#666' },
    forwardListContent: { paddingVertical: screenHeight * 0.01 },
    forwardContactItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: screenWidth * 0.05, paddingVertical: screenHeight * 0.015, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    forwardContactAvatar: { marginRight: screenWidth * 0.03 },
    forwardAvatarPlaceholder: { width: screenWidth * 0.11, height: screenWidth * 0.11, borderRadius: screenWidth * 0.055, alignItems: 'center', justifyContent: 'center' },
    forwardAvatarText: { fontSize: screenWidth * 0.04, fontWeight: '600', color: '#fff' },
    forwardContactInfo: { flex: 1 },
    forwardContactName: { fontSize: screenWidth * 0.04, fontWeight: '600', color: '#333', marginBottom: screenHeight * 0.003 },
    forwardContactType: { fontSize: screenWidth * 0.03, color: '#666' },
    forwardEmptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: screenHeight * 0.08 },
    forwardEmptyText: { fontSize: screenWidth * 0.04, color: '#999', marginTop: screenHeight * 0.015 },
});