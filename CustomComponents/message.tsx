import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface MessageProps {
    type?: 'success' | 'error' | 'info';
    message: string;
    visible: boolean;
    duration?: number;
    onClose?: () => void;
}

const ICONS: Record<'success' | 'error' | 'info', keyof typeof Ionicons.glyphMap> = {
    success: 'checkmark-circle-outline',
    error: 'close-circle-outline',
    info: 'information-circle-outline',
};

const COLORS = {
    success: '#009BFF',
    error: '#FF3B30',
    info: '#009BFF',
};

const GlobalMessage: React.FC<MessageProps> = ({
    type = 'info',
    message,
    visible,
    duration = 2500,
    onClose,
}) => {
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Slide in
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 60,
                    duration: 350,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            const timer = setTimeout(() => {
                // Slide out
                Animated.parallel([
                    Animated.timing(slideAnim, {
                        toValue: -100,
                        duration: 350,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start(() => onClose?.());
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                },
            ]}
        >

            <BlurView intensity={30} tint="light" style={styles.blur} />

            <View style={styles.content}>
                <Ionicons name={ICONS[type]} size={22} color={COLORS[type]} style={styles.icon} />
                <Text style={[styles.text, { color: COLORS[type] }]}>{message}</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        alignSelf: 'center',
        width: '92%',
        borderRadius: 16,
        padding: 14,
        marginTop: 5,
        backgroundColor: 'rgba(255,255,255,0.85)',
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        zIndex: 9999,
        shadowColor: '#009BFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    blur: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 16,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 10,
    },
    text: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export default GlobalMessage;
