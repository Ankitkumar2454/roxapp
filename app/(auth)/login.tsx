import api from "@/api/axiosInstance";
import ENDPOINTS from "@/api/endPoints";
import GlobalMessage from "@/CustomComponents/message";
import { Storage } from "@/hooks/useLocalAsyncStorage";
import { useTheme } from "@/src/hooks/useTheme";
import { ThemeContext } from "@/src/services/ThemeContext";
import { BorderRadius, Spacing, Typography } from "@/src/styles/commonStyles";
import { loginPayload, loginResponse, loginResponseData } from "@/utils/types";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height

export const greetings = [
    "नमस्ते !",
    "Namaskara !",
    "Hello !",
    "Hola !",
    "Vanakkam !",
    "Sat Sri Akal !",
    "Kem Cho !",
    "Nomoskar !",
    "Aadab !"
];

export default function LoginScreen() {
    const { theme, toggleTheme } = useContext(ThemeContext);
    const { isDark, colors, shadows } = useTheme();
    const styles = createStyles(isDark, colors, shadows);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isReady, setIsReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [messageVisible, setMessageVisible] = useState(false);
    const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
    const [showPassword, setShowPassword] = useState(false);

    const showMessage = (type: 'success' | 'error' | 'info') => {
        setMessageType(type);
        setMessageVisible(true);
    };

    const handleLogin = async () => {
        try {
            setLoading(true);
            const payload: loginPayload = {
                username,
                password
            }
            const response = await api.post(ENDPOINTS.auth.login, payload);
            const data: loginResponse = response.data;
            if (data.success === true) {
                showMessage("success")
                if (data?.message !== "MPIN reset required") {
                    const user_data: loginResponseData = response.data.data;
                    const { accessToken, refreshToken, user: user } = user_data;
                    console.log(user_data, "ssssss")
                    await Storage.setItem("accessToken", accessToken);
                    await Storage.setItem("refreshToken", refreshToken);
                    await Storage.setItem("user", user);
                    setTimeout(() => {
                        router.replace("/(chats)/Chat")
                    }, 2500)
                } else if (data?.message === "MPIN reset required") {
                    setTimeout(() => {
                        router.push({
                            pathname: "/(auth)/resetPassword",
                            params: { userId: response?.data?.data?.userId }
                        });
                    }, 2500)
                }
            } else {
                showMessage("info");
            }
        } catch (error) {
            showMessage("info");
            console.log(error);
        } finally {
            setTimeout(() => {
                setLoading(false);
            }, 2000)
        }
    }

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
                Animated.delay(500) // 500ms pause between shakes
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
            style={{ flex: 1, backgroundColor: colors.background }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.card, { width: screenWidth }]}>
                        <LinearGradient
                            colors={[colors.primary, colors.primaryDark]}
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

                        <Text style={styles.subtitle}>Please enter your{"\n"}credentials</Text>
                    </LinearGradient>

                    <Text style={styles.infoText}>Please enter your username and password!</Text>

                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your username here"
                            placeholderTextColor={colors.textLight}
                            value={username}
                            onChangeText={setUsername}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Enter your password here"
                            placeholderTextColor={colors.textLight}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword} // 👈 toggle visibility
                        />

                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.iconContainer}
                        >
                            <Ionicons
                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                size={22}
                                color={colors.primary}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footerRow}>
                        <View style={styles.checkboxRow}></View>

                        <TouchableOpacity onPress={handleLogin} style={{ borderRadius: BorderRadius.lg, overflow: "hidden" }}>
                            <LinearGradient
                                colors={[colors.primary, colors.primaryDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.arrowBtn}
                            >
                                <Animated.View style={!loading && { transform: [{ translateX: shakeAnim }] }}>
                                    {
                                        loading ?
                                            <ActivityIndicator size="small" color={colors.white} style={{ marginLeft: 2 }} /> :
                                            <Ionicons name="arrow-forward" size={18} color={colors.white} />
                                    }
                                </Animated.View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
            {/* <GlobalLoader visible={loading} /> */}
            <GlobalMessage
                type={messageType}
                message={
                    messageType === 'success'
                        ? 'Login SuccessFull'
                        : messageType === 'error'
                            ? 'Something went wrong , please try again in some time '
                            : 'Invalid credentials !!!'
                }
                visible={messageVisible}
                onClose={() => setMessageVisible(false)}
            />
        </KeyboardAvoidingView>
    );
}

const createStyles = (isDark: boolean, colors: any, shadows: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: "center", 
        alignItems: "center"
    } as any,
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
    arrowBtn: {
        width: 100,
        height: 50,
        borderRadius: BorderRadius.lg,
        justifyContent: "center",
        alignItems: "center"
    } as any,
});
