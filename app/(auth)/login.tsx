import api from "@/api/axiosInstance";
import ENDPOINTS from "@/api/endPoints";
import GlobalMessage from "@/CustomComponents/message";
import { Storage } from "@/hooks/useLocalAsyncStorage";
import { loginPayload, loginResponse, loginResponseData } from "@/utils/types";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AnimatedSplashScreen from "../splash";


SplashScreen.preventAutoHideAsync();
const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height

export default function LoginScreen() {
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
                const user_data: loginResponseData = response.data;
                const { accessToken, refreshToken, user: user } = user_data;
                await Storage.setItem("accessToken", accessToken);
                await Storage.setItem("refreshToken", refreshToken);
                await Storage.setItem("user", user);
                setTimeout(() => {
                    router.replace("/(chats)/Chat")
                }, 2500)
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

    const greetings = [
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

    if (!isReady) {
        return <AnimatedSplashScreen onFinish={() => setIsReady(true)} />;
    }

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

                        <Text style={styles.subtitle}>Please enter your{"\n"}credentials</Text>
                    </LinearGradient>

                    <Text style={styles.infoText}>Please enter your username and password!</Text>

                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your username here"
                            placeholderTextColor="#ccc"
                            value={username}
                            onChangeText={setUsername}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Enter your password here"
                            placeholderTextColor="#ccc"
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
                                color="#009BFF"
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footerRow}>
                        <View style={styles.checkboxRow}></View>

                        <TouchableOpacity onPress={handleLogin} style={{ borderRadius: 10, overflow: "hidden" }}>
                            <LinearGradient
                                colors={["#009BFF", "#0066CC"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.arrowBtn}
                            >
                                <Animated.View style={!loading && { transform: [{ translateX: shakeAnim }] }}>
                                    {
                                        loading ?
                                            <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 2 }} /> :
                                            <Ionicons name="arrow-forward" size={18} color="#fff" />
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "white", justifyContent: "center", alignItems: "center" },
    card: { backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", paddingBottom: 40, height: screenHeight },
    header: {
        height: screenHeight * 0.4,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 180,
        alignItems: "flex-start",
        justifyContent: "flex-end",
        paddingHorizontal: 25,
        paddingBottom: 30,
        position: "relative",
        shadowColor: "#347a98ff",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 20,
    },
    loginText: { fontSize: 38, color: "#fff", fontWeight: "300", position: "absolute", top: 100, left: 25 },
    subtitle: { fontSize: 30, color: "#fff", fontWeight: "200" },
    infoText: { color: "#3e3939ff", textAlign: "left", marginTop: 45, marginHorizontal: 25, fontSize: 14 },
    inputRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1.2, borderColor: "#aaa", marginHorizontal: 25, marginTop: 25, paddingBottom: 6 },
    input: { flex: 1, color: "#000", fontSize: 15 },
    iconContainer: { paddingHorizontal : 6},
    footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 25, marginTop: 25 },
    checkboxRow: { flexDirection: "row", alignItems: "center" },
    arrowBtn: { backgroundColor: "#52b5f7ff", width: 100, height: 50, borderRadius: 10, justifyContent: "center", alignItems: "center" },
});
