import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function GroupsScreen() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleGroupChatNavigation = (groupId: any) => {
    router.replace({
      pathname: "/(GroupChats)/ChatInGroup",
      params: { groupId },
    });
  };

  const handleCreateGroup = () => {
    router.push("/(GroupChats)/CreateGroupChats");
  };

  const getAllGroupChats = async () => {
    try {
      setError(null);
      const res = await api.get(ENDPOINTS.groups.get);
      const data = res.data;

      if (data.success && data.data) {
        const formattedGroups = formatGroupsData(data.data);
        setGroups(formattedGroups);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.log("Error fetching groups:", error);
      // setError("Failed to load groups");
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatGroupsData = (apiGroups: any) => {
    return apiGroups.map((group: any) => ({
      id: group._id,
      name: group.name,
      description: group.description,
      avatar: group.groupImage,
      memberCount: group.members?.length || 0,
      members: group.members || [],
      createdBy: group.createdBy,
      admins: group.admins || [],
      isActive: group.isActive,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));
  };

  const onRefresh = () => {
    setRefreshing(true);
    getAllGroupChats();
  };

  useEffect(() => {
    getAllGroupChats();
  }, []);

  const renderGroupItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.groupItem}
      onPress={() => handleGroupChatNavigation(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.groupImageContainer}>
        <Image source={{ uri: item.avatar }} style={styles.groupImage} />
        <View style={styles.memberCountBadge}>
          <Ionicons name="people" size={12} color="#fff" />
          <Text style={styles.memberCountText}>{item.memberCount}</Text>
        </View>
      </View>

      <View style={styles.groupContent}>
        <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.groupDescription} numberOfLines={1}>
          {item.description || 'No description'}
        </Text>

        {/* Members avatars */}
        <View style={styles.membersAvatarContainer}>
          {item.members.slice(0, 3).map((member: any, index: any) => (
            <Image
              key={member._id}
              source={{ uri: member.profileImage }}
              style={[
                styles.memberSmallAvatar,
                { marginLeft: index > 0 ? -8 : 0, zIndex: 3 - index },
              ]}
            />
          ))}
          {item.memberCount > 3 && (
            <View style={[styles.memberSmallAvatar, styles.moreMembers]}>
              <Text style={styles.moreMembersText}>+{item.memberCount - 3}</Text>
            </View>
          )}
        </View>

        <Text style={styles.createdByText}>
          Created by {item.createdBy.fullName}
        </Text>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="people-outline" size={64} color="#CCC" />
      </View>
      <Text style={styles.emptyTitle}>No Groups Yet</Text>
      <Text style={styles.emptyMessage}>
        Create or join a group to start chatting with your friends!
      </Text>
      <TouchableOpacity style={styles.createGroupButton} onPress={handleCreateGroup}>
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.createGroupButtonText}>Create a Group</Text>
      </TouchableOpacity>
    </View>
  );

  const ErrorState = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF5722" />
      </View>
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={getAllGroupChats}>
        <Ionicons name="reload" size={20} color="#fff" />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading groups...</Text>
      </View>
    );
  }

  if (error && groups.length === 0) {
    return <ErrorState />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        renderItem={renderGroupItem}
        keyExtractor={(item: any) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={EmptyState}
        ListFooterComponent={() => <View style={{ height: 20 }} />}
      />

      {/* <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateGroup}
      >
        <LinearGradient
          colors={["#009BFF", "#0066CC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </LinearGradient>
      </TouchableOpacity> */}
    </View>
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
    backgroundColor: '#fff',
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
    paddingHorizontal: 32,
    backgroundColor: '#fff',
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  createGroupButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    gap: 8,
  },
  createGroupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#fff',
  },
  errorIconContainer: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#FF5722',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  groupImageContainer: {
    position: 'relative',
    marginRight: 14,
  },
  groupImage: {
    width: 60,
    height: 60,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  memberCountBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  groupContent: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  membersAvatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  memberSmallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  moreMembers: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreMembersText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#666',
  },
  createdByText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  actionContainer: {
    marginLeft: 10,
  },
  moreButton: {
    padding: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});