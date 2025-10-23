import api from "@/api/axiosInstance";
import ENDPOINTS from "@/api/endPoints";
import GlobalMessage from "@/CustomComponents/message";
import { useTheme } from "@/src/hooks/useTheme";
import { ThemeContext } from "@/src/services/ThemeContext";
import { BorderRadius, Spacing, Typography } from "@/src/styles/commonStyles";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { greetings } from "./login";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

export default function MPINResetScreen() {
    const { theme, toggleTheme } = useContext(ThemeContext);
    const { isDark, colors, shadows } = useTheme();
    const styles = createStyles(isDark, colors, shadows);
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
            style={{ flex: 1, backgroundColor: "#C9EBFF" }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.card, { width: screenWidth }]}>
                    <LinearGradient
                        colors={["#009BFF", "#0066CC"]}
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
                            placeholderTextColor="#ccc"
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
                            placeholderTextColor="#ccc"
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
                                color={colors.primary}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footerRow}>
                        <View style={styles.checkboxRow}>
                            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                            <Text style={styles.securityText}>Secure & Encrypted</Text>
                        </View>

                        <TouchableOpacity onPress={handleResetMPIN} style={{ borderRadius: BorderRadius.lg, overflow: "hidden" }}>
                            <LinearGradient
                                colors={[colors.primary, colors.primaryDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.arrowBtn}
                            >
                                <Animated.View style={!loading && { transform: [{ translateX: shakeAnim }] }}>
                                    {loading ? (
                                        <ActivityIndicator size="small" color={colors.white} style={{ marginLeft: 2 }} />
                                    ) : (
                                        <Ionicons name="checkmark" size={18} color={colors.white} />
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

const createStyles = (isDark: boolean, colors: any, shadows: any) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: BorderRadius['2xl'],
        overflow: "hidden",
        paddingBottom: Spacing['4xl'],
        height: screenHeight
    } as any,
    header: {
        height: screenHeight * 0.4,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 180,
        alignItems: "flex-start",
        justifyContent: "flex-end",
        paddingHorizontal: Spacing['2xl'],
        paddingBottom: Spacing['3xl'],
        position: "relative",
        ...shadows.xl,
    } as any,
    loginText: {
        fontSize: Typography.fontSize['4xl'],
        color: colors.white,
        fontWeight: Typography.fontWeight.light as any,
        position: "absolute",
        top: 100,
        left: Spacing['2xl']
    } as any,
    subtitle: {
        fontSize: Typography.fontSize['3xl'],
        color: colors.white,
        fontWeight: Typography.fontWeight.light as any
    } as any,
    infoText: {
        color: colors.textSecondary,
        textAlign: "left",
        marginTop: Spacing['4xl'],
        marginHorizontal: Spacing['2xl'],
        fontSize: Typography.fontSize.sm
    } as any,
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1.2,
        borderColor: colors.border,
        marginHorizontal: Spacing['2xl'],
        marginTop: Spacing['2xl'],
        paddingBottom: Spacing.sm
    } as any,
    input: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: Typography.fontSize.sm
    } as any,
    iconContainer: {
        paddingHorizontal: Spacing.sm
    } as any,
    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: Spacing['2xl'],
        marginTop: Spacing['2xl']
    } as any,
    checkboxRow: {
        flexDirection: "row",
        alignItems: "center"
    } as any,
    securityText: {
        marginLeft: Spacing.sm,
        color: colors.primary,
        fontSize: Typography.fontSize.xs,
        fontWeight: Typography.fontWeight.medium as any
    } as any,
    arrowBtn: {
        width: 100,
        height: 50,
        borderRadius: BorderRadius.lg,
        justifyContent: "center",
        alignItems: "center"
    } as any,
});