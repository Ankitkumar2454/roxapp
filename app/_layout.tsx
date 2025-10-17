import { Stack } from "expo-router";
import React from "react";

export default function RootLayout() {
  return (
    <Stack initialRouteName="(auth)/login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(chats)" />
    </Stack>
  );
}
