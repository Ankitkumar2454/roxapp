import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function ChatsLayout() {
    const [searchText, setSearchText] = useState("");
    return (
        <Tabs
            screenOptions={({ route }) => ({
                headerShown: route.name !== "ChatMessage",
                tabBarShowLabel: true,
                tabBarActiveTintColor: "#007AFF",
                tabBarInactiveTintColor: "#A0A0A0",
                tabBarStyle: {
                    backgroundColor: "#fff",
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    height: 100,
                    paddingBottom: 8,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 5,
                },
                tabBarLabelStyle: {
                    fontSize: 14,
                    fontWeight: "500",
                },
                headerStyle: {
                    height: 120,

                    paddingBottom: 10,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 5,
                },
                headerBackground: () => (
                    <LinearGradient
                        colors={["#009BFF", "#0066CC"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            flex: 1,
                        }}
                    />
                ),
                headerTintColor: "#fff",
                headerTitleStyle: {
                    fontWeight: "600",
                    fontSize: 18,
                },
                headerLeft: () => (
                    <View style={styles.headerLeft}>
                        <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
                        <Text style={styles.headerTitle}>RoXX</Text>
                    </View>
                ),
                headerRight: () => (
                    <View style={styles.headerRight}>
                        {/* 🔍 Search Box */}
                        <View style={styles.searchContainer}>
                            <Ionicons name="search-outline" size={18} color="#fff" style={styles.searchIcon} />
                            <TextInput
                                value={searchText}
                                onChangeText={setSearchText}
                                placeholder="Search..."
                                placeholderTextColor="#E0E0E0"
                                style={styles.searchInput}
                            />
                        </View>

                        {/* ⋮ Ellipsis Icon */}
                        <TouchableOpacity style={styles.iconButton}>
                            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ),
                headerTitle: "",
                tabBarIcon: ({ color, focused }) => {
                    let iconName: keyof typeof Ionicons.glyphMap;

                    switch (route.name) {
                        case "Chat":
                            iconName = focused ? "chatbubble" : "chatbubble-outline";
                            break;
                        case "Groups":
                            iconName = focused ? "people" : "people-outline";
                            break;
                        case "Profile":
                            iconName = focused ? "person" : "person-outline";
                            break;
                        case "Support":
                            iconName = focused ? "logo-whatsapp" : "logo-whatsapp";
                            break;
                        default:
                            iconName = "ellipse";
                    }

                    return <Ionicons name={iconName} size={24} color={color} />;
                },
            })}
        >
            <Tabs.Screen
                name="Chat"
                options={{
                    title: "Chats",
                }}
            />
            <Tabs.Screen
                name="Groups"
                options={{
                    title: "Groups",
                }}
            />
            <Tabs.Screen
                name="Support"
                options={{
                    title: "Support",
                }}
            />
            <Tabs.Screen
                name="Profile"
                options={{
                    title: "Profile",
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 16,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 20,
        paddingHorizontal: 10,
        height: 36,
        
    },
    searchIcon: {
        marginRight: 6,
    },
    searchInput: {
        color: "#fff",
        width: 120, 
        fontSize: 14,
        paddingVertical: 2,
    },

    headerTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "600",
        marginLeft: 8,
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
});