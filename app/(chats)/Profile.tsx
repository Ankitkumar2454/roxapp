import { Storage } from '@/hooks/useLocalAsyncStorage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProfileScreen() {
  const userInfo = [
    { label: 'Phone', value: '(+44) 20 1234 5689', icon: 'call-outline' },
    { label: 'Gender', value: 'Male', icon: 'male-outline' },
    { label: 'Birthday', value: '12/01/1997', icon: 'calendar-outline' },
    { label: 'Email', value: 'john.lennon@mail.com', icon: 'mail-outline' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/200?img=12' }}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.editIconButton}>
              <Ionicons name="pencil" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>John Lennon</Text>
        </View>

       
        <View style={styles.infoSection}>
          {userInfo.map((info, index) => (
            <View key={index} style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Text style={styles.infoLabel}>{info.label}</Text>
                <Text style={styles.infoValue}>{info.value}</Text>
              </View>
              <TouchableOpacity style={styles.copyButton}>
                <Ionicons name="copy-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

       
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="pencil" size={20} color="#fff" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

      
        <TouchableOpacity style={styles.logoutButton} onPress={() => {
          router.replace("/login")
          Storage.clear();
        }}>
          <Ionicons name="log-out-outline" size={20} color="#FF5252" />
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
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  editIconButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2196F3',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLeft: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  copyButton: {
    padding: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF5252',
  },
});