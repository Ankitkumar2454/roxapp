import api from '@/api/axiosInstance';
import ENDPOINTS from '@/api/endPoints';
import { Storage } from '@/hooks/useLocalAsyncStorage';
import { ApiResponse, InfoItem, UserData } from '@/utils/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ProfileScreen() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

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

  const handleCopyToClipboard = (text: string, label: string) => {
    Alert.alert(`${label} copied!`, text);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
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
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error || !userData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={screenWidth * 0.12} color="#FF5252" />
        <Text style={styles.errorText}>{error || 'Failed to load profile'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const userInfo = getUserInfoItems();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: userData.profileImage }} style={styles.avatar} />
            <TouchableOpacity style={styles.editIconButton}>
              <Ionicons name="pencil" size={screenWidth * 0.045} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{userData.fullName}</Text>
          <Text style={styles.username}>@{userData.username}</Text>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          {userInfo.map((info, index) => (
            <View key={index}>
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Text style={styles.infoLabel}>{info.label}</Text>
                  <Text style={styles.infoValue}>{info.value}</Text>
                </View>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => handleCopyToClipboard(info.value, info.label)}
                >
                  <Ionicons name="copy-outline" size={screenWidth * 0.05} color="#666" />
                </TouchableOpacity>
              </View>
              {index < userInfo.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </View>

        {/* Status Section */}
        <View style={styles.statusSection}>
          <View style={styles.statusItem}>
            <View style={styles.statusDot} />
            <View style={styles.statusContent}>
              <Text style={styles.statusLabel}>Account Status</Text>
              <Text style={styles.statusValue}>{userData.isActive ? 'Active' : 'Inactive'}</Text>
            </View>
          </View>
          <View style={styles.statusItem}>
            <Ionicons name="time-outline" size={screenWidth * 0.05} color="#2196F3" />
            <View style={styles.statusContent}>
              <Text style={styles.statusLabel}>Last Login</Text>
              <Text style={styles.statusValue}>{formatDate(userData.lastLogin)}</Text>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="pencil" size={screenWidth * 0.05} color="#fff" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={screenWidth * 0.05} color="#FF5252" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: screenWidth * 0.05,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: screenHeight * 0.015,
    fontSize: screenWidth * 0.04,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.1,
    backgroundColor: '#F5F7FA',
  },
  errorText: {
    fontSize: screenWidth * 0.038,
    color: '#FF5252',
    textAlign: 'center',
    marginTop: screenHeight * 0.012,
    marginBottom: screenHeight * 0.025,
  },
  retryButton: {
    paddingHorizontal: screenWidth * 0.06,
    paddingVertical: screenHeight * 0.012,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: screenWidth * 0.04,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: screenHeight * 0.04,
    marginTop: screenHeight * 0.02,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: screenHeight * 0.018,
  },
  avatar: {
    width: screenWidth * 0.32,
    height: screenWidth * 0.32,
    borderRadius: screenWidth * 0.16,
    borderWidth: 4,
    borderColor: '#fff',
  },
  editIconButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2196F3',
    width: screenWidth * 0.1,
    height: screenWidth * 0.1,
    borderRadius: screenWidth * 0.05,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontSize: screenWidth * 0.06,
    fontWeight: '700',
    color: '#000',
  },
  username: {
    fontSize: screenWidth * 0.038,
    color: '#666',
    marginTop: 4,
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: screenWidth * 0.04,
    marginBottom: screenHeight * 0.02,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: screenHeight * 0.018,
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  infoLeft: {
    flex: 1,
  },
  infoLabel: {
    fontSize: screenWidth * 0.035,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: screenWidth * 0.04,
    color: '#000',
    fontWeight: '500',
  },
  copyButton: {
    padding: 8,
  },
  statusSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: screenWidth * 0.04,
    marginBottom: screenHeight * 0.02,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: screenHeight * 0.015,
  },
  statusDot: {
    width: screenWidth * 0.03,
    height: screenWidth * 0.03,
    borderRadius: screenWidth * 0.015,
    backgroundColor: '#4CAF50',
    marginRight: screenWidth * 0.03,
  },
  statusContent: { flex: 1 },
  statusLabel: {
    fontSize: screenWidth * 0.035,
    color: '#666',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: screenWidth * 0.04,
    color: '#000',
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: screenHeight * 0.02,
    borderRadius: 12,
    marginBottom: screenHeight * 0.015,
    gap: 8,
  },
  editButtonText: {
    fontSize: screenWidth * 0.045,
    fontWeight: '600',
    color: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    paddingVertical: screenHeight * 0.02,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: screenWidth * 0.045,
    fontWeight: '600',
    color: '#FF5252',
  },
});
