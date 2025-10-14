import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { PendingRequest } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';



export default function PendingRequestsScreen() {
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [processingRequest, setProcessingRequest] = useState<string | null>(null);
    const [messageVisible, setMessageVisible] = useState(false);
    const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
    const [messageText, setMessageText] = useState('');

    useEffect(() => {
        fetchPendingRequests();
    }, []);

    const fetchPendingRequests = async () => {
        try {
            setLoading(true);

            const response = await api.get(ENDPOINTS.friends.getPending);
            console.log("Pending requests:", response.data);

            if (response.data.success && response.data.data) {
                const transformedRequests: PendingRequest[] = response.data.data.map((request: any) => ({
                    id: request._id || request.id,
                    name: request?.sender?.fullName || request?.sender?.username,
                    username: request?.sender?.username,
                    avatar: request?.sender?.profileImage || undefined,
                    initial: request?.sender?.fullName ? request?.sender?.fullName?.charAt(0)?.toUpperCase() : request?.sender?.username?.charAt(0)?.toUpperCase(),
                    bgColor: getRandomColor(),
                    requestDate: request.createdAt || request.requestDate,
                    status: request.status || 'pending',
                }));

                setPendingRequests(transformedRequests);
            }
        } catch (error: any) {
            console.log("Error fetching pending requests:", error);
            showMessage("error", error?.response?.data?.message || "Failed to load pending requests");
        } finally {
            setLoading(false);
        }
    };

    const getRandomColor = () => {
        const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchPendingRequests();
        setRefreshing(false);
    };

    const showMessage = (type: 'success' | 'error' | 'info', message: string) => {
        setMessageType(type);
        setMessageText(message);
        setMessageVisible(true);
    };

    const handleAcceptRequest = async (requestId: string, userName: string) => {
        try {
            setProcessingRequest(requestId);

            const response = await api.put(`${ENDPOINTS.friends.accept}/${requestId}`);

            if (response.data.success) {
                showMessage("success", `Accepted ${userName}'s friend request`);
                setPendingRequests(prev => prev.filter(req => req.id !== requestId));
            } else {
                showMessage("error", response.data.message || "Failed to accept request");
            }
        } catch (error: any) {
            showMessage("error", error?.response?.data?.message || "Failed to accept request");
            console.error("Accept request error:", error);
        } finally {
            setProcessingRequest(null);
        }
    };

    const handleRejectRequest = async (requestId: string, userName: string) => {
        try {
            setProcessingRequest(requestId);

            const response = await api.put(`${ENDPOINTS.friends.reject}/${requestId}`);

            if (response.data.success) {
                showMessage("info", `Rejected ${userName}'s friend request`);
                setPendingRequests(prev => prev.filter(req => req.id !== requestId));
            } else {
                showMessage("error", response.data.message || "Failed to reject request");
            }
        } catch (error: any) {
            showMessage("error", error?.response?.data?.message || "Failed to reject request");
            console.error("Reject request error:", error);
        } finally {
            setProcessingRequest(null);
        }
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffMins < 1440) {
            return `${Math.floor(diffMins / 60)}h ago`;
        } else {
            return `${Math.floor(diffMins / 1440)}d ago`;
        }
    };

    const renderRequestItem = ({ item }: { item: PendingRequest }) => (
        <View style={styles.requestItem}>
            {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: item.bgColor }]}>
                    <Text style={styles.avatarText}>{item.initial}</Text>
                </View>
            )}

            <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{item.name}</Text>
                <Text style={styles.requestUsername}>@{item.username}</Text>
                <Text style={styles.requestTime}>{getTimeAgo(item.requestDate)}</Text>
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(item.id, item.name)}
                    disabled={processingRequest === item.id}
                >
                    {processingRequest === item.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Ionicons name="checkmark" size={20} color="#fff" />
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleRejectRequest(item.id, item.name)}
                    disabled={processingRequest === item.id}
                >
                    {processingRequest === item.id ? (
                        <ActivityIndicator size="small" color="#FF3B30" />
                    ) : (
                        <Ionicons name="close" size={20} color="#FF3B30" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    const ListEmptyComponent = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No Pending Requests</Text>
            <Text style={styles.emptySubtext}>
                You don't have any friend requests at the moment
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#009BFF" />

            <LinearGradient
                colors={["#009BFF", "#0066CC"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>Friend Requests</Text>
                            <Text style={styles.headerSubtitle}>
                                {pendingRequests.length} {pendingRequests.length === 1 ? 'request' : 'requests'}
                            </Text>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={fetchPendingRequests}
                            >
                                <Ionicons name="refresh" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {loading && pendingRequests.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#009BFF" />
                    <Text style={styles.loadingText}>Loading requests...</Text>
                </View>
            ) : (
                <FlatList
                    data={pendingRequests}
                    renderItem={renderRequestItem}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={ListEmptyComponent}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#009BFF']}
                            tintColor="#009BFF"
                        />
                    }
                />
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
    header: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        height: 120,
        justifyContent: "flex-end",
        alignItems: "center",
        display: "flex",
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#fff',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 20,
    },
    headerButton: {
        padding: 4,
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
    listContent: {
        paddingVertical: 12,
        flexGrow: 1,
    },
    requestItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
    },
    requestInfo: {
        flex: 1,
        marginRight: 12,
    },
    requestName: {
        fontSize: 16,
        color: '#000',
        fontWeight: '600',
        marginBottom: 4,
    },
    requestUsername: {
        fontSize: 14,
        color: '#009BFF',
        marginBottom: 4,
    },
    requestTime: {
        fontSize: 12,
        color: '#999',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    acceptButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#4CAF50',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    rejectButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#FF3B30',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#666',
        marginTop: 20,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});