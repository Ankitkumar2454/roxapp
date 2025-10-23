import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { useTheme } from '@/src/hooks/useTheme';
import { ThemeContext } from '@/src/services/ThemeContext';
import { BorderRadius, Spacing, Typography } from '@/src/styles/commonStyles';
import { ApiResponse, InfoItem, UserData } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';



const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { isDark, colors, shadows } = useTheme();
  // const { isDark, colors, shadows } = useTheme();
  const styles = createStyles(isDark, colors, shadows);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userData) {
      // Start animations when data is loaded
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [userData]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ApiResponse>(ENDPOINTS.auth.profile);
      
      if (res.data.success && res.data.data) {
        setUserData(res.data.data);
      }
    } catch (err) {
      console.log('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getUserInfoItems = (): InfoItem[] => {
    if (!userData) return [];

    return [
      {
        label: 'Username',
        value: userData.username,
        icon: 'person-outline',
      },
      {
        label: 'Role',
        value: userData.role.charAt(0).toUpperCase() + userData.role.slice(1),
        icon: 'shield-outline',
      },
      {
        label: 'Member Since',
        value: formatDate(userData.createdAt),
        icon: 'calendar-outline',
      },
    ];
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied!', `${label} copied to clipboard`);
    } catch (err) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await Storage.clear();
              router.replace('/login');
            } catch (err) {
              console.log('Error logging out:', err);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} backgroundColor={theme === "dark" ? colors.background : "transparent"} translucent={true} />
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContainer}>
            <Animated.View style={[styles.loadingIcon, { transform: [{ scale: scaleAnim }] }]}>
              <Ionicons name="person-circle" size={80} color={colors.white} />
            </Animated.View>
            <Text style={styles.loadingText}>Loading profile...</Text>
            <ActivityIndicator size="large" color={colors.white} style={styles.loadingSpinner} />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error || !userData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? colors.background : "transparent"} translucent={true} />
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.errorGradient}
        >
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={colors.white} />
            <Text style={styles.errorText}>{error || 'Failed to load profile'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
              <LinearGradient
                colors={[colors.white, colors.surface]}
                style={styles.retryButtonGradient}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const userInfo = getUserInfoItems();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? colors.background : "transparent"} translucent={true} />
        <Animated.View 
          style={[
            styles.profileSection,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          <View style={styles.profileRow}>
            {/* First Column - Image */}
            <View style={styles.imageColumn}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={[colors.white, colors.surface]}
                  style={styles.avatarGradient}
                >
                  <Image
                    source={{ uri: userData.profileImage }}
                    style={styles.avatar}
                  />
                </LinearGradient>
                <TouchableOpacity style={styles.editIconButton}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.editIconGradient}
                  >
                    <Ionicons name="pencil" size={16} color={colors.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Second Column - Info */}
            <View style={styles.infoColumn}>
              <Text style={styles.name}>{userData.fullName}</Text>
              <Text style={styles.username}>@{userData.username}</Text>
              <Text style={styles.role}>{userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}</Text>
              
              {/* Status Badge */}
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: userData.isActive ? colors.success : colors.error }]} />
                <Text style={styles.statusText}>
                  {userData.isActive ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      {/* </LinearGradient> */}

      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContentContainer}
        bounces={true}
        alwaysBounceVertical={false}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Info Cards */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            {userInfo.map((info, index) => (
              <Animated.View 
                key={index}
                style={[
                  styles.infoCard,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { translateY: slideAnim },
                      { scale: scaleAnim }
                    ]
                  }
                ]}
              >
                <View style={styles.infoRow}>
                  <View style={styles.infoLeft}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name={info.icon as any} size={20} color={colors.secondary} />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>{info.label}</Text>
                      <Text style={styles.infoValue}>{info.value}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => handleCopyToClipboard(info.value, info.label)}
                  >
                    <Ionicons name="copy-outline" size={20} color={colors.secondary} />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Activity Section */}
          <View style={styles.activitySection}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <View style={styles.activityCard}>
              <View style={styles.activityItem}>
                <View style={styles.activityIconContainer}>
                  <Ionicons name="time-outline" size={24} color={colors.secondary} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityLabel}>Last Login</Text>
                  <Text style={styles.activityValue}>
                    {formatDate(userData.lastLogin)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.activityDivider} />
              
              <View style={styles.activityItem}>
                <View style={styles.activityIconContainer}>
                  <Ionicons name="calendar-outline" size={24} color={colors.secondary} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityLabel}>Member Since</Text>
                  <Text style={styles.activityValue}>
                    {formatDate(userData.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.editButton}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.buttonGradient}
              >
                <Ionicons name="pencil" size={18} color={colors.white} />
                <Text style={styles.editButtonText}>Edit</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <View style={styles.logoutButtonContent}>
                <Ionicons name="log-out-outline" size={18} color={colors.error} />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (isDark: boolean, colors: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as any,
  
  // Header Styles
  headerGradient: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  } as any,
  
  // Loading & Error States
  loadingGradient: {
    flex: 1,
  } as any,
  errorGradient: {
    flex: 1,
  } as any,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as any,
  loadingIcon: {
    marginBottom: Spacing.xl,
  } as any,
  loadingText: {
    fontSize: Typography.fontSize.lg,
    color: colors.white,
    fontWeight: Typography.fontWeight.semibold as any,
    marginBottom: Spacing.xl,
  } as any,
  loadingSpinner: {
    marginTop: Spacing.md,
  } as any,
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  } as any,
  errorText: {
    fontSize: Typography.fontSize.base,
    color: colors.white,
    textAlign: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing['2xl'],
    fontWeight: Typography.fontWeight.medium as any,
  } as any,
  retryButton: {
    borderRadius: BorderRadius['3xl'],
    overflow: 'hidden',
  } as any,
  retryButtonGradient: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['3xl'],
  } as any,
  retryButtonText: {
    color: colors.primary,
    fontWeight: Typography.fontWeight.semibold as any,
    fontSize: Typography.fontSize.base,
  } as any,
  
  // Profile Section
  profileSection: {
    backgroundColor: colors.surface,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.xl,
    ...shadows.md,
  } as any,
  profileRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    alignItems: 'center',
  } as any,
  imageColumn: {
    marginRight: Spacing.xl,
  } as any,
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  } as any,
  avatarContainer: {
    position: 'relative',
  } as any,
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
  } as any,
  editIconButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  } as any,
  editIconGradient: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  } as any,
  name: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as any,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  } as any,
  username: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  } as any,
  role: {
    fontSize: Typography.fontSize.sm,
    color: colors.primary,
    fontWeight: Typography.fontWeight.semibold as any,
    marginBottom: Spacing.sm,
  } as any,
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignSelf: 'flex-start',
  } as any,
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  } as any,
  statusText: {
    fontSize: Typography.fontSize.sm,
    color: colors.primary,
    fontWeight: Typography.fontWeight.medium as any,
  } as any,
  
  // Scroll Container
  scrollContainer: {
    flex: 1,
    marginTop: 0,
  } as any,
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: Spacing['4xl'],
  } as any,
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['4xl'] + 100, // Extra padding for better button accessibility
  } as any,
  
  // Section Titles
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold as any,
    color: colors.textPrimary,
    marginBottom: Spacing.lg,
    marginTop: Spacing.xl,
  } as any,
  
  // Info Section
  infoSection: {
    marginBottom: Spacing.xl,
  } as any,
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...shadows.lg,
  } as any,
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
  } as any,
  infoLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  } as any,
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  } as any,
  infoContent: {
    flex: 1,
  } as any,
  infoLabel: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: Typography.fontWeight.medium as any,
  } as any,
  infoValue: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold as any,
  } as any,
  copyButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.primary + '20',
  } as any,
  
  // Activity Section
  activitySection: {
    marginBottom: Spacing.xl,
  } as any,
  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...shadows.md,
  } as any,
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  } as any,
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  } as any,
  activityContent: {
    flex: 1,
  } as any,
  activityLabel: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: Typography.fontWeight.medium as any,
  } as any,
  activityValue: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold as any,
  } as any,
  activityDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: Spacing.sm,
  } as any,
  
  // Action Section
  actionSection: {
    marginTop: Spacing.xl,
    marginBottom: Spacing['2xl'],
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...shadows.md,
  } as any,
  editButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 56,
  } as any,
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    minHeight: 56,
  } as any,
  editButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: colors.white,
  } as any,
  logoutButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 56,
  } as any,
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    minHeight: 56,
  } as any,
  logoutButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: colors.error,
  } as any,
});