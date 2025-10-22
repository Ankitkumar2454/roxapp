import api from "@/api/axiosInstance";
import ENDPOINTS from "@/api/endPoints";
import GlobalMessage from "@/CustomComponents/message";
import { darkTheme, lightTheme } from "@/src/constants/color";
import { ThemeContext } from "@/src/services/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { greetings } from "./login";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

export default function MPINResetScreen() {
    const { theme, toggleTheme } = useContext(ThemeContext);
    const currentTheme = theme === 'dark' ? darkTheme : lightTheme;
    const styles = createStyles(currentTheme);
    const [newMPIN, setNewMPIN] = useState("");
    const [confirmMPIN, setConfirmMPIN] = useState("");
    const [loading, setLoading] = useState(false);
    const [messageVisible, setMessageVisible] = useState(false);
    const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
    const [messageText, setMessageText] = useState("");
    const [showNewMPIN, setShowNewMPIN] = useState(false);
    const [showConfirmMPIN, setShowConfirmMPIN] = useState(false);
    const params = useLocalSearchParams();
    const userId = params.userId as string;

    const showMessage = (type: 'success' | 'error' | 'info', message: string) => {
        setMessageType(type);
        setMessageText(message);
        setMessageVisible(true);
    };

    const handleResetMPIN = async () => {
        if (!newMPIN || !confirmMPIN) {
            showMessage("info", "Please fill in all fields");
            return;
        }

        if (newMPIN.length !== 6) {
            showMessage("info", "MPIN must be 6 digits");
            return;
        }

        if (newMPIN !== confirmMPIN) {
            showMessage("error", "MPINs do not match");
            return;
        }

        try {
            setLoading(true);
            const payload = {
                userId: userId,
                newMPIN: newMPIN
            };

            const response = await api.post(ENDPOINTS.auth.resetPassword, payload);
            const data = response.data;
            console.log(data)

            if (data.success === true) {
                showMessage("success", "MPIN reset successfully!");
                setTimeout(() => {
                    router.replace("/(auth)/login");
                }, 2500);
            } else {
                showMessage("error", data.message || "Failed to reset MPIN");
            }
        } catch (error: any) {
            showMessage("error", error?.response?.data?.message || "Something went wrong");
            console.log(error);
        } finally {
            setTimeout(() => {
                setLoading(false);
            }, 2000);
        }
    };

    const [index, setIndex] = useState(0);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 10, duration: 200, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -10, duration: 200, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 6, duration: 200, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -6, duration: 200, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.delay(500)
            ])
        ).start();
    }, []);

    useEffect(() => {
        const animate = () => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 4,
                    useNativeDriver: true,
                }),
            ]).start();

            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.spring(scaleAnim, {
                        toValue: 0.8,
                        useNativeDriver: true,
                    }),
                ]).start();
            }, 1000);
        };

        animate();
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % greetings.length);
            animate();
        }, 1800);

        return () => clearInterval(interval);
    }, []);

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: currentTheme.containerBackground}}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.card, { width: screenWidth }]}>
                    <LinearGradient
                       colors={[currentTheme.headerGradientStart, currentTheme.headerGradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.header}
                    >
                        <Animated.Text
                            style={[
                                styles.loginText,
                                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
                            ]}
                        >
                            {greetings[index]}
                        </Animated.Text>

                        <Text style={styles.subtitle}>Please reset your{"\n"}MPIN to continue</Text>
                    </LinearGradient>

                    <Text style={styles.infoText}>Enter a new 6-digit MPIN for your account security</Text>

                    <View style={styles.inputRow}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Enter new 6-digit MPIN"
                           placeholderTextColor={currentTheme.placeholderText}
                            value={newMPIN}
                            onChangeText={setNewMPIN}
                            maxLength={6}
                            secureTextEntry={!showNewMPIN}
                        />
                        <TouchableOpacity
                            onPress={() => setShowNewMPIN(!showNewMPIN)}
                            style={styles.iconContainer}
                        >
                            <Ionicons
                                name={showNewMPIN ? "eye-off-outline" : "eye-outline"}
                                size={22}
                                color="#009BFF"
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputRow}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Confirm new MPIN"
                             placeholderTextColor={currentTheme.placeholderText}
                            value={confirmMPIN}
                            onChangeText={setConfirmMPIN}
                            maxLength={6}
                            secureTextEntry={!showConfirmMPIN}
                        />
                        <TouchableOpacity
                            onPress={() => setShowConfirmMPIN(!showConfirmMPIN)}
                            style={styles.iconContainer}
                        >
                            <Ionicons
                                name={showConfirmMPIN ? "eye-off-outline" : "eye-outline"}
                                size={22}
                                color="#009BFF"
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footerRow}>
                        <View style={styles.checkboxRow}>
                            <Ionicons name="shield-checkmark" size={20} color="#009BFF" />
                            <Text style={styles.securityText}>Secure & Encrypted</Text>
                        </View>

                        <TouchableOpacity onPress={handleResetMPIN} style={{ borderRadius: 10, overflow: "hidden" }}>
                            <LinearGradient
                                colors={["#009BFF", "#0066CC"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.arrowBtn}
                            >
                                <Animated.View style={!loading && { transform: [{ translateX: shakeAnim }] }}>
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 2 }} />
                                    ) : (
                                        <Ionicons name="checkmark" size={18} color="#fff" />
                                    )}
                                </Animated.View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <GlobalMessage
                type={messageType}
                message={messageText}
                visible={messageVisible}
                onClose={() => setMessageVisible(false)}
            />
        </KeyboardAvoidingView>
    );
}

const createStyles = (theme: any) => StyleSheet.create({
    card: {
        backgroundColor: theme.cardBackground,
        borderRadius: 20,
        overflow: "hidden",
        paddingBottom: 40,
        height: screenHeight
    },
    header: {
        height: screenHeight * 0.4,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 180,
        alignItems: "flex-start",
        justifyContent: "flex-end",
        paddingHorizontal: 25,
        paddingBottom: 30,
        position: "relative",
       shadowColor: theme.shadowColor,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 20,
    },
    loginText: {
        fontSize: 38,
        color: theme.headerText,
        fontWeight: "300",
        position: "absolute",
        top: 100,
        left: 25
    },
    subtitle: {
        fontSize: 30,
        color: theme.headerText,
        fontWeight: "200"
    },
    infoText: {
      color: theme.secondaryText,
        textAlign: "left",
        marginTop: 45,
        marginHorizontal: 25,
        fontSize: 14
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1.2,
        borderColor: theme.inputBorder,
        marginHorizontal: 25,
        marginTop: 25,
        paddingBottom: 6
    },
    input: {
        flex: 1,
        color: theme.inputText,
        fontSize: 15
    },
    iconContainer: {
        paddingHorizontal: 6
    },
    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: 25,
        marginTop: 25
    },
    checkboxRow: {
        flexDirection: "row",
        alignItems: "center"
    },
    securityText: {
        marginLeft: 8,
        color: "#009BFF",
        fontSize: 13,
        fontWeight: "500"
    },
    arrowBtn: {
        backgroundColor: "#52b5f7ff",
        width: 100,
        height: 50,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center"
    },
});