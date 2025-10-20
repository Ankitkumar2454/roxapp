import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { ApiResponse, InfoItem, UserData } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';



const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
        <StatusBar barStyle="light-content" backgroundColor="#009BFF" />
        <LinearGradient
          colors={['#009BFF', '#0066CC']}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContainer}>
            <Animated.View style={[styles.loadingIcon, { transform: [{ scale: scaleAnim }] }]}>
              <Ionicons name="person-circle" size={80} color="#fff" />
            </Animated.View>
            <Text style={styles.loadingText}>Loading profile...</Text>
            <ActivityIndicator size="large" color="#fff" style={styles.loadingSpinner} />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error || !userData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#009BFF" />
        <LinearGradient
          colors={['#009BFF', '#0066CC']}
          style={styles.errorGradient}
        >
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#fff" />
            <Text style={styles.errorText}>{error || 'Failed to load profile'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
              <LinearGradient
                colors={['#fff', '#f0f0f0']}
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
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header Gradient */}
      {/* <LinearGradient
        colors={['#009BFF', '#0066CC']}
        style={styles.headerGradient}
      > */}
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
                  colors={['#fff', '#f8f9fa']}
                  style={styles.avatarGradient}
                >
                  <Image
                    source={{ uri: userData.profileImage }}
                    style={styles.avatar}
                  />
                </LinearGradient>
                <TouchableOpacity style={styles.editIconButton}>
                  <LinearGradient
                    colors={['#009BFF', '#0066CC']}
                    style={styles.editIconGradient}
                  >
                    <Ionicons name="pencil" size={16} color="#fff" />
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
                <View style={[styles.statusDot, { backgroundColor: userData.isActive ? '#4CAF50' : '#FF5252' }]} />
                <Text style={styles.statusText}>
                  {userData.isActive ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      {/* </LinearGradient> */}

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
                      <Ionicons name={info.icon as any} size={20} color="#667eea" />
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
                    <Ionicons name="copy-outline" size={20} color="#667eea" />
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
                  <Ionicons name="time-outline" size={24} color="#667eea" />
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
                  <Ionicons name="calendar-outline" size={24} color="#667eea" />
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
                colors={['#009BFF', '#0066CC']}
                style={styles.buttonGradient}
              >
                <Ionicons name="pencil" size={18} color="#fff" />
                <Text style={styles.editButtonText}>Edit</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <View style={styles.logoutButtonContent}>
                <Ionicons name="log-out-outline" size={18} color="#e74c3c" />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Header Styles
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  
  // Loading & Error States
  loadingGradient: {
    flex: 1,
  },
  errorGradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 20,
  },
  loadingSpinner: {
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
    fontWeight: '500',
  },
  retryButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#009BFF',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Profile Section
  profileSection: {
    backgroundColor: '#fff',
    marginTop: 20,
    marginBottom: 15,
    borderRadius: 12,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  imageColumn: {
    marginRight: 20,
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  editIconButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  editIconGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  role: {
    fontSize: 13,
    color: '#009BFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 155, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#009BFF',
    fontWeight: '500',
  },
  
  // Scroll Container
  scrollContainer: {
    flex: 1,
    marginTop: 0,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  
  // Section Titles
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 16,
    marginTop: 20,
  },
  
  // Info Section
  infoSection: {
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  infoLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 155, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 155, 255, 0.1)',
  },
  
  // Activity Section
  activitySection: {
    marginBottom: 20,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 155, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  activityContent: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
    fontWeight: '500',
  },
  activityValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  activityDivider: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginVertical: 8,
  },
  
  // Action Section
  actionSection: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#009BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  logoutButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e74c3c',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
  },
});