import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useState } from "react";
import AnimatedSplashScreen from "./splash";

// Keep splash screen visible until we manually hide it
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  if (!isReady) {
    return <AnimatedSplashScreen onFinish={() => setIsReady(true)} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false, // hide headers globally
      }}
    />
  );
}
