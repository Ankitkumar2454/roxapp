import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { darkTheme, lightTheme } from "@/src/constants/color";
import { ThemeContext } from "@/src/services/ThemeContext";
import { GroupData, Member } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';


interface Friend {
    _id: string;
    username: string;
    fullName: string;
    profileImage?: string;
    isActive: boolean;
}

export default function GroupInfoScreen() {
    const { theme, toggleTheme } = useContext(ThemeContext);
    const currentTheme = theme === 'dark' ? darkTheme : lightTheme;
    const styles = createStyles(currentTheme);
    const router = useRouter();
    const params = useLocalSearchParams();
    const groupId = params.groupId as string;

    const [groupData, setGroupData] = useState<GroupData | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [messageVisible, setMessageVisible] = useState(false);
    const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
    const [messageText, setMessageText] = useState('');

    // Add Members Modal
    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [availableFriends, setAvailableFriends] = useState<Friend[]>([]);
    const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [addingMember, setAddingMember] = useState<string | null>(null);

    const [removingMember, setRemovingMember] = useState<string | null>(null);
    const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null);

    useEffect(() => {
        initializeScreen();
    }, []);

    useEffect(() => {
        filterFriends();
    }, [searchQuery, availableFriends]);

    const initializeScreen = async () => {
        const user = await Storage.getItem("user");
        setCurrentUser(user);
        if (groupId) {
            await fetchGroupData();
        }
    };

    const fetchGroupData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`${ENDPOINTS.groups.get}${groupId}`);

            if (response.data.success && response.data.data) {
                setGroupData(response.data.data);
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

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchGroupData();
        setRefreshing(false);
    };

    const fetchAvailableFriends = async () => {
        try {
            setLoadingFriends(true);
            const response = await api.get(ENDPOINTS.friends.getAll);

            if (response.data.success && response.data.data) {
                // Filter out users who are already members
                const memberIds = groupData?.members.map(m => m._id) || [];
                const available = response.data.data.filter(
                    (friend: Friend) => !memberIds.includes(friend._id)
                );
                setAvailableFriends(available);
                setFilteredFriends(available);
            }
        } catch (error: any) {
            console.log('Error fetching friends:', error);
            showMessage('error', 'Failed to load friends');
        } finally {
            setLoadingFriends(false);
        }
    };

    const filterFriends = () => {
        if (searchQuery.trim() === '') {
            setFilteredFriends(availableFriends);
        } else {
            const filtered = availableFriends.filter((friend) =>
                friend.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                friend.username.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredFriends(filtered);
        }
    };

    const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
        setMessageType(type);
        setMessageText(text);
        setMessageVisible(true);
    };

    const isUserAdmin = () => {
        if (!groupData || !currentUser) return false;
        return groupData.admins.some(admin => admin._id === currentUser._id || admin._id === currentUser.id);
    };

    const isMemberAdmin = (memberId: string) => {
        if (!groupData) return false;
        return groupData.admins.some(admin => admin._id === memberId);
    };

    const getAvatarUrl = (profileImage?: string, fullName?: string) => {
        if (profileImage) return profileImage;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=009BFF&color=fff&size=128`;
    };

    const handleAddMember = async (friendId: string, friendName: string) => {
        try {
            setAddingMember(friendId);

            const response = await api.post(ENDPOINTS.groups.addMember, {
                groupId: groupId,
                userId: friendId
            });
            console.log(response)

            if (response.data.success) {
                showMessage('success', `${friendName} added to group`);
                await fetchGroupData();
                setShowAddMembersModal(false);
            } else {
                showMessage('error', response.data.message || 'Failed to add member');
            }
        } catch (error: any) {
            console.log(error)
            showMessage('error', error?.response?.data?.message || 'Failed to add member');
        } finally {
            setAddingMember(null);
        }
    };

    const handleRemoveMember = (member: Member) => {
        Alert.alert(
            'Remove Member',
            `Are you sure you want to remove ${member.fullName} from the group?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setRemovingMember(member._id);

                            const response = await api.post(ENDPOINTS.groups.removeMember, {
                                groupId: groupId,
                                userId: member._id
                            });

                            if (response.data.success) {
                                showMessage('success', `${member.fullName} removed from group`);
                                await fetchGroupData();
                            } else {
                                showMessage('error', response.data.message || 'Failed to remove member');
                            }
                        } catch (error: any) {
                            showMessage('error', error?.response?.data?.message || 'Failed to remove member');
                        } finally {
                            setRemovingMember(null);
                        }
                    }
                }
            ]
        );
    };

    const handleLeaveGroup = () => {
        Alert.alert(
            'Exit Group',
            `Are you sure you want to exit from the group?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Exit',
                    style: 'destructive',
                    onPress: async () => {
                        try {

                            const response = await api.post(`${ENDPOINTS.groups.leaveGroup}${groupData?._id}/leave`, {
                                userId: currentUser._id
                            });

                            if (response.data.success) {
                                showMessage('success', `${currentUser.fullName} removed from group`);
                                setTimeout(() => {
                                    router.replace("/(chats)/Groups");
                                }, 2500)
                            } else {
                                showMessage('error', response.data.message || 'Failed to remove member');
                            }
                        } catch (error: any) {
                            showMessage('error', error?.response?.data?.message || 'Failed to remove member');
                        } finally {
                            setRemovingMember(null);
                        }
                    }
                }
            ]
        );
    }

    const handleToggleAdmin = async (member: Member) => {
        const isAdmin = isMemberAdmin(member._id);
        const action = isAdmin ? 'remove admin rights from' : 'make admin';

        Alert.alert(
            isAdmin ? 'Remove Admin' : 'Make Admin',
            `Are you sure you want to ${action} ${member.fullName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            setTogglingAdmin(member._id);

                            const endpoint = isAdmin
                                ? ENDPOINTS.groups.removeAdmin
                                : ENDPOINTS.groups.makeAdmin;

                            const response = await api.post(endpoint, {
                                groupId: groupId,
                                userId: member._id
                            });

                            if (response.data.success) {
                                showMessage('success', isAdmin
                                    ? `${member.fullName} is no longer an admin`
                                    : `${member.fullName} is now an admin`);
                                await fetchGroupData();
                            } else {
                                showMessage('error', response.data.message || 'Failed to update admin status');
                            }
                        } catch (error: any) {
                            showMessage('error', error?.response?.data?.message || 'Failed to update admin status');
                        } finally {
                            setTogglingAdmin(null);
                        }
                    }
                }
            ]
        );
    };

    const isCreator = () => {
        if (!groupData || !currentUser) return false;
        console.log(groupData.createdBy._id, currentUser, "harsh"
        )
        return currentUser.id === groupData?.createdBy._id;
    }

    const renderMember = ({ item }: { item: Member }) => {
        const isAdmin = isMemberAdmin(item._id);
        const isCreator = item._id === groupData?.createdBy._id;
        const isCurrentUserAdmin = isUserAdmin();
        const isCurrentUser = item._id === currentUser?._id || item._id === currentUser?.id;

        return (
            <View style={styles.memberItem}>
                <View style={styles.memberLeft}>
                    <View style={styles.memberAvatarContainer}>
                        <Image
                            source={{ uri: getAvatarUrl(item.profileImage, item.fullName) }}
                            style={styles.memberAvatar}
                        />
                        {isAdmin && (
                            <View style={styles.adminBadge}>
                                <Ionicons name="star" size={12} color="#fff" />
                            </View>
                        )}
                    </View>
                    <View style={styles.memberInfo}>
                        <View style={styles.memberNameRow}>
                            <Text style={styles.memberName}>{item.fullName}</Text>
                            {isCurrentUser && <Text style={styles.youTag}>(You)</Text>}
                        </View>
                        <Text style={styles.memberUsername}>@{item.username}</Text>
                        {isCreator && (
                            <View style={styles.creatorBadge}>
                                <Ionicons name="star-outline" size={12} color="#FF9800" />
                                <Text style={styles.creatorText}>Creator</Text>
                            </View>
                        )}
                    </View>
                </View>

                {isCurrentUserAdmin && !isCurrentUser && !isCreator && (
                    <View style={styles.memberActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleToggleAdmin(item)}
                            disabled={togglingAdmin === item._id}
                        >
                            {togglingAdmin === item._id ? (
                                <ActivityIndicator size="small" color="#009BFF" />
                            ) : (
                                <Ionicons
                                    name={isAdmin ? "shield-checkmark" : "shield-outline"}
                                    size={20}
                                    color={isAdmin ? "#FF9800" : "#009BFF"}
                                />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleRemoveMember(item)}
                            disabled={removingMember === item._id}
                        >
                            {removingMember === item._id ? (
                                <ActivityIndicator size="small" color="#FF3B30" />
                            ) : (
                                <Ionicons name="remove-circle-outline" size={20} color="#FF3B30" />
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const renderFriend = ({ item }: { item: Friend }) => (
        <TouchableOpacity
            style={styles.friendItem}
            onPress={() => handleAddMember(item._id, item.fullName)}
            disabled={addingMember === item._id}
            activeOpacity={0.7}
        >
            <View style={styles.friendAvatarContainer}>
                <Image
                    source={{ uri: getAvatarUrl(item.profileImage, item.fullName) }}
                    style={styles.friendAvatar}
                />
                {item.isActive && <View style={styles.activeIndicator} />}
            </View>
            <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{item.fullName}</Text>
                <Text style={styles.friendUsername}>@{item.username}</Text>
            </View>
            {addingMember === item._id ? (
                <ActivityIndicator size="small" color="#009BFF" />
            ) : (
                <Ionicons name="add-circle" size={28} color="#009BFF" />
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#009BFF" />
                <Text style={styles.loadingText}>Loading group info...</Text>
            </View>
        );
    }

    if (!groupData) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
                <Text style={styles.errorText}>Group not found</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.replace("/(chats)/Groups")}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={['#009BFF', '#0066CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => router.replace("/(chats)/Groups")} style={styles.headerBackButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Group Info</Text>
                <View style={{ width: 24 }} />
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#009BFF']}
                        tintColor="#009BFF"
                    />
                }
            >
                {/* Group Image & Name */}
                <View style={styles.groupHeader}>
                    <Image
                        source={{
                            uri: groupData.groupImage ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(groupData.name)}&background=009BFF&color=fff&size=256`
                        }}
                        style={styles.groupImage}
                    />
                    <Text style={styles.groupName}>{groupData.name}</Text>
                    <Text style={styles.groupMembersCount}>
                        {groupData.members.length} {groupData.members.length === 1 ? 'member' : 'members'}
                    </Text>
                </View>

                {/* Description */}
                {groupData.description && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="information-circle" size={20} color="#009BFF" />
                            <Text style={styles.sectionTitle}>Description</Text>
                        </View>
                        <Text style={styles.descriptionText}>{groupData.description}</Text>
                    </View>
                )}

                {/* Created By */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="person" size={20} color="#009BFF" />
                        <Text style={styles.sectionTitle}>Created By</Text>
                    </View>
                    <View style={styles.creatorInfo}>
                        <Image
                            source={{ uri: getAvatarUrl(groupData.createdBy.profileImage, groupData.createdBy.fullName) }}
                            style={styles.creatorAvatar}
                        />
                        <View style={styles.creatorDetails}>
                            <Text style={styles.creatorName}>{groupData.createdBy.fullName}</Text>
                            <Text style={styles.creatorUsername}>@{groupData.createdBy.username}</Text>
                        </View>
                    </View>
                </View>

                {/* Members Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="people" size={20} color="#009BFF" />
                            <Text style={styles.sectionTitle}>Members ({groupData.members.length})</Text>
                        </View>
                        {isUserAdmin() && (
                            <TouchableOpacity
                                style={styles.addMemberButton}
                                onPress={() => {
                                    setShowAddMembersModal(true);
                                    fetchAvailableFriends();
                                }}
                            >
                                <Ionicons name="person-add" size={18} color="#009BFF" />
                                <Text style={styles.addMemberText}>Add</Text>
                            </TouchableOpacity>
                        )}
                        {!isCreator() && (
                            <TouchableOpacity
                                style={styles.exitGroupButton}
                                onPress={() => {
                                    // setShowAddMembersModal(true);
                                    handleLeaveGroup();
                                }}
                            >
                                <Ionicons name="exit" size={18} color="red" />
                                <Text style={styles.leaveGroupStyle}>Leave</Text>
                            </TouchableOpacity>
                        )}

                    </View>

                    <FlatList
                        data={groupData.members}
                        renderItem={renderMember}
                        keyExtractor={(item) => item._id}
                        scrollEnabled={false}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                    />
                </View>

                {/* Admin Info */}
                {isUserAdmin() && (
                    <View style={styles.adminInfoBox}>
                        <Ionicons name="information-circle" size={20} color="#009BFF" />
                        <Text style={styles.adminInfoText}>
                            As an admin, you can add/remove members and manage other admins. The creator cannot be removed or demoted.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Add Members Modal */}
            <Modal
                visible={showAddMembersModal}
                transparent={false}
                animationType="slide"
                onRequestClose={() => setShowAddMembersModal(false)}
            >
                <View style={styles.modalContainer}>
                    <LinearGradient
                        colors={['#009BFF', '#0066CC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.modalHeader}
                    >
                        <TouchableOpacity onPress={() => setShowAddMembersModal(false)}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Add Members</Text>
                        <View style={{ width: 24 }} />
                    </LinearGradient>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search friends..."
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

                    {/* Friends List */}
                    {loadingFriends ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#009BFF" />
                            <Text style={styles.loadingText}>Loading friends...</Text>
                        </View>
                    ) : filteredFriends.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>
                                {searchQuery ? 'No friends found' : 'No friends available'}
                            </Text>
                            <Text style={styles.emptySubtext}>
                                {searchQuery ? 'Try a different search' : 'All friends are already members'}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredFriends}
                            renderItem={renderFriend}
                            keyExtractor={(item) => item._id}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                            contentContainerStyle={styles.friendsList}
                        />
                    )}
                </View>
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
    backButton: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#009BFF',
        borderRadius: 24,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
    },
    headerBackButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    groupHeader: {
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: '#F8F8F8',
    },
    groupImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 16,
        borderWidth: 4,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    groupName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000',
        marginBottom: 4,
    },
    groupMembersCount: {
        fontSize: 14,
        color: '#666',
    },
    section: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    descriptionText: {
        fontSize: 15,
        color: '#666',
        lineHeight: 22,
    },
    creatorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    creatorAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    creatorDetails: {
        flex: 1,
    },
    creatorName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    creatorUsername: {
        fontSize: 14,
        color: '#009BFF',
    },
    addMemberButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#F0F8FF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#009BFF',
    },
    addMemberText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#009BFF',
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    memberLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    memberAvatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    memberAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    adminBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#FF9800',
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    memberInfo: {
        flex: 1,
    },
    memberNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginRight: 6,
    },
    youTag: {
        fontSize: 13,
        color: '#009BFF',
        fontWeight: '400',
    },
    memberUsername: {
        fontSize: 14,
        color: '#009BFF',
        marginBottom: 2,
    },
    creatorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    creatorText: {
        fontSize: 12,
        color: '#FF9800',
        fontWeight: '600',
    },
    memberActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    adminInfoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 12,
        backgroundColor: '#F0F8FF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#009BFF',
        gap: 8,
    },
    adminInfoText: {
        flex: 1,
        fontSize: 13,
        color: '#009BFF',
        lineHeight: 18,
    },
    separator: {
        height: 1,
        backgroundColor: '#F0F0F0',
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 16,
        paddingHorizontal: 12,
        borderWidth: 1.5,
        borderColor:  theme.shadowColor,
        borderRadius: 12,
        backgroundColor: theme.searchBackground,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 15,
        color:  theme.searchInputText,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
    },
    friendsList: {
        paddingHorizontal: 16,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    friendAvatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    friendAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#fff',
    },
    friendInfo: {
        flex: 1,
    },
    friendUsername: {
        fontSize: 13,
        color: '#009BFF',
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    leaveGroupStyle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF3B30'
    },
    exitGroupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#fcf6f6ff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
})