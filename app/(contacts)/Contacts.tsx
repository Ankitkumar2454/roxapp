import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { useTheme } from "@/src/hooks/useTheme";
import { ThemeContext } from "@/src/services/ThemeContext";
import { BorderRadius, Spacing, Typography } from "@/src/styles/commonStyles";
import { Contact, createContactResponse } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { router } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SelectContactScreen() {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [addingFriend, setAddingFriend] = useState<string | null>(null);
    const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set());
    const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
    });
    const [messageVisible, setMessageVisible] = useState(false);
    const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
    const [messageText, setMessageText] = useState('');
    const [pendingRequests, setPendingRequests] = useState<any>(0)
    const { theme, toggleTheme } = useContext(ThemeContext);
    const { isDark, colors, shadows } = useTheme();
    const styles = createStyles(isDark, colors, shadows);

    const handleInitialSetup = async () => {
        const userdata = await Storage.getItem("user");
        console.log("Current user:", userdata);
        setCurrentUser(userdata);
        await Promise.all([fetchAllUsers(), fetchSentRequests(), fetchFriendsList()]);
    }

    const fetchPendingRequests = async () => {
        try {
            setLoading(true);

            const response = await api.get(ENDPOINTS.friends.getPending);
            console.log("Pending requests:", response.data);

            if (response.data.success && response.data.data) {
                setPendingRequests(response.data.data?.length);
            }
        } catch (error: any) {
            console.log("Error fetching pending requests:", error);
            showMessage("error", error?.response?.data?.message || "Failed to load pending requests");
        } finally {
            setLoading(false);
        }
    };

    const fetchSentRequests = async () => {
        try {
            const response = await api.get(ENDPOINTS.friends.sent);
            console.log("Sent requests:", response.data);

            if (response.data.success && response.data.data) {
                // Extract receiver IDs from sent requests
                const sentIds: any = new Set(
                    response.data.data.map((request: any) =>
                        request.receiver._id || request.receiver.id
                    )
                );
                setSentRequestIds(sentIds);
            }
        } catch (error: any) {
            console.log("Error fetching sent requests:", error);
        }
    };

    const fetchFriendsList = async () => {
        try {
            const response = await api.get(ENDPOINTS.friends.getAll);
            console.log("Friends list:", response.data);

            if (response.data.success && response.data.data) {
                // Extract friend IDs from friends list
                const friendIdsSet: any = new Set(
                    response.data.data.map((friend: any) =>
                        friend._id || friend.id
                    )
                );
                setFriendIds(friendIdsSet);
            }
        } catch (error: any) {
            console.log("Error fetching friends list:", error);
        }
    };

    const fetchAllUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get(ENDPOINTS.users.getAll);
            console.log("Fetched users:", response.data);

            if (response.data.success && response.data.data) {
                const currentUserData = await Storage.getItem("user");

                // Transform backend data to Contact format
                const transformedContacts: Contact[] = response.data.data
                    .filter((user: any) => {
                        const userId = user._id || user.id;
                        // Filter out: current user, and already existing friends
                        const isCurrentUser = currentUserData?._id === userId || currentUserData?.id === userId;
                        const isAlreadyFriend = friendIds.has(userId);
                        return !isCurrentUser && !isAlreadyFriend;
                    })
                    .map((user: any) => ({
                        id: user._id || user.id,
                        name: user.fullName || user.username,
                        status: getStatusText(user),
                        avatar: user.profileImage || undefined,
                        initial: user.fullName ? user.fullName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase(),
                        bgColor: getRandomColor(),
                        username: user.username,
                        role: user.role,
                        isActive: user.isActive,
                        lastLogin: user.lastLogin,
                        isYou: currentUserData?._id === user._id || currentUserData?.id === user._id,
                    }));

                setContacts(transformedContacts);
                setFilteredContacts(transformedContacts);
            }
        } catch (error: any) {
            console.log("Error fetching users:", error);
            showMessage("error", error?.response?.data?.message || "Failed to load contacts");
        } finally {
            setLoading(false);
        }
    }

    const getStatusText = (user: any) => {
        if (user.lastLogin) {
            const lastLoginDate = new Date(user.lastLogin);
            const now = new Date();
            const diffMs = now.getTime() - lastLoginDate.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 5) {
                return 'Online';
            } else if (diffMins < 60) {
                return `Last seen ${diffMins}m ago`;
            } else {
                const diffHours = Math.floor(diffMins / 60);
                if (diffHours < 24) {
                    return `Last seen ${diffHours}h ago`;
                } else {
                    return `Last seen ${Math.floor(diffHours / 24)}d ago`;
                }
            }
        }
        return user.role === 'admin' ? 'Admin' : 'Never logged in';
    }

    const getRandomColor = () => {
        const colorPalette = [colors.success, colors.info, colors.warning, colors.secondary, colors.error, colors.primary];
        return colorPalette[Math.floor(Math.random() * colorPalette.length)];
    }

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchAllUsers(), fetchSentRequests(), fetchFriendsList()]);
        setRefreshing(false);
    }

    useEffect(() => {
        handleInitialSetup();
        fetchPendingRequests();
    }, [])

    useEffect(() => {
        // Filter contacts based on search query
        if (searchQuery.trim() === '') {
            setFilteredContacts(contacts);
        } else {
            const filtered = contacts.filter(contact =>
                contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                contact.username?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredContacts(filtered);
        }
    }, [searchQuery, contacts]);

    const handleAddFriend = async (contactId: string, contactName: string) => {
        try {
            setAddingFriend(contactId);

            const response = await api.post(ENDPOINTS.friends.add, {
                receiverId: contactId
            });

            if (response.data.success) {
                showMessage("success", `Request sent to ${contactName}`);
                // Add the contact ID to sent requests
                setSentRequestIds(prev => new Set([...prev, contactId]));
            } else {
                showMessage("error", response.data.message || "Failed to add friend");
            }
        } catch (error: any) {
            showMessage("error", error?.response?.data?.message || "Failed to add friend");
            console.error("Add friend error:", error);
        } finally {
            setAddingFriend(null);
        }
    };

    const handleCancelRequest = async (contactId: string, contactName: string) => {
        try {
            setAddingFriend(contactId);

            const response = await api.post(ENDPOINTS.friends.reject, {
                receiverId: contactId
            });

            if (response.data.success) {
                showMessage("success", `Request cancelled for ${contactName}`);
                // Remove the contact ID from sent requests
                setSentRequestIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(contactId);
                    return newSet;
                });
            } else {
                showMessage("error", response.data.message || "Failed to cancel request");
            }
        } catch (error: any) {
            showMessage("error", error?.response?.data?.message || "Failed to cancel request");
            console.error("Cancel request error:", error);
        } finally {
            setAddingFriend(null);
        }
    };

    const handleContactPress = (contact: Contact) => {
        // Navigate to chat with selected contact
        router.push({
            pathname: "/(chats)/Chat",
            params: {
                contactId: contact.id,
                contactName: contact.name,
            }
        });
    };

    const handleAddContactPress = () => {
        setIsModalVisible(true);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
        setFormData({ username: '', fullName: '' });
    };

    const showMessage = (type: 'success' | 'error' | 'info', message: string) => {
        setMessageType(type);
        setMessageText(message);
        setMessageVisible(true);
    };

    const handleSubmit = async () => {
        if (!formData.username || !formData.fullName) {
            showMessage('info', 'Please fill in all fields');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post(ENDPOINTS.auth.create, {
                fullName: formData.fullName,
                username: formData.username
            });
            const data: createContactResponse = response.data;

            if (data.success === true) {
                showMessage("success", "User added successfully");
                handleCloseModal();
                // Refresh the contact list
                await fetchAllUsers();
            } else {
                showMessage("error", data.message || "Failed to add user");
            }
        } catch (error: any) {
            showMessage("error", error?.response?.data?.message || "Failed to add user");
            console.error("Add contact error:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderContactItem = ({ item }: { item: Contact }) => {
        const hasRequestSent = sentRequestIds.has(item.id);
        const alreadyFriends = friendIds.has(item.id);
        if (alreadyFriends) return <></>;

        return (
            <TouchableOpacity
                style={styles.contactItem}
                onPress={() => handleContactPress(item)}
                activeOpacity={0.7}
            >
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: item.bgColor }]}>
                        <Text style={styles.avatarText}>{item.initial}</Text>
                    </View>
                )}
                <View style={styles.contactInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.contactName}>
                            {item.name} {item.isYou && <Text style={styles.youTag}>(You)</Text>}
                        </Text>
                    </View>
                    {item.status && <Text style={styles.contactStatus} numberOfLines={1}>{item.status}</Text>}
                </View>

                {/* Add Friend Button - Only show if request not sent and not current user */}
                {!item.isYou && !hasRequestSent && (
                    <TouchableOpacity
                        style={styles.addFriendButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleAddFriend(item.id, item.name);
                        }}
                        disabled={addingFriend === item.id}
                    >
                        {addingFriend === item.id ? (
                            <ActivityIndicator size="small" color="#009BFF" />
                        ) : (
                            <Ionicons name="person-add-outline" size={20} color="#009BFF" />
                        )}
                    </TouchableOpacity>
                )}

                {/* Request Sent Badge - Show when request already sent */}
                {!item.isYou && hasRequestSent && (
                    <TouchableOpacity
                        style={styles.requestSentBadge}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleCancelRequest(item.id, item.name);
                        }}
                        disabled={addingFriend === item.id}
                    >
                        {addingFriend === item.id ? (
                            <ActivityIndicator size="small" color="#4CAF50" />
                        ) : (
                            <Ionicons name="checkmark" size={20} color="#4CAF50" />
                        )}
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    const ListHeader = () => (
        <>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.secondary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search contacts..."
                    placeholderTextColor={colors.textLight}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.actionSection}>
                <TouchableOpacity style={styles.actionItem} onPress={() => {
                    router.replace("/(GroupChats)/CreateGroupChats")
                }}>
                    <View style={styles.actionIconContainer}>
                        <Ionicons name="people" size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.actionText}>New group</Text>
                </TouchableOpacity>

                {currentUser?.role === "admin" && (
                    <TouchableOpacity style={styles.actionItem} onPress={handleAddContactPress}>
                        <View style={styles.actionIconContainer}>
                            <Ionicons name="person-add" size={24} color={colors.primary} />
                        </View>
                        <Text style={styles.actionText}>New contact</Text>
                        <Text style={styles.actionSubtext}> Add new user</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.actionItem}>
                    <View style={styles.actionIconContainer}>
                        <Ionicons name="people" size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.actionText}>My Friends</Text>
                    <Text style={styles.actionSubtext}> View all friends</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>
                    {filteredContacts.length} {filteredContacts.length === 1 ? 'Contact' : 'Contacts'}
                </Text>
            </View>
        </>
    );

    const ItemSeparator = () => <View style={styles.separator} />;

    const ListEmptyComponent = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
                {searchQuery ? 'No contacts found' : 'No contacts yet'}
            </Text>
            <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try a different search term' : 'Add contacts to get started'}
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
                    <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/(chats)/Chat")}>
                        <Ionicons name="arrow-back" size={24} color={isDark ? colors.white : colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerTitle, { color: isDark ? colors.white : colors.textPrimary }]}>Select contact</Text>
                        <Text style={[styles.headerSubtitle, { color: isDark ? colors.white : colors.textSecondary }]}>
                            {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
                        </Text>
                    </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={fetchAllUsers}
                            >
                                <Ionicons name="refresh" size={22} color={isDark ? colors.white : colors.textPrimary} />
                            </TouchableOpacity>
                            <View>
                                <TouchableOpacity onPress={() => {
                                    router.replace("/(contacts)/PendingRequests")
                                }}>
                                    <Ionicons name="people-outline" size={22} color={isDark ? colors.white : colors.textPrimary} />
                                    <View style={styles.adminBadge}>
                                        <Text style={styles.adminBadgeText}>{pendingRequests ? pendingRequests : 0}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

            {loading && contacts.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading contacts...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredContacts}
                    renderItem={renderContactItem}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={ListHeader}
                    ListEmptyComponent={ListEmptyComponent}
                    ItemSeparatorComponent={ItemSeparator}
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

            {/* Add Contact Modal */}
            <Modal
                visible={isModalVisible}
                transparent
                animationType="slide"
                onRequestClose={handleCloseModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <LinearGradient
                                colors={[colors.primary, colors.primaryDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.modalHeader}
                            >
                                <View style={styles.modalHeaderTop}>
                                    <Text style={styles.modalTitle}>Add New Contact</Text>
                                    <TouchableOpacity onPress={handleCloseModal}>
                                        <Ionicons name="close" size={28} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </LinearGradient>

                            <View style={styles.formContainer}>
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>User Name</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="person" size={20} color={colors.primary} style={styles.fieldIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter username"
                                            placeholderTextColor={colors.textLight}
                                            value={formData.username}
                                            onChangeText={(text) => setFormData({ ...formData, username: text })}
                                        />
                                    </View>
                                </View>

                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>Full Name</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.fieldIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter full name"
                                            placeholderTextColor={colors.textLight}
                                            value={formData.fullName}
                                            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                                        />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={handleCloseModal}
                                    disabled={loading}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                >
                                    <LinearGradient
                                        colors={loading ? [colors.textSecondary, colors.textLight] : [colors.primary, colors.primaryDark]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.submitButtonGradient}
                                    >
                                        {loading ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.submitButtonText}>Add Contact</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

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
        color: colors.white
    } as any,
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
        paddingBottom: Spacing.xl,
        flexGrow: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.lg,
        marginVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: BorderRadius.md,
        ...shadows.sm,
    } as any,
    searchIcon: {
        marginRight: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: Typography.fontSize.base,
        color: colors.textPrimary,
    },
    actionSection: {
        backgroundColor: colors.surface,
        marginVertical: Spacing.sm,
    } as any,
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    actionIconContainer: {
        width: 50,
        height: 50,
        borderRadius: BorderRadius['2xl'],
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    actionText: {
        fontSize: Typography.fontSize.base,
        color: colors.textPrimary,
        fontWeight: Typography.fontWeight.medium as any,
        marginBottom: Spacing.xs,
    },
    actionSubtext: {
        fontSize: Typography.fontSize.sm,
        color: colors.textSecondary,
    },
    sectionHeader: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        backgroundColor: colors.surface,
    } as any,
    sectionHeaderText: {
        fontSize: Typography.fontSize.sm,
        color: colors.textSecondary,
        fontWeight: Typography.fontWeight.medium as any,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        backgroundColor: colors.surface,
    } as any,
    avatar: {
        width: 50,
        height: 50,
        borderRadius: BorderRadius['2xl'],
        marginRight: Spacing.md,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: BorderRadius['2xl'],
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    avatarText: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.semibold as any,
        color: colors.white,
    },
    contactInfo: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    contactName: {
        fontSize: Typography.fontSize.base,
        color: colors.textPrimary,
        fontWeight: Typography.fontWeight.semibold as any,
    },
    youTag: {
        fontSize: Typography.fontSize.sm,
        color: colors.primary,
        fontWeight: Typography.fontWeight.normal as any,
    },
    adminBadge: {
        backgroundColor: colors.warning,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
        marginLeft: Spacing.sm,
    },
    adminBadgeText: {
        fontSize: Typography.fontSize.xs,
        color: colors.white,
        fontWeight: Typography.fontWeight.semibold as any,
    },
    contactStatus: {
        fontSize: Typography.fontSize.sm,
        color: colors.textSecondary,
    },
    contactUsername: {
        fontSize: Typography.fontSize.sm,
        color: colors.primary,
        marginTop: Spacing.xs,
    },
    addFriendButton: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius['2xl'],
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    requestSentBadge: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius['2xl'],
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.success,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border,
        marginLeft: 78,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: Typography.fontSize.lg,
        fontWeight: Typography.fontWeight.semibold as any,
        color: colors.textPrimary,
        marginTop: Spacing.lg,
    },
    emptySubtext: {
        fontSize: Typography.fontSize.sm,
        color: colors.textSecondary,
        marginTop: Spacing.sm,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: BorderRadius['2xl'],
        borderTopRightRadius: BorderRadius['2xl'],
        maxHeight: '80%',
    } as any,
    modalHeader: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        borderTopLeftRadius: BorderRadius['2xl'],
        borderTopRightRadius: BorderRadius['2xl'],
    },
    modalHeaderTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: Typography.fontWeight.semibold as any,
        color: colors.white,
    },
    formContainer: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing['2xl'],
        gap: Spacing.lg,
        backgroundColor: colors.background,
    } as any,
    fieldGroup: {
        marginBottom: Spacing.sm,
    },
    fieldLabel: {
        fontSize: Typography.fontSize.sm,
        fontWeight: Typography.fontWeight.semibold as any,
        color: colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        backgroundColor: colors.surface,
    } as any,
    fieldIcon: {
        marginRight: Spacing.sm,
    },
    input: {
        flex: 1,
        paddingVertical: Spacing.md,
        fontSize: Typography.fontSize.base,
        color: colors.textPrimary,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        borderTopWidth: 2,
    } as any,
    cancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 3,
    },
    cancelButtonText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.semibold as any,
        color: colors.textSecondary,
    },
    submitButton: {
        flex: 1,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        marginTop: 3,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonGradient: {
        flexDirection: 'row',
        paddingVertical: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: {
        fontSize: Typography.fontSize.base,
        fontWeight: Typography.fontWeight.semibold as any,
        color: colors.white,
    },
});