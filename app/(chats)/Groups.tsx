import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
        const formattedGroups = data.data.map((group: any) => ({
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
          initial: group.name ? group.name.charAt(0).toUpperCase() : '',
        }));
        setGroups(formattedGroups);
        setFilteredGroups(formattedGroups);
      } else {
        setGroups([]);
        setFilteredGroups([]);
      }
    } catch (error) {
      console.log("Error fetching groups:", error);
      setGroups([]);
      setFilteredGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    getAllGroupChats();
  };

  useEffect(() => {
    getAllGroupChats();
  }, []);

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
              source={{
                uri: `https://api.dicebear.com/7.x/initials/png?seed=${item.name}&backgroundColor=${getRandomColor().replace('#', '')}`,
              }}
              style={styles.avatarImage}
            />
          </View>
          <View style={styles.memberCountBadge}>
            <Ionicons name="people" size={10 * (screenWidth / 375)} color="#fff" />
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
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.emptyIconContainer}>
        <Ionicons name="people-outline" size={60 * (screenWidth / 375)} color="#fff" />
      </LinearGradient>
      <Text style={styles.emptyText}>No Groups Yet</Text>
      <Text style={styles.emptySubtext}>
        Create or join a group to start chatting with your friends!
      </Text>
      <TouchableOpacity style={styles.addFriendsButton} onPress={handleCreateGroup} activeOpacity={0.8}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.addButtonGradient}>
          <Ionicons name="add-circle" size={20 * (screenWidth / 375)} color="#fff" />
          <Text style={styles.addFriendsButtonText}>Create a Group</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading groups...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#667eea" barStyle="light-content" />
      <View style={styles.listHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20 * (screenWidth / 375)} color="#667eea" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor="#999"
            value={searchTerm}
            onChangeText={handleSearchChange}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={20 * (screenWidth / 375)} color="#999" />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} tintColor="#667eea" />
        }
        contentContainerStyle={filteredGroups.length === 0 ? styles.emptyListContent : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  listHeader: {
    paddingHorizontal: screenWidth * 0.05,
    paddingVertical: screenHeight * 0.012,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: screenWidth * 0.07,
    paddingHorizontal: screenWidth * 0.04,
    height: screenHeight * 0.06,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: screenWidth * 0.03,
    fontSize: screenWidth * 0.042,
    color: '#333',
  },

  groupItem: {
    marginHorizontal: screenWidth * 0.03,
    marginVertical: screenHeight * 0.005,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: screenWidth * 0.03,
    padding: screenWidth * 0.03,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },

  avatarContainer: { position: 'relative', marginRight: screenWidth * 0.03 },
  avatarPlaceholder: {
    width: screenWidth * 0.13,
    height: screenWidth * 0.13,
    borderRadius: (screenWidth * 0.13) / 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: (screenWidth * 0.13) / 2,
  },
  memberCountBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#667eea',
    borderRadius: screenWidth * 0.02,
    paddingHorizontal: screenWidth * 0.01,
    paddingVertical: screenHeight * 0.002,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberCountText: {
    color: '#fff',
    fontSize: screenWidth * 0.026,
    fontWeight: '700',
  },

  groupContent: { flex: 1 },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: screenHeight * 0.004,
  },
  name: {
    fontSize: screenWidth * 0.048,
    fontWeight: '600',
    color: '#2c3e50',
  },
  time: {
    fontSize: screenWidth * 0.032,
    color: '#95a5a6',
  },
  message: {
    fontSize: screenWidth * 0.037,
    color: '#7f8c8d',
    lineHeight: screenHeight * 0.025,
  },
  username: {
    fontSize: screenWidth * 0.032,
    color: '#667eea',
    fontWeight: '500',
  },

  separator: { height: 2, backgroundColor: 'transparent' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: screenHeight * 0.02,
    fontSize: screenWidth * 0.04,
    color: '#7f8c8d',
  },

  emptyListContent: { flexGrow: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: screenHeight * 0.1,
    paddingHorizontal: screenWidth * 0.1,
  },
  emptyIconContainer: {
    width: screenWidth * 0.3,
    height: screenWidth * 0.3,
    borderRadius: screenWidth * 0.15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: screenHeight * 0.03,
  },
  emptyText: {
    fontSize: screenWidth * 0.06,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: screenHeight * 0.01,
  },
  emptySubtext: {
    fontSize: screenWidth * 0.04,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: screenHeight * 0.03,
    marginBottom: screenHeight * 0.04,
  },
  addFriendsButton: {
    borderRadius: screenWidth * 0.08,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.08,
    paddingVertical: screenHeight * 0.02,
    gap: screenWidth * 0.03,
  },
  addFriendsButtonText: {
    color: '#fff',
    fontSize: screenWidth * 0.04,
    fontWeight: '600',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenHeight * 0.004,
  },

});
