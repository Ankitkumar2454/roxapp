import { ThemeContext, ThemeProvider } from "@/src/services/ThemeContext";
import { Stack } from "expo-router";
import { useContext } from "react";
import { StatusBar } from "react-native";

function LayoutContent() {
  const { theme, isDark, colors } = useContext(ThemeContext);

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <Stack
        initialRouteName="(auth)/login"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(chats)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LayoutContent />
    </ThemeProvider>
  );
}
