import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width, height } = Dimensions.get("window");

const images = [
  require("../assets/splash/LogoE-Chat.png"),
  require("../assets/splash/splashIcon1.png"),
];

export default function AnimatedSplashScreen({ onFinish } : any) {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
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
    fontSize: 28,
    fontWeight: "700",
    color: "#0078D7",
    marginTop: 10,
  },
  subtitle: {
    color: "#0078D7",
    textAlign: "center",
    marginTop: 8,
    fontSize: 16,
  },
  version: {
    color: "#8c8c8c",
    marginTop: 25,
    fontSize: 12,
  },
});
