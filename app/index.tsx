import { useTheme } from "@/src/hooks/useTheme";
import { Spacing, Typography } from "@/src/styles/commonStyles";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width, height } = Dimensions.get("window");

const images = [
  require("../assets/splash/LogoE-Chat.png"),
  require("../assets/splash/splashIcon1.png"),
];

export default function AnimatedSplashScreen({ onFinish } : any) {
  const { isDark, colors } = useTheme();
  const styles = createStyles(isDark, colors);
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    let step = 0;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
      step += 1;

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      });

   
      if (step === images.length + 1) {
        clearInterval(interval);
        setTimeout(async () => {
          await SplashScreen.hideAsync();
          onFinish();
        }, 800);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      
      <Animated.Image
        source={images[index]}
        style={[
          styles.logo,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const createStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  } as any,
  logo: {
    width: width * 0.4,
    height: height * 0.2,
  },
  textContainer: {
    position: "absolute",
    bottom: 100,
    alignItems: "center",
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: colors.primary,
    marginTop: Spacing.sm,
  } as any,
  subtitle: {
    color: colors.primary,
    textAlign: "center",
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.base,
  },
  version: {
    color: colors.textLight,
    marginTop: Spacing['2xl'],
    fontSize: Typography.fontSize.xs,
  },
});
