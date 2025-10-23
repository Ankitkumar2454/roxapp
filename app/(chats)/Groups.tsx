import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import { useTheme } from '@/src/hooks/useTheme';
import { ThemeContext } from "@/src/services/ThemeContext";
import { BorderRadius, Spacing, Typography } from '@/src/styles/commonStyles';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function GroupsScreen() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredGroups, setFilteredGroups] = useState([]);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { isDark, colors, shadows } = useTheme();
  const styles = createStyles(isDark, colors, shadows);

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
    const colorPalette = [colors.success, colors.info, colors.warning, colors.secondary, colors.error, colors.primary];
    return colorPalette[Math.floor(Math.random() * colorPalette.length)];
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

  const renderGroupItem = ({ item, index }: { item: any; index: number }) => {
    const bgColor = getRandomColor();
    const isActive = item.isActive || Math.random() > 0.3; // Simulate active groups
    const hasRecentActivity = Math.random() > 0.4; // Simulate recent activity
    const isAdmin = item.admins?.some((admin: any) => admin._id === 'current-user-id') || false; // You can replace with actual user check

    return (
      <TouchableOpacity
        style={styles.groupItemTouchable}
        onPress={() => handleGroupChatNavigation(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: `https://api.dicebear.com/7.x/initials/png?seed=${item.name}&backgroundColor=${bgColor.replace('#', '')}&fontSize=20&fontWeight=600` }}
            style={styles.avatarImage}
            defaultSource={{ uri: `https://ui-avatars.com/api/?name=${item.name}&background=${bgColor.replace('#', '')}&color=fff&size=48&bold=true&format=png&font-size=0.6` }}
          />
          
          {/* Group Activity Indicator */}
          <View style={[
            styles.activityIndicator, 
            { backgroundColor: isActive ? colors.success : colors.textSecondary }
          ]} />
          
          {/* Admin Badge */}
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={10} color={colors.white} />
            </View>
          )}
        </View>

        <View style={styles.groupContent}>
          <View style={styles.groupHeader}>
            <View style={styles.nameContainer}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {isActive && <View style={styles.activeDot} />}
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.time}>{item.memberCount} members</Text>
              {hasRecentActivity && (
                <View style={styles.activityBadge}>
                  <Text style={styles.activityText}>!</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.messageRow}>
            <View style={styles.messageContainer}>
              <Text style={styles.message} numberOfLines={1}>
                {item.description || 'No description available'}
              </Text>
              {hasRecentActivity && (
                <View style={styles.activityIndicator} />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.emptyIconContainer}
      >
        <Ionicons name="people-outline" size={60} color={colors.white} />
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
          colors={[colors.primary, colors.primaryDark]}
          style={styles.addButtonGradient}
        >
          <Ionicons name="add-circle" size={20} color={colors.white} />
          <Text style={styles.addFriendsButtonText}>Create a Group</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const ErrorState = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
      </View>
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={getAllGroupChats}>
        <Ionicons name="reload" size={20} color={colors.white} />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading groups...</Text>
      </View>
    );
  }

  if (error && groups.length === 0) {
    return <ErrorState />;
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme === "dark" ? colors.background : "transparent"}
      />
      <View style={styles.listHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor={colors.textLight}
            value={searchTerm}
            onChangeText={handleSearchChange}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={20} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredGroups}
        renderItem={renderGroupItem}
        keyExtractor={(item: any) => item.id}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={filteredGroups.length === 0 ? styles.emptyListContent : undefined}
      />
    </View>
  );
}

const createStyles = (isDark: boolean, colors: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as any,

  // Header Styles
  listHeader: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md
  } as any,

  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius['2xl'],
    paddingHorizontal: Spacing.lg,
    height: 50,
    ...shadows.md,
  } as any,
  searchInput: {
    flex: 1,
    marginLeft: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
  } as any,

  // Group Item Styles - Card Design
  groupItemTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderBottomWidth: 0,
    ...shadows.sm,
  } as any,

  // Avatar Styles
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.lg,
  } as any,
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.border,
  } as any,
  activityIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.surface,
  } as any,
  adminBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.warning,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  } as any,

  // Group Content Styles
  groupContent: {
    flex: 1,
    justifyContent: 'center',
  } as any,
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  } as any,
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  } as any,
  name: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: colors.textPrimary,
    marginRight: Spacing.xs,
  } as any,
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginLeft: Spacing.xs,
  } as any,
  timeContainer: {
    alignItems: 'flex-end',
  } as any,
  time: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium as any,
  } as any,
  activityBadge: {
    backgroundColor: colors.error,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xs,
  } as any,
  activityText: {
    fontSize: Typography.fontSize.xs,
    color: colors.white,
    fontWeight: Typography.fontWeight.bold as any,
  } as any,
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as any,
  messageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  } as any,
  message: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
    fontWeight: Typography.fontWeight.normal as any,
  } as any,

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  } as any,
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium as any,
  } as any,

  // Empty State Styles
  emptyListContent: {
    flexGrow: 1,
  } as any,
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  } as any,
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  } as any,
  emptyText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  } as any,
  emptySubtext: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  } as any,
  addFriendsButton: {
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
  } as any,
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  } as any,
  addFriendsButtonText: {
    color: colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
  } as any,

  // Error State Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    backgroundColor: colors.background,
  } as any,
  errorIconContainer: {
    marginBottom: Spacing.xl,
  } as any,
  errorTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as any,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  } as any,
  errorMessage: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  } as any,
  retryButton: {
    flexDirection: 'row',
    backgroundColor: colors.error,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  } as any,
  retryButtonText: {
    color: colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
  } as any,
});