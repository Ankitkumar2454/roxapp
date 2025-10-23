import { darkTheme, lightTheme } from "@/src/constants/color";
import { ThemeContext, ThemeProvider } from "@/src/services/ThemeContext";
import { Stack } from "expo-router";
import { useContext } from "react";
import { StatusBar } from "react-native";

function LayoutContent() {
  const { theme } = useContext(ThemeContext);
  const currentTheme = theme === "dark" ? darkTheme : lightTheme;

  return (
    <>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={currentTheme.background}
      />
      <Stack
        initialRouteName="(auth)/login"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: currentTheme.background },
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
