import { useTheme } from '@/src/hooks/useTheme';
import { BorderRadius, Spacing, Typography } from '@/src/styles/commonStyles';
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

const getMessageColors = (isDark: boolean) => ({
    success: '#4CAF50',
    error: '#FF3B30',
    info: '#161F32',
});

const GlobalMessage: React.FC<MessageProps> = ({
    type = 'info',
    message,
    visible,
    duration = 2500,
    onClose,
}) => {
    const { isDark, colors, shadows } = useTheme();
    const messageColors = getMessageColors(isDark);
    const styles = createStyles(isDark, colors, shadows);
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

            <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={styles.blur} />

            <View style={styles.content}>
                <Ionicons name={ICONS[type]} size={22} color={messageColors[type]} style={styles.icon} />
                <Text style={[styles.text, { color: messageColors[type] }]}>{message}</Text>
            </View>
        </Animated.View>
    );
};

const createStyles = (isDark: boolean, colors: any, shadows: any) => StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        alignSelf: 'center',
        width: '92%',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginTop: Spacing.xs,
        backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)',
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        zIndex: 9999,
        ...shadows.lg,
    } as any,
    blur: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: BorderRadius.lg,
    } as any,
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    } as any,
    icon: {
        marginRight: Spacing.md,
    } as any,
    text: {
        fontSize: Typography.fontSize.base,
        fontWeight: '400' as any,
        fontFamily: Typography.fontFamily.regular,
    } as any,
});

export default GlobalMessage;
