import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { router } from 'expo-router';

import React from 'react';
import {
    FlatList,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Contact {
    id: string;
    name: string;
    status?: string;
    avatar?: string;
    initial?: string;
    bgColor?: string;
    isYou?: boolean;
}

export default function SelectContactScreen() {
    const contacts: Contact[] = [
        {
            id: '1',
            name: 'Suryamani Giet (You)',
            status: 'Message yourself',
            avatar: 'https://i.pravatar.cc/150?img=1',
            isYou: true,
        },
        {
            id: '2',
            name: '+91 6355 079 541',
            avatar: 'https://i.pravatar.cc/150?img=5',
        },
        {
            id: '3',
            name: '+91 93486 70326',
            avatar: 'https://i.pravatar.cc/150?img=9',
        },
        {
            id: '4',
            name: '💪🤝NIHAR🤝💪 Giet',
            initial: 'G',
            bgColor: '#4CAF50',
        },
        {
            id: '5',
            name: '👑🔥Ashirbād💗⚡',
            status: '✌️ Vibe alone until u r valued⚡💜',
            avatar: 'https://i.pravatar.cc/150?img=12',
        },
        {
            id: '6',
            name: '🔥 Divya',
            status: 'Work Hard Dream Big.',
            avatar: 'https://i.pravatar.cc/150?img=20',
        },
        {
            id: '7',
            name: 'A.P Gents Parlour',
            status: 'At work',
            initial: 'A',
            bgColor: '#2196F3',
        },
        {
            id: '8',
            name: 'Aakash Giet',
            status: "I hate two-faced people. It's hard to decide which face to slap first 😊💯",
            avatar: 'https://i.pravatar.cc/150?img=33',
        },
    ];

    const handleContactPress = () => {
        // Handle contact selection
        router.replace("/(chats)/Chat");
    };

    const renderContactItem = ({ item }: { item: Contact }) => (
        <TouchableOpacity style={styles.contactItem} onPress={handleContactPress}>
            {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: item.bgColor }]}>
                    <Text style={styles.avatarText}>{item.initial}</Text>
                </View>
            )}
            <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                {item.status && <Text style={styles.contactStatus} numberOfLines={1}>{item.status}</Text>}
            </View>
        </TouchableOpacity>
    );

    const ListHeader = () => (
        <>
            <View style={styles.actionSection}>
                <TouchableOpacity style={styles.actionItem}>
                    <View style={styles.actionIconContainer}>
                        <Ionicons name="people" size={24} color="#007AFF" />
                    </View>
                    <Text style={styles.actionText}>New group</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem}>
                    <View style={styles.actionIconContainer}>
                        <Ionicons name="person-add" size={24} color="#007AFF" />
                    </View>
                    <Text style={styles.actionText}>New contact</Text>
                    {/* <Ionicons name="qr-code-outline" size={22} color="#666" style={styles.qrIcon} /> */}
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem}>
                    <View style={styles.actionIconContainer}>
                        <Ionicons name="person" size={24} color="#007AFF" />
                    </View>
                    <Text style={styles.actionText}>New Friend</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Your Contacts</Text>
            </View>
        </>
    );

    const ItemSeparator = () => <View style={styles.separator} />;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <LinearGradient
                 colors={["#009BFF", "#0066CC"]} // your gradient colors
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}

            >
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>Select contact</Text>
                            <Text style={styles.headerSubtitle}>969 contacts</Text>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.headerButton}>
                                <Ionicons name="search" size={22} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.headerButton}>
                                <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Contact List */}
            <FlatList
                data={contacts}
                renderItem={renderContactItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={ListHeader}
                ItemSeparatorComponent={ItemSeparator}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {

        paddingHorizontal: 16,
        paddingBottom: 20,
        height: 120,
        justifyContent: "flex-end",
        alignItems: "center",
        display: "flex",
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        color: "white"
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#fff',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 20,
    },
    headerButton: {
        padding: 4,
    },
    listContent: {
        paddingBottom: 20,
    },
    actionSection: {
        backgroundColor: '#fff',
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    actionIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    actionText: {
        fontSize: 16,
        color: '#000',
        flex: 1,
        fontWeight: '500',
    },
    qrIcon: {
        marginLeft: 'auto',
    },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F8F8F8',
    },
    sectionHeaderText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        color: '#000',
        fontWeight: '600',
        marginBottom: 2,
    },
    contactStatus: {
        fontSize: 14,
        color: '#666',
    },
    separator: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginLeft: 78,
    },
});