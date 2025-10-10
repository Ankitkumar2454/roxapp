import { router } from 'expo-router';
import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const chats = [
  {
    id: '1',
    name: 'David Wayne',
    message: "Thanks a bunch! Have a great day! 😊",
    time: '10:25',
    avatar: 'https://i.pravatar.cc/150?img=12',
    unread: false,
  },
  {
    id: '2',
    name: 'Edward Davidson',
    message: 'Great. Thanks so much. 👍',
    time: '22:30 06/05',
    avatar: 'https://i.pravatar.cc/150?img=13',
    unread: true,
  },
  {
    id: '3',
    name: 'Angela Kelly',
    message: 'Appreciate it! See you soon! 💜',
    time: '10:45 06/03',
    avatar: 'https://i.pravatar.cc/150?img=5',
    unread: false,
  },
  {
    id: '4',
    name: 'Jean Dare',
    message: 'Hooray! 🎉',
    time: '20:10 06/03',
    avatar: 'https://i.pravatar.cc/150?img=9',
    unread: false,
  },
  {
    id: '5',
    name: 'Dennis Borer',
    message: 'Your order has been successfully delivered',
    time: '11:02 06/03',
    avatar: 'https://i.pravatar.cc/150?img=33',
    unread: false,
  },
  {
    id: '6',
    name: 'Cayla Rath',
    message: 'See you soon! 👋',
    time: '11:20 06/03',
    avatar: 'https://i.pravatar.cc/150?img=20',
    unread: false,
  },
  {
    id: '7',
    name: 'Erin Turcotte',
    message: "I'm ready to drop off if you're nearby 📦",
    time: '19:35 02/08',
    avatar: 'https://i.pravatar.cc/150?img=24',
    unread: false,
  },
  {
    id: '8',
    name: 'Rodolfo Walter',
    message: 'Appreciate it! Hope you enjoy it! 🎁',
    time: '07:35 07/05',
    avatar: 'https://i.pravatar.cc/150?img=51',
    unread: false,
  },
  {
    id: '9',
    name: 'Rodolfo Walter',
    message: 'Appreciate it! Hope you enjoy it! 🎁',
    time: '07:35 07/05',
    avatar: 'https://i.pravatar.cc/150?img=51',
    unread: false,
  },
  {
    id: '10',
    name: 'Rodolfo Walter',
    message: 'Appreciate it! Hope you enjoy it! 🎁',
    time: '07:35 07/05',
    avatar: 'https://i.pravatar.cc/150?img=51',
    unread: false,
  },
  {
    id: '11',
    name: 'Rodolfo Walter',
    message: 'Appreciate it! Hope you enjoy it! 🎁',
    time: '07:35 07/05',
    avatar: 'https://i.pravatar.cc/150?img=51',
    unread: false,
  },
];

export default function ChatScreen() {

  const handleChatScreenNavigation = () => {
    router.replace("/(personalChats)/ChatInPerson")
  }
  const renderChatItem = ({ item } : any) => (
    <TouchableOpacity style={[styles.chatItem, item.unread && styles.unreadChat]} onPress={handleChatScreenNavigation}>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.message} numberOfLines={1}>
          {item.message}
        </Text>
      </View>
      {item.unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        renderItem={renderChatItem}
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
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  unreadChat: {
    backgroundColor: '#E3F2FD',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  message: {
    fontSize: 14,
    color: '#666',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00BCD4',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 78,
  },
});