import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { darkTheme, lightTheme } from "@/src/constants/color";
import { ThemeContext } from "@/src/services/ThemeContext";
import { Contact, createContactResponse } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { router } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
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
    const currentTheme = theme === 'dark' ? darkTheme : lightTheme;
    const styles = createStyles(currentTheme);

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
        const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
        return colors[Math.floor(Math.random() * colors.length)];
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
                <Ionicons name="search" size={20} color={currentTheme.iconColor} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search contacts..."
                    placeholderTextColor={currentTheme.placeholderText}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.actionSection}>
                <TouchableOpacity style={styles.actionItem} onPress={() => {
                    router.replace("/(GroupChats)/CreateGroupChats")
                }}>
                    <View style={styles.actionIconContainer}>
                        <Ionicons name="people" size={24} color="#007AFF" />
                    </View>
                    <Text style={styles.actionText}>New group</Text>
                </TouchableOpacity>

                {currentUser?.role === "admin" && (
                    <TouchableOpacity style={styles.actionItem} onPress={handleAddContactPress}>
                        <View style={styles.actionIconContainer}>
                            <Ionicons name="person-add" size={24} color="#007AFF" />
                        </View>
                        <Text style={styles.actionText}>New contact</Text>
                        <Text style={styles.actionSubtext}> Add new user</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.actionItem}>
                    <View style={styles.actionIconContainer}>
                        <Ionicons name="people" size={24} color="#007AFF" />
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
                barStyle={theme === "dark" ? "light-content" : "dark-content"}
                backgroundColor={currentTheme.background}
            />

            <LinearGradient
                colors={[currentTheme.headerGradientStart, currentTheme.headerGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/(chats)/Chat")}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>Select contact</Text>
                            <Text style={styles.headerSubtitle}>
                                {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
                            </Text>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={fetchAllUsers}
                            >
                                <Ionicons name="refresh" size={25} color="#fff" />
                            </TouchableOpacity>
                            <View>
                                <TouchableOpacity onPress={() => {
                                    router.replace("/(contacts)/PendingRequests")
                                }}>
                                    <Ionicons name="people-outline" size={25} color="#fff" />
                                    <View style={styles.adminBadge}>
                                        <Text style={styles.adminBadgeText}>{pendingRequests ? pendingRequests : 0}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {loading && contacts.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#009BFF" />
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
                            colors={['#009BFF']}
                            tintColor="#009BFF"
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
                                colors={[currentTheme.headerGradientStart, currentTheme.headerGradientEnd]}
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
                                        <Ionicons name="person" size={20} color="#007AFF" style={styles.fieldIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter username"
                                            placeholderTextColor={currentTheme.placeholderText}
                                            value={formData.username}
                                            onChangeText={(text) => setFormData({ ...formData, username: text })}
                                        />
                                    </View>
                                </View>

                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>Full Name</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="person-outline" size={20} color="#007AFF" style={styles.fieldIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter full name"
                                            placeholderTextColor={currentTheme.placeholderText}
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
                                        colors={loading ? ["#999", "#666"] : [currentTheme.buttonGradientStart, currentTheme.buttonGradientEnd]}
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

const createStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        height: 120,
        justifyContent: "flex-end",
        alignItems: "center",
        display: "flex",
        color: "white"
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
         backgroundColor: theme.background,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },
    listContent: {
        paddingBottom: 20,
        flexGrow: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: theme.searchBackground,
        borderRadius: 12,
        shadowColor: theme.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: theme.searchInputText,
    },
    actionSection: {
        backgroundColor: theme.cardBackground,
        marginVertical: 8,

    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    actionIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    actionText: {
        fontSize: 16,
        color: theme.primaryText,
        fontWeight: '500',
        marginBottom: 2,
    },
    actionSubtext: {
        fontSize: 13,
        color: theme.secondaryText,
    },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: theme.searchBackground,
    },
    sectionHeaderText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: theme.cardBackground,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.primaryText,
    },
    contactInfo: {
        flex: 1,
        marginRight: 8,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    contactName: {
        fontSize: 16,
        color: theme.primaryText,
        fontWeight: '600',
    },
    youTag: {
        fontSize: 14,
        color: '#009BFF',
        fontWeight: '400',
    },
    adminBadge: {
        backgroundColor: '#FF9800',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
    },
    adminBadgeText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '600',
    },
    contactStatus: {
        fontSize: 14,
        color: theme.secondaryText,
    },
    contactUsername: {
        fontSize: 13,
        color: '#009BFF',
        marginTop: 2,
    },
    addFriendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F8FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#009BFF',
    },
    requestSentBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F8F0',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    separator: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginLeft: 78,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.emptyStateText,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: theme.emptyStateSubtext,
        marginTop: 8,
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
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    modalHeaderTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
    },
    formContainer: {
        paddingHorizontal: 16,
        paddingVertical: 24,
        gap: 16,
        backgroundColor: theme.cardBackground,
    },
    fieldGroup: {
        marginBottom: 8,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.secondaryText,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: theme.inputBorder,
        borderRadius: 12,
        paddingHorizontal: 12,
        backgroundColor: theme.cardBackground,
    },
    fieldIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: theme.inputText,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingBottom: 20,
        backgroundColor: theme.cardBackground,
        borderTopColor: theme.inputBorder,
        // borderTopWidth: 2,
    },
    cancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: theme.inputBorder,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        // marginTop: 3,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.secondaryText,
    },
    submitButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        // marginTop: 3,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonGradient: {
        flexDirection: 'row',
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});