import FloatingSupportBot from "@/components/FloatingSupportBot";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { Stack } from "expo-router";
import { StatusBar, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import "./globals.css";

function ToastConfig() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const toastConfig = {
    success: ({ text1, text2 }: any) => (
      <View className="mx-4 mt-4 bg-primary border border-neutral-100 rounded-2xl px-4 py-3">
        <Text className="text-light-100 font-semibold">{text1}</Text>
        {text2 ? <Text className="text-light-300 mt-1">{text2}</Text> : null}
      </View>
    ),
    error: ({ text1, text2 }: any) => (
      <View className="mx-4 mt-4 bg-accent/10 border border-accent rounded-2xl px-4 py-3">
        <Text className="text-light-100 font-semibold">{text1}</Text>
        {text2 ? <Text className="text-light-300 mt-1">{text2}</Text> : null}
      </View>
    ),
    info: ({ text1, text2 }: any) => (
      <View className="mx-4 mt-4 bg-secondary border border-neutral-100 rounded-2xl px-4 py-3">
        <Text className="text-light-100 font-semibold">{text1}</Text>
        {text2 ? <Text className="text-light-300 mt-1">{text2}</Text> : null}
      </View>
    ),
  } as const;

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#030014" : "#FFFFFF"}
      />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth/forgot-password"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="auth/reset-password"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="verify" options={{ headerShown: false }} />
        <Stack.Screen name="kyc-wizard" options={{ headerShown: false }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
        <Stack.Screen
          name="profile/settings"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="orders/new" options={{ headerShown: false }} />
        <Stack.Screen name="orders/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="sos" options={{ headerShown: false }} />
        <Stack.Screen name="support" options={{ headerShown: false }} />
        <Stack.Screen name="legal/privacy" options={{ headerShown: false }} />
        <Stack.Screen name="legal/terms" options={{ headerShown: false }} />
        <Stack.Screen name="accept-terms" options={{ headerShown: false }} />
      </Stack>
      <FloatingSupportBot />
      <Toast topOffset={12} config={toastConfig} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <ToastConfig />
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
