import { router } from 'expo-router';
import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const groups = [
  {
    id: '1',
    name: 'Project Alpha Team',
    message: 'Sarah: Let\'s schedule the meeting for tomorrow 📅',
    time: '09:15',
    avatar: 'https://i.pravatar.cc/150?img=60',
    memberCount: 8,
    unread: 3,
  },
  {
    id: '2',
    name: 'Family Group',
    message: 'Mom: Don\'t forget about dinner tonight! 🍽️',
    time: '08:45',
    avatar: 'https://i.pravatar.cc/150?img=61',
    memberCount: 6,
    unread: 0,
  },
  {
    id: '3',
    name: 'Fitness Buddies',
    message: 'Mike: Great workout today everyone! 💪',
    time: '07:30 06/05',
    avatar: 'https://i.pravatar.cc/150?img=62',
    memberCount: 12,
    unread: 5,
  },
  {
    id: '4',
    name: 'College Friends',
    message: 'Emma: Who\'s coming to the reunion? 🎉',
    time: '23:20 06/04',
    avatar: 'https://i.pravatar.cc/150?img=63',
    memberCount: 15,
    unread: 0,
  },
  {
    id: '5',
    name: 'Book Club',
    message: 'James: Finished chapter 5, thoughts? 📚',
    time: '19:45 06/04',
    avatar: 'https://i.pravatar.cc/150?img=64',
    memberCount: 10,
    unread: 2,
  },
];

export default function GroupsScreen() {

   const handleGroupChatNavigation =  () => {
    router.replace("/(GroupChats)/ChatInGroup")
   }   

  const renderGroupItem = ({ item } : any) => (
    <TouchableOpacity style={[styles.groupItem, item.unread > 0 && styles.unreadGroup]} onPress={handleGroupChatNavigation}>
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={styles.memberBadge}>
          <Text style={styles.memberBadgeText}>{item.memberCount}</Text>
        </View>
      </View>
      <View style={styles.groupContent}>
        <View style={styles.groupHeader}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.message} numberOfLines={1}>
          {item.message}
        </Text>
      </View>
      {item.unread > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{item.unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  unreadGroup: {
    backgroundColor: '#F0F8FF',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  memberBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  groupContent: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#FF5722',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 82,
  },
});