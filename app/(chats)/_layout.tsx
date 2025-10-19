import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs, usePathname, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Animated, Dimensions, Easing, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";


const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;
export default function ChatsLayout() {
    const [searchText, setSearchText] = useState("");
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    // Animation values
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Animation functions
    const handleButtonPress = () => {
        // Scale down animation
        Animated.sequence([
            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 0.9,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 200,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 100,
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

        // Navigate after animation
        setTimeout(() => {
            router.push("/(contacts)/Contacts");
        }, 200);
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <StatusBar
                barStyle="light-content"
                backgroundColor="transparent"
                translucent={true}
            />
            <LinearGradient
                colors={["#009BFF", "#0066CC"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.statusBarGradient, { height: insets.top }]}
            />
            <Tabs
                screenOptions={({ route }) => ({
                    tabBarHideOnKeyboard: true,
                    headerShown: route.name !== "/(personalChats)/ChatInPerson",
                    tabBarShowLabel: true,
                    tabBarActiveTintColor: "#007AFF",
                    tabBarInactiveTintColor: "#A0A0A0",
                    tabBarStyle: {
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 65,
                        backgroundColor: "#fff",
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        elevation: 8,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: -2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 6,
                    },

                    tabBarLabelStyle: {
                        fontSize: 14,
                        fontWeight: "500",
                    },
                    headerStyle: {
                        height: 90,
                        // paddingBottom: 10,
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
                            style={{ flex: 1 }}
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


                        (pathname !== "/Profile") && <View style={styles.headerRight}>

                            <View style={styles.listHeader}>
                                <Text style={styles.titleText}>
                                    {
                                        pathname === "/Chat" ? "Chats" : pathname === "/Groups" ? "Groups" : "Support"
                                    }
                                </Text>

                            </View>
                            {/* ⋮ Ellipsis Icon */}
                            {/* <TouchableOpacity style={styles.iconButton}>
                                <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
                            </TouchableOpacity> */}
                        </View>
                        // <></>
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
                                    { scale: Animated.multiply(scaleAnim, pulseAnim) },
                                    {
                                        rotate: rotateAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0deg', '45deg']
                                        })
                                    }
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
                                colors={["#009BFF", "#0066CC"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.fabGradient}
                            >
                                <Animated.View
                                    style={{
                                        transform: [
                                            {
                                                rotate: rotateAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0deg', '180deg']
                                                })
                                            }
                                        ]
                                    }}
                                >
                                    <Ionicons name="add" size={28} color="#fff" />
                                </Animated.View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                )
            }

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    statusBarGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: screenHeight * 0.05, // responsive status bar height
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: screenWidth * 0.04,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: screenWidth * 0.05,
        paddingHorizontal: screenWidth * 0.025,
        height: screenHeight * 0.045,
    },
    searchIcon: {
        marginRight: screenWidth * 0.015,
    },
    searchInput: {
        color: "#fff",
        width: screenWidth * 0.4,
        fontSize: screenWidth * 0.035,
        paddingVertical: screenHeight * 0.003,
    },
    headerTitle: {
        color: "#fff",
        fontSize: screenWidth * 0.045,
        fontWeight: "600",
        marginLeft: screenWidth * 0.02,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: screenWidth * 0.04,
    },
    iconButton: {
        marginLeft: screenWidth * 0.04,
        padding: screenWidth * 0.01,
    },
    // 🔵 Floating Action Button styles
    fab: {
        position: "absolute",
        bottom: screenHeight * 0.14, // above tab bar
        right: screenWidth * 0.05,
        zIndex: 100,
    },
    fabTouchable: {
        width: screenWidth * 0.16,
        height: screenWidth * 0.16,
        borderRadius: (screenWidth * 0.16) / 2,
    },
    fabGradient: {
        width: screenWidth * 0.16,
        height: screenWidth * 0.16,
        borderRadius: (screenWidth * 0.16) / 2,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#009BFF",
        shadowOffset: { width: 0, height: screenHeight * 0.01 },
        shadowOpacity: 0.3,
        shadowRadius: screenHeight * 0.02,
        elevation: 12,
    },
    listHeader: {
        paddingHorizontal: screenWidth * 0.04,
        paddingTop: screenHeight * 0.015,
        paddingBottom: screenHeight * 0.01,
        color: "#fff",
    },
    titleText: {
        fontSize: screenWidth * 0.045,
        fontWeight: "600",
        marginLeft: screenWidth * 0.02,
        color: "#fff",
    },
});