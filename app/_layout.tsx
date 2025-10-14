import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useState } from "react";
import AnimatedSplashScreen from "./splash";

// Keep splash visible until manually hidden
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  if (!isReady) {
    return <AnimatedSplashScreen onFinish={() => setIsReady(true)} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(auth)/login" />       
      <Stack.Screen name="(chats)" />      
      
    </Stack>
  );
}
