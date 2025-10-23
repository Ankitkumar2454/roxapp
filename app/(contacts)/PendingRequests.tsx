import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { useTheme } from "@/src/hooks/useTheme";
import { ThemeContext } from "@/src/services/ThemeContext";
import { BorderRadius, Spacing, Typography } from "@/src/styles/commonStyles";
import { PendingRequest } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
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
    const { theme, toggleTheme } = useContext(ThemeContext);
    const { isDark, colors, shadows } = useTheme();
    const styles = createStyles(isDark, colors, shadows);
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
        const colorPalette = [colors.success, colors.info, colors.warning, colors.secondary, colors.error, colors.primary];
        return colorPalette[Math.floor(Math.random() * colorPalette.length)];
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
            <StatusBar
                barStyle={isDark ? "light-content" : "dark-content"}
                backgroundColor={isDark ? colors.background : "transparent"}
                translucent={!isDark}
            />
            <View style={[styles.header, { backgroundColor: isDark ? colors.primary : colors.white }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={isDark ? colors.white : colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerTitle, { color: isDark ? colors.white : colors.textPrimary }]}>Friend Requests</Text>
                        <Text style={[styles.headerSubtitle, { color: isDark ? colors.white : colors.textSecondary }]}>
                            {pendingRequests.length} {pendingRequests.length === 1 ? 'request' : 'requests'}
                        </Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={fetchPendingRequests}
                        >
                            <Ionicons name="refresh" size={22} color={isDark ? colors.white : colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {loading && pendingRequests.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
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
                            colors={[colors.primary]}
                            tintColor={colors.primary}
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

const createStyles = (isDark: boolean, colors: any, shadows: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    } as any,
    header: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
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
        marginRight: Spacing.lg,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.semibold as any,
    },
    headerSubtitle: {
        fontSize: Typography.fontSize.sm,
        marginTop: Spacing.xs,
    },
    headerActions: {
        flexDirection: 'row',
        gap: Spacing.xl,
    },
    headerButton: {
        padding: Spacing.xs,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    } as any,
    loadingText: {
        marginTop: Spacing.md,
        fontSize: Typography.fontSize.sm,
        color: colors.textSecondary,
    },
    listContent: {
        paddingVertical: Spacing.md,
        flexGrow: 1,
    },
    requestItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    } as any,
    avatar: {
        width: 60,
        height: 60,
        borderRadius: BorderRadius['3xl'],
        marginRight: Spacing.md,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: BorderRadius['3xl'],
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    avatarText: {
        fontSize: Typography.fontSize['2xl'],
        fontWeight: Typography.fontWeight.semibold as any,
        color: colors.white,
    },
    requestInfo: {
        flex: 1,
        marginRight: Spacing.md,
    },
    requestName: {
        fontSize: Typography.fontSize.base,
        color: colors.textPrimary,
        fontWeight: Typography.fontWeight.semibold as any,
        marginBottom: Spacing.xs,
    },
    requestUsername: {
        fontSize: Typography.fontSize.sm,
        color: colors.primary,
        marginBottom: Spacing.xs,
    },
    requestTime: {
        fontSize: Typography.fontSize.xs,
        color: colors.textSecondary,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    acceptButton: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius['2xl'],
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    } as any,
    rejectButton: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius['2xl'],
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: colors.error,
    } as any,
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyText: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.semibold as any,
        color: colors.textPrimary,
        marginTop: Spacing.xl,
    },
    emptySubtext: {
        fontSize: Typography.fontSize.sm,
        color: colors.textSecondary,
        marginTop: Spacing.sm,
        textAlign: 'center',
        paddingHorizontal: Spacing['2xl'],
    },
});