import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import GlobalMessage from '@/CustomComponents/message';
import { FriendGroupChat } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';


export default function CreateGroupScreen() {
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<FriendGroupChat[]>([]);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [friends, setFriends] = useState<FriendGroupChat[]>([]);
    const [filteredFriends, setFilteredFriends] = useState<FriendGroupChat[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [loadingCreate, setLoadingCreate] = useState(false);
    const [messageVisible, setMessageVisible] = useState(false);
    const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
    const [messageText, setMessageText] = useState('');

    useEffect(() => {
        if (showMemberModal) {
            fetchFriends();
        }
    }, [showMemberModal]);

    useEffect(() => {
        filterFriends();
    }, [searchQuery, friends]);

    const showMessage = (type: 'success' | 'error' | 'info', message: string) => {
        setMessageType(type);
        setMessageText(message);
        setMessageVisible(true);
    };

    const fetchFriends = async () => {
        try {
            setLoadingFriends(true);
            const res = await api.get(ENDPOINTS.friends.getAll);
            
            if (res.data.success && res.data.data) {
                const friendsList = res.data.data.filter(
                    (friend: FriendGroupChat) => !selectedMembers.find((m) => m._id === friend._id)
                );
                setFriends(friendsList);
                setFilteredFriends(friendsList);
            }
        } catch (error: any) {
            console.log('Error fetching friends:', error);
            showMessage('error', error?.response?.data?.message || 'Failed to load friends');
        } finally {
            setLoadingFriends(false);
        }
    };

    const filterFriends = () => {
        if (searchQuery.trim() === '') {
            setFilteredFriends(friends);
        } else {
            const filtered = friends.filter((friend) =>
                friend.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                friend.username.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredFriends(filtered);
        }
    };

    const handleAddMember = (friend: FriendGroupChat) => {
        setSelectedMembers([...selectedMembers, friend]);
        setFriends(friends.filter((f) => f._id !== friend._id));
        setFilteredFriends(filteredFriends.filter((f) => f._id !== friend._id));
    };

    const handleRemoveMember = (memberId: string) => {
        const removedMember = selectedMembers.find((m) => m._id === memberId);
        if (removedMember) {
            setSelectedMembers(selectedMembers.filter((m) => m._id !== memberId));
            setFriends([...friends, removedMember]);
            setFilteredFriends([...filteredFriends, removedMember]);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            showMessage('info', 'Please enter a group name');
            return;
        }

        if (selectedMembers.length < 1) {
            showMessage('info', 'Please add at least 1 members to create a group');
            return;
        }

        try {
            setLoadingCreate(true);
            const memberIds = selectedMembers.map((m) => m._id);

            const res = await api.post(ENDPOINTS.groups.create, {
                name: groupName.trim(),
                memberIds: memberIds,
                description: groupDescription.trim() || '',
            });

            if (res.data.success) {
                showMessage('success', 'Group created successfully!');
                setTimeout(() => {
                    router.back();
                }, 1500);
            } else {
                showMessage('error', res.data.message || 'Failed to create group');
            }
        } catch (error: any) {
            console.log('Error creating group:', error);
            showMessage('error', error?.response?.data?.message || 'Failed to create group');
        } finally {
            setLoadingCreate(false);
        }
    };

    const getAvatarUrl = (profileImage?: string, fullName?: string) => {
        if (profileImage) {
            return profileImage;
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'User')}&background=009BFF&color=fff&size=128`;
    };

    const renderSelectedMember = ({ item }: { item: FriendGroupChat }) => (
        <View style={styles.selectedMemberItem}>
            <Image
                source={{ uri: getAvatarUrl(item.profileImage, item.fullName) }}
                style={styles.selectedMemberAvatar}
            />
            <View style={styles.selectedMemberInfo}>
                <Text style={styles.selectedMemberName} numberOfLines={1}>
                    {item.fullName}
                </Text>
                <Text style={styles.selectedMemberUsername} numberOfLines={1}>
                    @{item.username}
                </Text>
            </View>
            <TouchableOpacity
                onPress={() => handleRemoveMember(item._id)}
                style={styles.removeMemberButton}
            >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
            </TouchableOpacity>
        </View>
    );

    const renderFriend = ({ item }: { item: FriendGroupChat }) => (
        <TouchableOpacity
            style={styles.friendItem}
            onPress={() => handleAddMember(item)}
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
            <View style={styles.addButton}>
                <Ionicons name="add-circle" size={32} color="#009BFF" />
            </View>
        </TouchableOpacity>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LinearGradient
                colors={['#009BFF', '#0066CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Create Group</Text>
                    <View style={{ width: 24 }} />
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContentContainer}
            >
                {/* Group Icon Placeholder */}
                <View style={styles.groupIconSection}>
                    <View style={styles.groupIconPlaceholder}>
                        <Ionicons name="people" size={48} color="#009BFF" />
                    </View>
                    <Text style={styles.groupIconHint}>Group Icon</Text>
                </View>

                {/* Group Name Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>
                        Group Name <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="chatbubbles" size={20} color="#009BFF" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter group name"
                            placeholderTextColor="#999"
                            value={groupName}
                            onChangeText={setGroupName}
                            maxLength={50}
                        />
                        <Text style={styles.charCount}>{groupName.length}/50</Text>
                    </View>
                </View>

                {/* Group Description Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Description (Optional)</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="information-circle" size={20} color="#009BFF" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="What's this group about?"
                            placeholderTextColor="#999"
                            value={groupDescription}
                            onChangeText={setGroupDescription}
                            maxLength={200}
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                    <Text style={styles.charCountRight}>{groupDescription.length}/200</Text>
                </View>

                {/* Members Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>
                            Members <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.memberCountBadge}>
                            <Text style={styles.memberCountText}>{selectedMembers.length}</Text>
                        </View>
                    </View>

                    {selectedMembers.length > 0 ? (
                        <FlatList
                            data={selectedMembers}
                            renderItem={renderSelectedMember}
                            keyExtractor={(item) => item._id}
                            scrollEnabled={false}
                            style={styles.selectedMembersList}
                        />
                    ) : (
                        <View style={styles.noMembersContainer}>
                            <Ionicons name="people-outline" size={48} color="#CCC" />
                            <Text style={styles.noMembersText}>No members added yet</Text>
                            <Text style={styles.noMembersSubtext}>Add at least 2 members</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.addMembersButton}
                        onPress={() => setShowMemberModal(true)}
                    >
                        <LinearGradient
                            colors={['#009BFF', '#0066CC']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.addMembersButtonGradient}
                        >
                            <Ionicons name="person-add" size={20} color="#fff" />
                            <Text style={styles.addMembersButtonText}>Add Members</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Fixed Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.createButton,
                        (!groupName.trim() || selectedMembers.length < 1) && styles.createButtonDisabled,
                    ]}
                    onPress={handleCreateGroup}
                    disabled={!groupName.trim() || selectedMembers.length < 1 || loadingCreate}
                >
                    <LinearGradient
                        colors={(!groupName.trim() || selectedMembers.length < 1) 
                            ? ['#CCC', '#999'] 
                            : ['#4CAF50', '#45A049']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.createButtonGradient}
                    >
                        {loadingCreate ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                                <Text style={styles.createButtonText}>Create Group</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Member Selection Modal */}
            <Modal
                visible={showMemberModal}
                transparent={false}
                animationType="slide"
                onRequestClose={() => setShowMemberModal(false)}
            >
                <View style={styles.modalContainer}>
                    <LinearGradient
                        colors={['#009BFF', '#0066CC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.modalHeader}
                    >
                        <View style={styles.modalHeaderContent}>
                            <TouchableOpacity onPress={() => setShowMemberModal(false)}>
                                <Ionicons name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>
                            <View style={styles.modalTitleContainer}>
                                <Text style={styles.modalTitle}>Select Members</Text>
                                <Text style={styles.modalSubtitle}>
                                    {filteredFriends.length} friends available
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowMemberModal(false)}>
                                <Ionicons name="checkmark" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search friends..."
                            placeholderTextColor="#999"
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
                            <Ionicons name="people-outline" size={64} color="#CCC" />
                            <Text style={styles.emptyText}>
                                {searchQuery ? 'No friends found' : 'No friends available'}
                            </Text>
                            <Text style={styles.emptySubtext}>
                                {searchQuery 
                                    ? 'Try a different search term' 
                                    : 'All friends have been added'}
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
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 100,
    },
    groupIconSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    groupIconPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F0F8FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#009BFF',
        borderStyle: 'dashed',
    },
    groupIconHint: {
        fontSize: 12,
        color: '#999',
        marginTop: 8,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    required: {
        color: '#FF3B30',
    },
    memberCountBadge: {
        backgroundColor: '#009BFF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    memberCountText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 12,
        backgroundColor: '#F9F9F9',
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#000',
    },
    textArea: {
        paddingTop: 12,
        paddingBottom: 12,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        color: '#999',
        marginLeft: 8,
    },
    charCountRight: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginTop: 4,
    },
    noMembersContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        backgroundColor: '#F8F8F8',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
    },
    noMembersText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginTop: 12,
    },
    noMembersSubtext: {
        fontSize: 13,
        color: '#999',
        marginTop: 4,
    },
    selectedMembersList: {
        marginBottom: 12,
    },
    selectedMemberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F8FF',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: 8,
        borderWidth: 1.5,
        borderColor: '#009BFF',
    },
    selectedMemberAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    selectedMemberInfo: {
        flex: 1,
    },
    selectedMemberName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    selectedMemberUsername: {
        fontSize: 13,
        color: '#009BFF',
    },
    removeMemberButton: {
        padding: 4,
    },
    addMembersButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    addMembersButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 8,
    },
    addMembersButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: 24,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    createButton: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    createButtonDisabled: {
        opacity: 0.6,
    },
    createButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    createButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitleContainer: {
        flex: 1,
        marginHorizontal: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#fff',
        textAlign: 'center',
        marginTop: 2,
        opacity: 0.9,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 12,
        paddingHorizontal: 12,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        backgroundColor: '#F9F9F9',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 15,
        color: '#000',
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
        paddingVertical: 8,
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
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    friendUsername: {
        fontSize: 13,
        color: '#009BFF',
    },
    addButton: {
        padding: 4,
    },
    separator: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginLeft: 76,
    },
});