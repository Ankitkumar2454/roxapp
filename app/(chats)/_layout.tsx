import api from "@/api/axiosInstance";
import ENDPOINTS from "@/api/endPoints";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs, usePathname, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Animated, Easing, FlatList, Image, Modal, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
// import { useAuth } from "@/src/contexts/AuthContext";
import { useTheme } from "@/src/hooks/useTheme";

export default function ChatsLayout() {
    const { colors, shadows, isDark } = useTheme();
    // const { currentUser } = useContext(UserContext);
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [friends, setFriends] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [listSearch, setListSearch] = useState("");

    // Animation values
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const getStyles = () => StyleSheet.create(
    {
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        statusBarGradient: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
        },
        headerLeft: {
            flexDirection: "row",
            alignItems: "center",
        },
        headerLogoLarge: {
            width: 80,
            height: 80,
            marginRight: 2,
            borderRadius: 8,
            opacity: isDark ? 0.95 : 1,
        },
        searchContainer: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            borderRadius: 20,
            paddingHorizontal: 10,
            height: 36,
        },
        searchIcon: {
            marginRight: 6,
        },
        searchInput: {
            color: colors.white,
            width: 160,
            fontSize: 14,
            paddingVertical: 2,
        },
        headerTitle: {
            color: colors.textPrimary,
            fontSize: 18,
            fontWeight: "600",
        },
        headerRight: {
            flexDirection: "row",
            alignItems: "center",
            marginRight: 16,
        },
        iconButton: {
            marginLeft: 16,
            padding: 4,
        },

        // 🔵 Floating Action Button styles
        fab: {
            position: "absolute",
            bottom: 110, // just above the tab bar
            right: 20,
            zIndex: 100,
        },
        fabTouchable: {
            width: 64,
            height: 64,
            borderRadius: 32,
        },
        fabGradient: {
            width: 64,
            height: 64,
            borderRadius: 32, // Perfect circle
            justifyContent: "center",
            alignItems: "center",
        },
        listHeader: {
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
            color: colors.textPrimary,
        },
        titleText: {
            fontSize: 18,
            fontWeight: "600",
            marginLeft: 8,
            color: colors.textPrimary,
        },

        modalContainer: {
            flex: 1,
            backgroundColor: colors.surface,
        },
        modalHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: insets.top + 8,
            paddingBottom: 12,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
        },
        modalContent: {
            flex: 1,
            paddingHorizontal: 16,
        },
        sheetHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            marginBottom: 8,
        },
        sheetTitle: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.textPrimary,
        },
        modalSearch: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 16,
            marginBottom: 16,
            backgroundColor: isDark ? colors.gray[800] : colors.gray[100],
            borderRadius: 12,
            paddingHorizontal: 10,
            height: 40,
        },
        modalSearchInput: {
            flex: 1,
            color: colors.textPrimary,
            fontSize: 14,
            marginLeft: 6,
        },
        listItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
        },
        listAvatar: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
        },
        listName: {
            fontSize: 14,
            color: colors.textPrimary,
            fontWeight: '600',
            flex: 1,
        },
        listSub: {
            fontSize: 12,
            color: colors.textSecondary,
        },
        modalAdminActions: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 16,
            gap: 10,
        },
        pillButton: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            paddingVertical: 10,
            borderRadius: 12,
            gap: 8,
        },
    });

    const getTabBarStyle = () => ({
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: 0.5,
        height: 115,
        paddingBottom: 50,
        paddingTop: 5,
        position: 'absolute' as const,
        ...shadows.lg,
    });

    const styles = getStyles();

    // Animation functions
    const handleButtonPress = async () => {
        // Open instantly for snappy UX
        setIsFabMenuOpen(true);
        // Load in background
        loadList();
        // Quick scale feedback
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 120,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 120,
                useNativeDriver: true,
            }),
        ]).start();

        // Pulse animation
        Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.1,
                duration: 150,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 150,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start();
    };

    const loadList = async () => {
        try {
            setIsLoadingList(true);
            if (pathname === "/Chat") {
                const res = await api.get(ENDPOINTS.friends.getAll);
                if (res.data?.success && res.data.data) setFriends(res.data.data);
            } else if (pathname === "/Groups") {
                const res = await api.get(ENDPOINTS.groups.get);
                if (res.data?.success && res.data.data) setGroups(res.data.data);
            }
        } catch {
            // noop
        } finally {
            setIsLoadingList(false);
        }
    };

    const filteredFriends = useMemo(() => {
        const q = listSearch.trim().toLowerCase();
        if (!q) return friends;
        return friends.filter((f) =>
            (f.fullName || f.username || "").toLowerCase().includes(q)
        );
    }, [friends, listSearch]);

    const filteredGroups = useMemo(() => {
        const q = listSearch.trim().toLowerCase();
        if (!q) return groups;
        return groups.filter((g) => (g.name || "").toLowerCase().includes(q));
    }, [groups, listSearch]);

    const handleStartPersonalChat = (friend: any) => {
        setIsFabMenuOpen(false);
        router.push({
            pathname: "/(personalChats)/ChatInPerson",
            params: {
                friendId: friend._id,
                friendName: friend.fullName || friend.username,
                friendAvatar: friend.profileImage || '',
            }
        });
    };

    const handleOpenGroup = (group: any) => {
        setIsFabMenuOpen(false);
        router.push({
            pathname: "/(GroupChats)/ChatInGroup",
            params: { groupId: group._id }
        });
    };

    const handleCreateUser = () => {
        setIsFabMenuOpen(false);
        router.push("/(contacts)/Contacts");
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
            <StatusBar
                barStyle={isDark ? "light-content" : "dark-content"}
                backgroundColor={colors.background}
                translucent={true}
            />
            <View style={[styles.statusBarGradient, { height: insets.top, backgroundColor: colors.background }]} />
            <Tabs
                screenOptions={({ route }) => ({
                    headerShown: route.name !== "/(personalChats)/ChatInPerson",
                    tabBarShowLabel: true,
                    tabBarActiveTintColor: isDark ? "#FFFFFF" : colors.primary,
                    tabBarInactiveTintColor: isDark ? "#666666" : "#999999",
                    tabBarStyle: getTabBarStyle(),
                    tabBarLabelStyle: {
                        fontSize: 10,
                        fontWeight: "600",
                        marginTop: 2,
                    },
                    tabBarItemStyle: {
                        paddingVertical: 6,
                        paddingHorizontal: 8,
                    },
                    headerStyle: {
                        height: 90,
                        ...shadows.lg,
                    },
                    headerBackground: () => (
                        <View style={{ flex: 1, backgroundColor: colors.background }} />
                    ),
                    headerTintColor: isDark ? "#fff" : colors.textPrimary,
                    headerTitleStyle: {
                        fontWeight: "600",
                        fontSize: 18,
                    },
                    headerLeft: () => (
                        <View style={styles.headerLeft}>
                            <Image
                                source={require("../../assets/images/splash-icon.png")}
                                style={styles.headerLogoLarge}
                                resizeMode="contain"
                            />
                            <Text style={styles.headerTitle}>RoXX</Text>
                        </View>
                    ),
                    headerRight: () => (


                        (pathname !== "/Profile") && <View style={styles.headerRight}>

                            <View style={styles.listHeader}>
                                <Text style={styles.titleText}>
                                    {
                                        pathname === "/Chat" ? "Chats" : pathname === "/Groups" ? "Groups" : pathname === "/Support" ? "Support" : "Profile"
                                    }
                                </Text>

                            </View>
                        </View>
                    ),
                    headerTitle: "",
                    tabBarIcon: ({ color, focused }) => {
                        let iconName: keyof typeof Ionicons.glyphMap;

                        switch (route.name) {
                            case "Chat":
                                iconName = focused ? "chatbubbles" : "chatbubbles-outline";
                                break;
                            case "Groups":
                                iconName = focused ? "people-circle" : "people-circle-outline";
                                break;
                            case "Profile":
                                iconName = focused ? "person-circle" : "person-circle-outline";
                                break;
                            case "Support":
                                iconName = focused ? "logo-whatsapp" : "logo-whatsapp";
                                break;
                            default:
                                iconName = "ellipse";
                        }

                        return (
                            <View style={{
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Ionicons
                                    name={iconName}
                                    size={focused ? 26 : 24}
                                    color={color}
                                    style={{
                                        transform: [{ scale: focused ? 1.1 : 1 }]
                                    }}
                                />
                                {focused && (
                                    <View style={{
                                        width: 4,
                                        height: 4,
                                        borderRadius: 2,
                                        backgroundColor: color,
                                        marginTop: 3,
                                    }} />
                                )}
                            </View>
                        );
                    },
                })}
            >
                <Tabs.Screen name="Chat" options={{ title: "Chats" }} />
                <Tabs.Screen name="Groups" options={{ title: "Groups" }} />
                <Tabs.Screen name="Support" options={{ title: "Support" }} />
                <Tabs.Screen name="Profile" options={{ title: "Profile" }} />
            </Tabs>
            {
                (pathname !== "/Profile" && pathname !== "/Support") && (
                    <Animated.View
                        style={[
                            styles.fab,
                            {
                                transform: [
                                    { scale: Animated.multiply(scaleAnim, pulseAnim) }
                                ]
                            }
                        ]}
                    >
                        <TouchableOpacity
                            onPress={handleButtonPress}
                            activeOpacity={0.8}
                            style={styles.fabTouchable}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.primary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.fabGradient}
                            >
                                <Ionicons name="add" size={28} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                )
            }

            <Modal
                visible={isFabMenuOpen}
                animationType="slide"
                onRequestClose={() => setIsFabMenuOpen(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.sheetTitle}>
                            {pathname === "/Chat" ? "Start new chat" : "Start group conversation"}
                        </Text>
                        <TouchableOpacity onPress={() => setIsFabMenuOpen(false)}>
                            <Ionicons name="close" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalContent}>
                        <View style={styles.modalSearch}>
                            <Ionicons name="search" size={18} color={colors.textSecondary} />
                            <TextInput
                                placeholder={pathname === "/Chat" ? "Search friends" : "Search groups"}
                                placeholderTextColor={colors.textLight}
                                style={styles.modalSearchInput}
                                value={listSearch}
                                onChangeText={setListSearch}
                            />
                        </View>

                        {pathname === "/Chat" ? (
                            <FlatList
                                data={filteredFriends}
                                keyExtractor={(item) => item._id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.listItem} onPress={() => handleStartPersonalChat(item)}>
                                        <View style={styles.listAvatar}>
                                            <Text style={{ color: colors.white, fontWeight: '700' }}>
                                                {(item.fullName || item.username || 'U').charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.listName}>{item.fullName || item.username}</Text>
                                            {item.username && <Text style={styles.listSub}>@{item.username}</Text>}
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={() => (
                                    <View style={{ padding: 16 }}>
                                        <Text style={{ color: colors.textSecondary }}>
                                            {isLoadingList ? 'Loading…' : 'No friends found'}
                                        </Text>
                                    </View>
                                )}
                            />
                        ) : (
                            <FlatList
                                data={filteredGroups}
                                keyExtractor={(item) => item._id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.listItem} onPress={() => handleOpenGroup(item)}>
                                        <View style={[styles.listAvatar, { backgroundColor: colors.secondary }]}>
                                            <Text style={{ color: colors.white, fontWeight: '700' }}>
                                                {(item.name || 'G').charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.listName}>{item.name}</Text>
                                            <Text style={styles.listSub}>{(item.members?.length || 0)} members</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={() => (
                                    <View style={{ padding: 16 }}>
                                        <Text style={{ color: colors.textSecondary }}>
                                            {isLoadingList ? 'Loading…' : 'No groups found'}
                                        </Text>
                                    </View>
                                )}
                            />
                        )}

                        { (
                            <View style={styles.modalAdminActions}>
                                {pathname === "/Chat" && (
                                    <TouchableOpacity style={styles.pillButton} onPress={handleCreateUser}>
                                        <Ionicons name="person-add" size={18} color={colors.white} />
                                        <Text style={{ color: colors.white, fontWeight: '700' }}>Add New Friend</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        <View style={styles.modalAdminActions}>
                            {pathname === "/Groups" && (
                                <TouchableOpacity
                                    style={styles.pillButton}
                                    onPress={() => router.push('/(GroupChats)/CreateGroupChats')}
                                >
                                    <Ionicons name="people" size={18} color={colors.white} />
                                    <Text style={{ color: colors.white, fontWeight: '700' }}>Create Group</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
}