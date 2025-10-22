import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import { darkTheme, lightTheme } from "@/src/constants/color";
import { ThemeContext } from "@/src/services/ThemeContext";
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
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
    messageType?: 'text' | 'image' | 'video' | 'voice' | 'audio' | 'document';
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
    const { theme, toggleTheme } = useContext(ThemeContext);
    const currentTheme = theme === 'dark' ? darkTheme : lightTheme;
    const styles = createStyles(currentTheme);
    const router = useRouter();
    const params = useLocalSearchParams();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isInCall, setIsInCall] = useState(false);
    const [currentCallId, setCurrentCallId] = useState<string | null>(null);
    const [currentCallType, setCurrentCallType] = useState<'voice' | 'video' | null>(null);
    const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'active'>('idle');
    const [incomingCall, setIncomingCall] = useState<null | { callId: string; initiator: any; callType: 'voice' | 'video'; isGroupCall: boolean; groupId?: string | null }>(null);
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

    // Image/Video upload states
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<{
        uri: string;
        type: 'image' | 'video' | 'audio' | 'document';
        name: string;
        size: number;
    } | null>(null);

    // Audio recording states
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [recordingUri, setRecordingUri] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [playbackPosition, setPlaybackPosition] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(0);
    const [ringtone, setRingtone] = useState<Audio.Sound | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);
    const socketRef = useRef<Socket | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);
    const forwardedMessageRef = useRef<string | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
    const playbackStatusRef = useRef<Audio.Sound | null>(null);

    const startRingtone = async () => {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                interruptionModeIOS: 1,
                interruptionModeAndroid: 1,
                shouldDuckAndroid: true,
            });
            if (ringtone) {
                await ringtone.stopAsync();
                await ringtone.unloadAsync();
                setRingtone(null);
            }
            const { sound: ring } = await Audio.Sound.createAsync(
                require("../../assets/sounds/ringtone.mp3"),
                { isLooping: true, volume: 1.0, shouldPlay: true }
            );
            setRingtone(ring);
        } catch (e) {
            console.warn('Failed to start ringtone', e);
        }
    };

    const stopRingtone = async () => {
        try {
            if (ringtone) {
                await ringtone.stopAsync();
                await ringtone.unloadAsync();
                setRingtone(null);
            }
        } catch (e) {
            console.warn('Failed to stop ringtone', e);
        }
    };

    const friendId = params.friendId as string;
    const friendName = params.friendName as string;
    const friendAvatar = params.friendAvatar as string;
    const forwardMessage = params.forwardMessage as string;

    const getRandomColor = () => {
        const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    // Generate consistent color based on name hash
    const getConsistentColor = (name: string): string => {
        const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
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
            console.log(response.data, "response.data.data.result.messages");
            if (response.data?.success
                && response.data?.data?.messages
                && response.data?.data?.messages.length > 0) {
                const formattedMessages: Message[] = response.data?.data?.messages.map((msg: any) => ({
                    _id: msg._id,
                    id: msg._id,
                    senderId: msg.sender._id,
                    sender: msg.sender,
                    text: msg.content,
                    content: msg.content,
                    time: formatTime(msg.createdAt),
                    isSent: msg.sender._id === userId,
                    isDelivered: msg.status === 'delivered' || msg.status === 'read',
                    isRead: true,
                    mediaUrl: msg.mediaUrl,
                }));
                console.log('formattedMessages', response.data?.data?.messages);
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
            socketRef.current.on('message:delivered', handleMessageDelivered);
            socketRef.current.on('message:read', handleMessageRead);
            // Call events
            socketRef.current.on('call:incoming', (data: any) => {
                setIncomingCall({
                    callId: data.callId,
                    initiator: data.initiator,
                    callType: data.callType,
                    isGroupCall: data.isGroupCall,
                    groupId: data.groupId,
                });
                setCurrentCallId(data.callId);
                setCurrentCallType(data.callType);
                setIsInCall(true);
                setCallStatus('ringing');
                startRingtone();
            });
            socketRef.current.on('call:initiated', (data: any) => {
                setCurrentCallId(data.callId);
                setCallStatus('ringing');
                setIsInCall(true);
            });
            socketRef.current.on('call:answered', (_data: any) => {
                setCallStatus('active');
                setIncomingCall(null);
                stopRingtone();
            });
            socketRef.current.on('call:ended', () => {
                setIsInCall(false);
                setCallStatus('idle');
                setCurrentCallId(null);
                setCurrentCallType(null);
                setIncomingCall(null);
                stopRingtone();
            });
            socketRef.current.on('call:error', (err: any) => {
                Alert.alert('Call Error', err?.error || 'An error occurred with the call');
                setIsInCall(false);
                setCallStatus('idle');
                setCurrentCallId(null);
                setCurrentCallType(null);
                setIncomingCall(null);
                stopRingtone();
            });
            socketRef.current.on('call:decline', () => {
                stopRingtone();
                setIsInCall(false);
                setCallStatus('idle');
                setIncomingCall(null);
                setCurrentCallId(null);
                setCurrentCallType(null);
            });
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
        setMessages((prev) => {
            // Check if this is a message from current user (confirmation)
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
                        isRead: false,
                    };
                    return updatedMessages;
                }
            }

            // Check if message already exists to prevent duplicates
            const messageExists = prev.some(existingMsg => existingMsg._id === msg._id);
            if (messageExists) {
                return prev;
            }

            const newMsg: Message = {
                _id: msg._id,
                id: msg._id,
                senderId: msg.sender._id,
                sender: msg.sender,
                text: msg.content,
                content: msg.content,
                time: formatTime(msg.createdAt),
                isSent: msg.sender._id === currentUserId,
                isDelivered: msg.sender._id === currentUserId,
                isRead: false,
                messageType: msg.messageType || 'text',
                mediaUrl: msg.mediaUrl,
                mediaThumbnail: msg.mediaThumbnail,
                voiceDuration: msg.duration,
            };

            return [...prev, newMsg];
        });
        scrollToEnd();
    };

    const handleMessageDelivered = (data: any) => {
        const { messageId } = data;
        setMessages(prev => prev.map(msg => {
            if (msg._id === messageId) {
                return {
                    ...msg,
                    isDelivered: true,
                };
            }
            return msg;
        }));
    };

    const handleMessageRead = (data: any) => {
        const { messageId } = data;
        setMessages(prev => prev.map(msg => {
            if (msg._id === messageId) {
                return {
                    ...msg,
                    isRead: true,
                };
            }
            return msg;
        }));
    };


    const markMessagesAsRead = async () => {
        try {
            // Get unread messages from the other user
            const unreadMessages = messages.filter(msg =>
                msg.senderId !== currentUserId && !msg.isRead
            );

            if (unreadMessages.length > 0 && socketRef.current) {
                // Emit read receipt for each unread message
                unreadMessages.forEach(msg => {
                    if (msg._id) {
                        socketRef.current?.emit('message:read', {
                            messageId: msg._id,
                            receiverId: friendId,
                        });
                    }
                });

                // Update local state
                setMessages(prev => prev.map(msg => {
                    if (msg.senderId !== currentUserId && !msg.isRead) {
                        return { ...msg, isRead: true };
                    }
                    return msg;
                }));
            }
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
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

    const handleMessageLongPress = (message: Message) => {
        setSelectedMessage(message);
        setShowForwardModal(true);
        fetchForwardContacts();
    };

    const fetchForwardContacts = async () => {
        try {
            setForwardLoading(true);

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
            console.log('Starting voice upload process...', voiceUrl, duration);
            
            // Upload the voice file to server first
            const uploadedUrl = await uploadMedia(voiceUrl, 'audio', `voice_${Date.now()}.m4a`);
            
            console.log('Voice uploaded successfully:', uploadedUrl);
            
            const tempId = Date.now().toString();
            const newMessage: Message = {
                id: tempId,
                senderId: currentUserId,
                text: uploadedUrl, // Use the uploaded URL
                content: uploadedUrl,
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                isSent: true,
                messageType: 'audio',
                mediaUrl: uploadedUrl,
                voiceDuration: duration,
            };
            setMessages((prev) => [...prev, newMessage]);
            scrollToEnd();

            // Send voice message via socket with the uploaded URL
            if (socketRef.current) {
                socketRef.current.emit('message:send', {
                    receiverId: friendId,
                    content: uploadedUrl,
                    messageType: 'audio',
                });
            }

            console.log('Voice message sent:', uploadedUrl, 'Duration:', duration);
        } catch (error) {
            console.error('Failed to send voice message:', error);
            Alert.alert('Send Error', 'Failed to send voice message. Please try again.');
        }
    };

    // Image and Video Upload Functions
    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setSelectedMedia({
                    uri: asset.uri,
                    type: 'image',
                    name: asset.fileName || `image_${Date.now()}.jpg`,
                    size: asset.fileSize || 0,
                });
                setShowMediaOptions(false);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const pickVideo = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setSelectedMedia({
                    uri: asset.uri,
                    type: 'video',
                    name: asset.fileName || `video_${Date.now()}.mp4`,
                    size: asset.fileSize || 0,
                });
                setShowMediaOptions(false);
            }
        } catch (error) {
            console.error('Error picking video:', error);
            Alert.alert('Error', 'Failed to pick video. Please try again.');
        }
    };

    const pickAudio = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/*'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setSelectedMedia({
                    uri: asset.uri,
                    type: 'audio',
                    name: asset.name || `audio_${Date.now()}.mp3`,
                    size: asset.size || 0,
                });
                setShowMediaOptions(false);
            }
        } catch (error) {
            console.error('Error picking audio:', error);
            Alert.alert('Error', 'Failed to pick audio file. Please try again.');
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setSelectedMedia({
                    uri: asset.uri,
                    type: 'document',
                    name: asset.name || `document_${Date.now()}.pdf`,
                    size: asset.size || 0,
                });
                setShowMediaOptions(false);
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to pick document. Please try again.');
        }
    };

    const uploadMedia = async (mediaUri: string, mediaType: 'image' | 'video' | 'audio' | 'document', fileName: string) => {
        try {
            setIsUploading(true);
            setUploadProgress(0);

            // Create FormData for file upload

            console.log(mediaType, "mediaTypeRand")
            const formData = new FormData();

            formData.append('folder', mediaType === 'image' ? 'images' :
                mediaType === 'video' ? 'videos' :
                    mediaType === 'audio' ? 'audios' : 'documents');

            // Determine MIME type based on file extension
            const getMimeType = (fileName: string, mediaType: string) => {
                const extension = fileName.toLowerCase().split('.').pop();
                switch (extension) {
                    case 'pdf': return 'application/pdf';
                    case 'doc': return 'application/msword';
                    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                    case 'txt': return 'text/plain';
                    case 'xls': return 'application/vnd.ms-excel';
                    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    case 'jpg':
                    case 'jpeg': return 'image/jpeg';
                    case 'png': return 'image/png';
                    case 'gif': return 'image/gif';
                    case 'mp4': return 'video/mp4';
                    case 'mov': return 'video/quicktime';
                    case 'avi': return 'video/x-msvideo';
                    case 'mp3': return 'audio/mpeg';
                    case 'wav': return 'audio/wav';
                    case 'm4a': return 'audio/mp3';
                    default: return mediaType === 'image' ? 'image/jpeg' :
                        mediaType === 'video' ? 'video/mp4' :
                            mediaType === 'audio' ? 'audio/mpeg' : 'application/octet-stream';
                }
            };

            formData.append('files', {
                uri: mediaUri,
                type: getMimeType(fileName, mediaType),
                name: fileName,
            } as any);

            // Upload file to server
            console.log('Uploading media to server', ENDPOINTS.upload.documents);
            const response = await api.post(ENDPOINTS.upload.documents, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setUploadProgress(progress);
                },
            });

            console.log('response', response.data);

            if (response.data.success && response.data.data.files[0]) {
                const uploadedFile = response.data.data.files[0];
                return uploadedFile.url;
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const sendMediaMessage = async (mediaUrl: string, mediaType: 'image' | 'video' | 'audio' | 'document') => {
        try {
            const tempId = Date.now().toString();
            const newMessage: Message = {
                id: tempId,
                senderId: currentUserId,
                text: mediaUrl, // Use the URL as text content
                content: mediaUrl, // Use the URL as content
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                isSent: true,
                messageType: mediaType,
                mediaUrl: mediaUrl,
            };

            setMessages((prev) => [...prev, newMessage]);
            scrollToEnd();

            // Send media message via socket

            const data = {
                receiverId: friendId,
                content: mediaUrl,
                messageType: mediaType,
            }

            console.log(data, "feed back new message")
            if (socketRef.current) {
                socketRef.current.emit('message:send', data);
            }

            console.log(`${mediaType} message sent:`, mediaUrl);
        } catch (error) {
            console.error(`Failed to send ${mediaType} message:`, error);
            Alert.alert('Send Error', `Failed to send ${mediaType}. Please try again.`);
        }
    };

    const handleSendMedia = async () => {
        if (!selectedMedia) return;

        try {
            const mediaUrl = await uploadMedia(
                selectedMedia.uri,
                selectedMedia.type,
                selectedMedia.name
            );

            console.log('mediaUrl', mediaUrl);

            await sendMediaMessage(mediaUrl, selectedMedia.type);
            setSelectedMedia(null);
        } catch (error) {
            console.error('Failed to send media:', error);
            Alert.alert('Send Error', 'Failed to send media. Please try again.');
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const downloadAndSharePDF = async (pdfUrl: string, fileName: string) => {
        try {
            Alert.alert(
                'Download PDF',
                'Choose an action:',
                [
                    {
                        text: 'View Online',
                        onPress: () => viewPDFOnline(pdfUrl)
                    },
                    {
                        text: 'Download & Share',
                        onPress: () => downloadPDF(pdfUrl, fileName)
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    }
                ]
            );
        } catch (error) {
            console.error('Error handling PDF:', error);
            Alert.alert('Error', 'Failed to handle PDF. Please try again.');
        }
    };

    const viewPDFOnline = async (pdfUrl: string) => {
        try {
            await WebBrowser.openBrowserAsync(pdfUrl, {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
                controlsColor: '#007AFF',
                showTitle: true,
            });
        } catch (error) {
            console.error('Error opening PDF:', error);
            Alert.alert('Error', 'Failed to open PDF. Please try downloading it instead.');
        }
    };

    const downloadPDF = async (pdfUrl: string, fileName: string) => {
        try {
            setIsDownloadingPDF(true);
            
            // Create a temporary file path
            const fileUri = FileSystem.documentDirectory + fileName;
            
            // Download the PDF
            const downloadResult = await FileSystem.downloadAsync(pdfUrl, fileUri);
            
            if (downloadResult.status === 200) {
                // Check if sharing is available
                const isAvailable = await Sharing.isAvailableAsync();
                
                if (isAvailable) {
                    // Share the downloaded file
                    await Sharing.shareAsync(downloadResult.uri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Share PDF Document',
                    });
                } else {
                    Alert.alert('Success', 'PDF downloaded successfully!');
                }
            } else {
                throw new Error('Download failed');
            }
        } catch (error) {
            console.error('Error downloading PDF:', error);
            Alert.alert('Download Error', 'Failed to download PDF. Please try again.');
        } finally {
            setIsDownloadingPDF(false);
        }
    };

    const handleDocumentAction = (documentUrl: string, fileName: string) => {
        const extension = fileName.toLowerCase().split('.').pop();
        
        if (extension === 'pdf') {
            downloadAndSharePDF(documentUrl, fileName);
        } else {
            // For other document types, try to open in browser
            viewPDFOnline(documentUrl);
        }
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

    // Mark messages as read when component mounts or messages change
    useEffect(() => {
        if (messages.length > 0 && currentUserId && !isLoading) {
            // Only mark as read if there are actually unread messages
            const hasUnreadMessages = messages.some(msg => 
                msg.senderId !== currentUserId && !msg.isRead
            );
            if (hasUnreadMessages) {
                markMessagesAsRead();
            }
        }
    }, [messages, currentUserId, isLoading]);

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
            <StatusBar
                barStyle={theme === "dark" ? "light-content" : "dark-content"}
                backgroundColor={currentTheme.background}
            />

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
                        <View style={[styles.avatarPlaceholder, { backgroundColor: getConsistentColor(friendName) }]}>
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
                    <TouchableOpacity
                        style={styles.headerIconButton}
                        activeOpacity={0.7}
                        onPress={() => {
                            try {
                                if (!socketRef.current) return;
                                socketRef.current.emit('call:initiate', {
                                    participants: [friendId],
                                    callType: 'video',
                                });
                                setCurrentCallType('video');
                            } catch (e: any) {
                                Alert.alert('Call Failed', e?.message || 'Unable to start video call');
                            }
                        }}
                    >
                        <Ionicons name="videocam-outline" size={22} color="black" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerIconButton}
                        activeOpacity={0.7}
                        onPress={() => {
                            try {
                                if (!socketRef.current) return;
                                socketRef.current.emit('call:initiate', {
                                    participants: [friendId],
                                    callType: 'voice',
                                });
                                setCurrentCallType('voice');
                            } catch (e: any) {
                                Alert.alert('Call Failed', e?.message || 'Unable to start voice call');
                            }
                        }}
                    >
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
                            console.log('MSG', msg);
                            return (
                                <TouchableOpacity
                                    key={msg.id}
                                    style={[styles.messageRow, isMe ? styles.messageRight : styles.messageLeft]}
                                    onLongPress={() => handleMessageLongPress(msg)}
                                    activeOpacity={0.8}
                                >
                                    {!isMe && <Image source={{ uri: "https://api.dicebear.com/7.x/adventurer/png?seed=HappyUser" }} style={styles.msgAvatar} />}
                                    <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
                                        {(msg.messageType === 'image' || (msg.text && msg.text.match(/\.(jpg|jpeg|png|gif|webp)$/i))) ? (
                                            <View style={styles.imageMessageContainer}>
                                                <Image
                                                    source={{ uri: msg.mediaUrl || msg.text }}
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
                                                    onPress={() => {
                                                        // Use content field (S3 URL) for playback, fallback to mediaUrl or text
                                                        const voiceUrl = msg.content || msg.mediaUrl || msg.text;
                                                        if (voiceUrl) {
                                                            playVoiceMessage(voiceUrl);
                                                        }
                                                    }}
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
                                        ) : (msg.messageType === 'video' || (msg.text && msg.text.match(/\.(mp4|mov|avi|mkv)$/i))) ? (
                                            <View style={styles.videoMessageContainer}>
                                                <Image
                                                    source={{ uri: msg.mediaThumbnail || msg.mediaUrl || msg.text }}
                                                    style={styles.messageVideo}
                                                    resizeMode="cover"
                                                />
                                                <View style={styles.videoOverlay}>
                                                    <Ionicons name="play" size={24} color="#fff" />
                                                </View>
                                            </View>
                                        ) : (msg.messageType === 'audio' || (msg.text && msg.text.match(/\.(mp3|wav|m4a|aac|ogg)$/i))) ? (
                                            <View style={styles.audioMessageContainer}>
                                                <TouchableOpacity
                                                    style={styles.audioPlayButton}
                                                    onPress={() => {
                                                        // Use content field (S3 URL) for playback, fallback to mediaUrl or text
                                                        const audioUrl = msg.content || msg.mediaUrl || msg.text;
                                                        if (audioUrl) {
                                                            playVoiceMessage(audioUrl);
                                                        }
                                                    }}
                                                >
                                                    <Ionicons
                                                        name={isPlaying && sound ? "pause" : "play"}
                                                        size={20}
                                                        color={isMe ? "#fff" : "#2196F3"}
                                                    />
                                                </TouchableOpacity>
                                                <View style={styles.audioWaveform}>
                                                    <View style={[styles.audioBar, { height: 8 }]} />
                                                    <View style={[styles.audioBar, { height: 12 }]} />
                                                    <View style={[styles.audioBar, { height: 6 }]} />
                                                    <View style={[styles.audioBar, { height: 10 }]} />
                                                    <View style={[styles.audioBar, { height: 4 }]} />
                                                </View>
                                                <Text style={[styles.audioDuration, isMe ? styles.myText : styles.theirText]}>
                                                    Audio Track
                                                </Text>
                                            </View>
                                         ) : (msg.messageType === 'document' || (msg.text && msg.text.match(/\.(pdf|doc|docx|txt|xls|xlsx)$/i))) ? (
                                             <View style={styles.documentMessageContainer}>
                                                 <View style={styles.documentIconContainer}>
                                                     <Ionicons name="document-text" size={32} color={isMe ? "#fff" : "#607D8B"} />
                                                 </View>
                                                 <View style={styles.documentInfoContainer}>
                                                     <Text style={[styles.documentFileName, isMe ? styles.myText : styles.theirText]} numberOfLines={1}>
                                                         {msg.text.split('/').pop() || 'Document'}
                                                     </Text>
                                                     <Text style={[styles.documentFileSize, isMe ? styles.myTime : styles.theirTime]}>
                                                         Document File
                                                     </Text>
                                                 </View>
                                                 <View style={styles.documentActionButtons}>
                                                     <TouchableOpacity
                                                         style={[styles.documentActionButton, isDownloadingPDF && { opacity: 0.5 }]}
                                                         onPress={() => {
                                                             const fileName = msg.text.split('/').pop() || 'document.pdf';
                                                             handleDocumentAction(msg.text, fileName);
                                                         }}
                                                         disabled={isDownloadingPDF}
                                                     >
                                                         <Ionicons name="eye" size={18} color={isMe ? "#fff" : "#607D8B"} />
                                                     </TouchableOpacity>
                                                     <TouchableOpacity
                                                         style={[styles.documentActionButton, isDownloadingPDF && { opacity: 0.5 }]}
                                                         onPress={() => {
                                                             const fileName = msg.text.split('/').pop() || 'document.pdf';
                                                             downloadPDF(msg.text, fileName);
                                                         }}
                                                         disabled={isDownloadingPDF}
                                                     >
                                                         {isDownloadingPDF ? (
                                                             <ActivityIndicator size="small" color={isMe ? "#fff" : "#607D8B"} />
                                                         ) : (
                                                             <Ionicons name="download" size={18} color={isMe ? "#fff" : "#607D8B"} />
                                                         )}
                                                     </TouchableOpacity>
                                                 </View>
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
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                        {isTyping && (
                            <View style={[styles.messageRow, styles.messageLeft, styles.typingIndicatorContainer]}>
                                <View style={styles.typingAvatarContainer}>
                                    <View style={[styles.typingAvatarPlaceholder, { backgroundColor: getConsistentColor(friendName) }]}>
                                        <Text style={styles.typingAvatarText}>{friendName[0]}</Text>
                                    </View>
                                    <View style={styles.typingIconContainer}>
                                        <Ionicons name="create-outline" size={12} color="#009BFF" />
                                    </View>
                                </View>
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
                <View style={styles.inputBar}>
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
                                onPress={pickImage}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.mediaOptionIcon, { backgroundColor: '#4CAF50' }]}>
                                    <Ionicons name="image" size={24} color="#fff" />
                                </View>
                                <Text style={styles.mediaOptionText}>Photo</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.mediaOption}
                                onPress={pickVideo}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.mediaOptionIcon, { backgroundColor: '#E91E63' }]}>
                                    <Ionicons name="videocam" size={24} color="#fff" />
                                </View>
                                <Text style={styles.mediaOptionText}>Video</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.mediaOption}
                                onPress={pickAudio}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.mediaOptionIcon, { backgroundColor: '#9C27B0' }]}>
                                    <Ionicons name="musical-notes" size={24} color="#fff" />
                                </View>
                                <Text style={styles.mediaOptionText}>Audio</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.mediaOption}
                                onPress={pickDocument}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.mediaOptionIcon, { backgroundColor: '#607D8B' }]}>
                                    <Ionicons name="document-text" size={24} color="#fff" />
                                </View>
                                <Text style={styles.mediaOptionText}>Document</Text>
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

                {/* Media Preview Modal */}
                <Modal
                    visible={selectedMedia !== null}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setSelectedMedia(null)}
                >
                    <View style={styles.imagePreviewOverlay}>
                        <View style={styles.imagePreviewContainer}>
                            {selectedMedia && (
                                <>
                                    {selectedMedia.type === 'image' ? (
                                        <Image
                                            source={{ uri: selectedMedia.uri }}
                                            style={styles.previewImage}
                                            resizeMode="contain"
                                        />
                                    ) : selectedMedia.type === 'video' ? (
                                        <View style={styles.videoPreviewContainer}>
                                            <Ionicons name="videocam" size={64} color="#fff" />
                                            <Text style={styles.videoPreviewText}>{selectedMedia.name}</Text>
                                        </View>
                                    ) : selectedMedia.type === 'audio' ? (
                                        <View style={styles.audioPreviewContainer}>
                                            <Ionicons name="musical-notes" size={64} color="#fff" />
                                            <Text style={styles.audioPreviewText}>{selectedMedia.name}</Text>
                                            <Text style={styles.audioPreviewSubtext}>
                                                {(selectedMedia.size / 1024 / 1024).toFixed(2)} MB
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={styles.documentPreviewContainer}>
                                            <Ionicons name="document-text" size={64} color="#fff" />
                                            <Text style={styles.documentPreviewText}>{selectedMedia.name}</Text>
                                            <Text style={styles.documentPreviewSubtext}>
                                                {(selectedMedia.size / 1024 / 1024).toFixed(2)} MB
                                            </Text>
                                        </View>
                                    )}

                                    {isUploading && (
                                        <View style={styles.uploadProgressContainer}>
                                            <Text style={styles.uploadProgressText}>
                                                Uploading... {uploadProgress}%
                                            </Text>
                                        </View>
                                    )}
                                </>
                            )}
                            <View style={styles.imagePreviewActions}>
                                <TouchableOpacity
                                    style={styles.previewCancelButton}
                                    onPress={() => setSelectedMedia(null)}
                                >
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.previewSendButton, isUploading && { opacity: 0.5 }]}
                                    onPress={handleSendMedia}
                                    disabled={isUploading}
                                >
                                    <Ionicons name="send" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </KeyboardAvoidingView>

            {/* Simple In-Call Modal */}
            <Modal
                visible={isInCall}
                transparent={true}
                animationType="slide"
                onRequestClose={() => { }}
            >
                <View style={styles.callOverlay}>
                    <View style={styles.callCard}>
                        <Text style={styles.callTitle}>{currentCallType === 'video' ? 'Video Call' : 'Voice Call'}</Text>
                        <Text style={styles.callSubtitle}>
                            {callStatus === 'ringing' ? (incomingCall ? 'Incoming call…' : `Calling ${friendName}…`) : 'Connected'}
                        </Text>
                        <View style={styles.callButtonsRow}>
                            {callStatus === 'ringing' && incomingCall && (
                                <>
                                    <TouchableOpacity
                                        style={[styles.callCircleButton, { backgroundColor: '#43A047' }]}
                                        onPress={() => {
                                            if (!socketRef.current || !currentCallId) return;
                                            socketRef.current.emit('call:answer', { callId: currentCallId });
                                            setCallStatus('active');
                                            setIncomingCall(null);
                                            stopRingtone();
                                        }}
                                    >
                                        <Ionicons name="call" size={24} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.callCircleButton, { backgroundColor: '#E53935' }]}
                                        onPress={() => {
                                            if (!socketRef.current || !currentCallId) return;
                                            socketRef.current.emit('call:decline', { callId: currentCallId });
                                            setIsInCall(false);
                                            setCallStatus('idle');
                                            setCurrentCallId(null);
                                            setCurrentCallType(null);
                                            setIncomingCall(null);
                                            stopRingtone();
                                        }}
                                    >
                                        <Ionicons name="close" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </>
                            )}

                            {callStatus === 'ringing' && !incomingCall && (
                                <TouchableOpacity
                                    style={[styles.callCircleButton, { backgroundColor: '#E53935' }]}
                                    onPress={() => {
                                        if (!socketRef.current || !currentCallId) return;
                                        socketRef.current.emit('call:end', { callId: currentCallId });
                                    }}
                                >
                                    <Ionicons name="call" size={24} color="#fff" />
                                </TouchableOpacity>
                            )}

                            {callStatus === 'active' && (
                                <>
                                    {currentCallType === 'video' && (
                                        <TouchableOpacity
                                            style={[styles.callCircleButton, { backgroundColor: '#607D8B' }]}
                                            onPress={() => {
                                                if (!socketRef.current || !currentCallId) return;
                                                socketRef.current.emit('call:toggle-media', {
                                                    callId: currentCallId,
                                                    mediaType: 'video',
                                                    enabled: false,
                                                });
                                            }}
                                        >
                                            <Ionicons name="videocam-off" size={24} color="#fff" />
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={[styles.callCircleButton, { backgroundColor: '#9E9E9E' }]}
                                        onPress={() => {
                                            if (!socketRef.current || !currentCallId) return;
                                            socketRef.current.emit('call:toggle-media', {
                                                callId: currentCallId,
                                                mediaType: 'audio',
                                                enabled: false,
                                            });
                                        }}
                                    >
                                        <Ionicons name="mic-off" size={24} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.callCircleButton, { backgroundColor: '#E53935' }]}
                                        onPress={() => {
                                            if (!socketRef.current || !currentCallId) return;
                                            socketRef.current.emit('call:end', { callId: currentCallId });
                                        }}
                                    >
                                        <Ionicons name="call" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

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

const createStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    loadingWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    keyboardAvoidingContainer: {
        flex: 1,
    },
    chatContainer: {
        flex: 1,
        marginTop: 8,
        // backgroundColor: theme.cardBackground,
        // borderWidth: 1,
        borderColor: theme.inputBorder,
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
        backgroundColor: theme.background,
        borderRadius: 45,
        elevation: 4,
        shadowColor: theme.shadowColor,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        borderWidth: 0,
        borderColor: theme.inputBorder,
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
    friendName: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.primaryText
    },
    statusText: {
        fontSize: 11,
        color: theme.secondaryText,
        marginTop: 2
    },

    chatScroll: {
        flexGrow: 1,
        paddingVertical: 12,
        paddingHorizontal: 10,
        paddingBottom: 20, // Extra padding at bottom
    },
    messageRow: {
        flexDirection: 'row',
        marginVertical: 6,
        alignItems: 'flex-end'
    },
    messageLeft: {
        justifyContent: 'flex-start'

    },
    messageRight: {
        justifyContent: 'flex-end',
        alignSelf: 'flex-end'
    },
    typingIndicatorContainer: {
        marginBottom: 0, // Extra margin to ensure typing indicator is visible above input box
    },
    typingAvatarContainer: {
        position: 'relative',
        marginRight: 8,
    },
    typingAvatarPlaceholder: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typingAvatarText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.secondaryText,
    },
    typingIconContainer: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#fff',
        borderRadius: 8,
        width: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#009BFF',
    },
    msgAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },

    messageBubble: {
        maxWidth: '75%',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 10,
        shadowColor: theme.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    myBubble: {
        backgroundColor: '#2196F3',
        borderBottomRightRadius: 4
    },
    theirBubble: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4
    },
    forwardingBubble: { backgroundColor: '#FF9800', opacity: 0.8 },
    messageText: { fontSize: 15 },
    myText: { color: '#fff' },
    theirText: { color: '#333' },
    msgTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
    myTime: { color: 'rgba(255,255,255,0.7)' },
    theirTime: { color: '#999' },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        justifyContent: 'flex-end',
        gap: 4,
    },
    messageStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkmark: {
        marginLeft: 4,
    },

    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
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
    typingTextContainer: {
        marginRight: 8,
    },
    typingText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    animatedDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#999',
        marginHorizontal: 2,
    },

    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.cardBackground,
        marginHorizontal: 10,
        marginBottom: 10,
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
    iconButton: { paddingHorizontal: 6 },
    input: {
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
    recordingButton: {
        backgroundColor: '#FF5722',
        borderRadius: 20,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF5722',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    recordingIndicator: {
        marginRight: 8,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
    },
    recordingText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginRight: 8,
        minWidth: 40,
    },

    // Forwarded message styles
    messageContentContainer: {
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

    // Media message styles
    imageMessageContainer: {
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 12,
    },
    imageOverlay: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        padding: 4,
    },
    voiceMessageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        minWidth: 120,
    },
    voicePlayButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    voiceWaveform: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
        gap: 2,
    },
    voiceBar: {
        width: 3,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderRadius: 2,
    },
    voiceDuration: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Media options modal styles
    mediaModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    mediaOptionsContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 30,
        flexDirection: 'row',
        justifyContent: 'space-around',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    mediaOption: {
        alignItems: 'center',
        flex: 1,
    },
    mediaOptionIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    mediaOptionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },

    // Image preview modal styles
    imagePreviewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreviewContainer: {
        width: Dimensions.get('window').width * 0.9,
        height: Dimensions.get('window').height * 0.7,
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    imagePreviewActions: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    previewCancelButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewSendButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
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
        backgroundColor: theme.cardBackground,
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
        borderBottomColor: theme.inputBorder,
    },
    forwardModalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.secondaryText,
    },
    selectedMessagePreview: {
        backgroundColor: theme.containerBackground,
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
        color: theme.secondaryText,
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
        color: theme.primaryText,
        fontWeight: '600',
    },
    selectedMessageText: {
        fontSize: 14,
        color: theme.secondaryText,
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
        borderBottomColor: theme.inputBorder,
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
        color: theme.secondaryText,
        marginBottom: 2,
    },
    forwardContactType: {
        fontSize: 12,
        color: theme.tertiaryText,
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
    // Call modal styles
    callOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    callCard: {
        width: '80%',
        backgroundColor: '#1F2937',
        borderRadius: 16,
        paddingVertical: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    callTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6,
    },
    callSubtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginBottom: 16,
    },
    callButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginTop: 4,
    },
    callCircleButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Video preview styles
    videoPreviewContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    videoPreviewText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
    // Upload progress styles
    uploadProgressContainer: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    uploadProgressText: {
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
    },
    // Video message styles
    videoMessageContainer: {
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
    },
    messageVideo: {
        width: 200,
        height: 150,
        borderRadius: 12,
    },
    videoOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    // Audio message styles
    audioMessageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 12,
        minWidth: 200,
    },
    audioPlayButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    audioWaveform: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 2,
    },
    audioBar: {
        width: 3,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderRadius: 2,
    },
    audioDuration: {
        fontSize: 12,
        marginLeft: 8,
        fontWeight: '500',
    },
    // Audio preview styles
    audioPreviewContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    audioPreviewText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
        fontWeight: '600',
    },
    audioPreviewSubtext: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    // Document preview styles
    documentPreviewContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    documentPreviewText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
        fontWeight: '600',
    },
    documentPreviewSubtext: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    // Document message styles
    documentMessageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 12,
        minWidth: 200,
    },
    documentIconContainer: {
        marginRight: 12,
    },
    documentInfoContainer: {
        flex: 1,
    },
    documentFileName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    documentFileSize: {
        fontSize: 12,
    },
    documentActionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    documentActionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
});
