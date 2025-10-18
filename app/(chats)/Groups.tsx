import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function GroupsScreen() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredGroups, setFilteredGroups] = useState([]);

  const handleGroupChatNavigation = (groupId: any) => {
    router.replace({
      pathname: "/(GroupChats)/ChatInGroup",
      params: { groupId },
    });
  };

  const handleCreateGroup = () => {
    router.push("/(GroupChats)/CreateGroupChats");
  };

  const getRandomColor = () => {
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Search filtering function
  const filterGroups = (searchText: string) => {
    if (!searchText.trim()) {
      setFilteredGroups(groups);
      return;
    }
    
    const filtered = groups.filter((group: any) => 
      group.name.toLowerCase().includes(searchText.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      group.createdBy?.fullName?.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredGroups(filtered);
  };

  // Handle search input change
  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    filterGroups(text);
  };

  const getAllGroupChats = async () => {
    try {
      setError(null);
      const res = await api.get(ENDPOINTS.groups.get);
      const data = res.data;

      if (data.success && data.data) {
        const formattedGroups = formatGroupsData(data.data);
        setGroups(formattedGroups);
        setFilteredGroups(formattedGroups);
      } else {
        setGroups([]);
        setFilteredGroups([]);
      }
    } catch (error) {
      console.log("Error fetching groups:", error);
      // setError("Failed to load groups");
      setGroups([]);
      setFilteredGroups([]);
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
      initial: group.name ? group.name.charAt(0).toUpperCase() : group.name.charAt(0).toUpperCase(),
    }));
  };

  const onRefresh = () => {
    setRefreshing(true);
    getAllGroupChats();
  };

  useEffect(() => {
    getAllGroupChats();
  }, []);

  // Update filtered groups when groups list changes
  useEffect(() => {
    filterGroups(searchTerm);
  }, [groups]);

  const renderGroupItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.groupItem}
      onPress={() => handleGroupChatNavigation(item.id)}
      activeOpacity={0.8}
    >
      <View style={styles.groupCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Image 
              source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${item.name}&backgroundColor=${getRandomColor().replace('#', '')}&fontSize=20&fontWeight=600` }}
              style={styles.avatarImage}
              defaultSource={{ uri: `https://ui-avatars.com/api/?name=${item.name}&background=${getRandomColor().replace('#', '')}&color=fff&size=48&bold=true&format=png&font-size=0.6` }}
            />
          </View>
          <View style={styles.memberCountBadge}>
            <Ionicons name="people" size={10} color="#fff" />
            <Text style={styles.memberCountText}>{item.memberCount}</Text>
          </View>
        </View>

        <View style={styles.groupContent}>
          <View style={styles.groupHeader}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{item.name}</Text>
            </View>
            <Text style={styles.time}>{item.memberCount} members</Text>
          </View>

          <View style={styles.messageRow}>
            <Text style={styles.message} numberOfLines={1}>
              {item.description || 'No description available'}
            </Text>
          </View>

          <Text style={styles.username}>Created by {item.createdBy?.fullName || 'Unknown'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.emptyIconContainer}
      >
        <Ionicons name="people-outline" size={60} color="#fff" />
      </LinearGradient>
      <Text style={styles.emptyText}>No Groups Yet</Text>
      <Text style={styles.emptySubtext}>
        Create or join a group to start chatting with your friends!
      </Text>
      <TouchableOpacity
        style={styles.addFriendsButton}
        onPress={handleCreateGroup}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.addButtonGradient}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addFriendsButtonText}>Create a Group</Text>
        </LinearGradient>
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
      <StatusBar backgroundColor="#667eea" barStyle="light-content" />
      <View style={styles.listHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#667eea" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor="#999"
            value={searchTerm}
            onChangeText={handleSearchChange}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredGroups}
        renderItem={renderGroupItem}
        keyExtractor={(item: any) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#009BFF']}
            tintColor="#009BFF"
          />
        }
        contentContainerStyle={filteredGroups.length === 0 ? styles.emptyListContent : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // Header Styles
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10
  },

  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },

  // Group Item Styles
  groupItem: {
    marginHorizontal: 12,
    marginVertical: 3,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },

  // Avatar Styles
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberCountBadge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    backgroundColor: '#667eea',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberCountText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },

  // Group Content Styles
  groupContent: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: '#95a5a6',
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 1,
    lineHeight: 20,
  },
  username: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
  },

  // Separator
  separator: {
    height: 2,
    backgroundColor: 'transparent',
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },

  // Empty State Styles
  emptyListContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  addFriendsButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 12,
  },
  addFriendsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Error State Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#f8f9fa',
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
});