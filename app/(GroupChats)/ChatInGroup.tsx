import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
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

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    avatar?: string;
    text: string;
    time: string;
    isSent: boolean;
    isDelivered?: boolean;
}

const CURRENT_USER_ID = 'me';

export default function ChatMessageScreen() {
    const router = useRouter();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            senderId: 'u1',
            senderName: 'David Wayne',
            avatar: 'https://i.pravatar.cc/100?img=12',
            text: "Hey everyone! Delivery is on the way 😊",
            time: '10:15',
            isSent: false,
        },
        {
            id: '2',
            senderId: CURRENT_USER_ID,
            senderName: 'You',
            text: 'Nice! Excited for the food 😋',
            time: '10:16',
            isSent: true,
            isDelivered: true,
        },
        {
            id: '3',
            senderId: 'u2',
            senderName: 'Sarah Chen',
            avatar: 'https://i.pravatar.cc/100?img=20',
            text: 'Make sure you bring extra sauces please!',
            time: '10:17',
            isSent: false,
        },
        {
            id: '4',
            senderId: 'u3',
            senderName: 'Speedy Chow',
            avatar: 'https://i.pravatar.cc/100?img=30',
            text: "No worries, I'll grab some more! 🚴",
            time: '10:18',
            isSent: false,
        },
        {
            id: '5',
            senderId: CURRENT_USER_ID,
            senderName: 'You',
            text: 'Awesome, thanks team!',
            time: '10:19',
            isSent: true,
            isDelivered: true,
        },
    ]);

    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

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
                isDelivered: true,
            };
            setMessages([...messages, newMessage]);
            setMessage('');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.replace("/(chats)/Chat")} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Image
                        source={{ uri: 'https://i.pravatar.cc/100?img=11' }}
                        style={styles.avatar}
                    />
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerName}>Group Chat</Text>
                        <Text style={styles.headerPhone}>3 members</Text>
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

            {/* 👇 KeyboardAvoidingView wraps ScrollView + Input */}
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
                    {messages.map((msg) => {
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
                                        {isMe && msg.isDelivered && (
                                            <Ionicons
                                                name="checkmark-done"
                                                size={16}
                                                color="#fff"
                                                style={styles.checkmark}
                                            />
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>

                {/* Input */}
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
                            onChangeText={setMessage}
                            multiline
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.sendButton}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 35,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        marginRight: 12,
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    headerInfo: {
        flex: 1,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    headerPhone: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        marginLeft: 16,
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 20,
    },
    senderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        marginLeft: 4,
    },
    senderName: {
        fontSize: 13,
        color: '#555',
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
        backgroundColor: '#007AFF',
        borderBottomRightRadius: 4,
    },
    receivedBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
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
        borderTopColor: '#f0f0f0',
    },
    attachButton: {
        marginRight: 8,
        marginBottom: 8,
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
    },
    input: {
        fontSize: 15,
        color: '#000',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#00A8E8',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
});
