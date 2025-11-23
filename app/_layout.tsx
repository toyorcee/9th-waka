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
      <View
        className={`mx-4 mt-4 rounded-2xl px-4 py-3 border ${
          isDark
            ? "bg-green-600 border-green-500"
            : "bg-green-500 border-green-400"
        }`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        <Text className="text-white font-semibold">{text1}</Text>
        {text2 ? (
          <Text className="text-white/90 mt-1 text-sm">{text2}</Text>
        ) : null}
      </View>
    ),
    error: ({ text1, text2 }: any) => (
      <View
        className={`mx-4 mt-4 rounded-2xl px-4 py-3 border ${
          isDark ? "bg-red-600 border-red-500" : "bg-red-500 border-red-400"
        }`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        <Text className="text-white font-semibold">{text1}</Text>
        {text2 ? (
          <Text className="text-white/90 mt-1 text-sm">{text2}</Text>
        ) : null}
      </View>
    ),
    info: ({ text1, text2 }: any) => (
      <View
        className={`mx-4 mt-4 rounded-2xl px-4 py-3 border ${
          isDark ? "bg-blue-600 border-blue-500" : "bg-blue-500 border-blue-400"
        }`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        <Text className="text-white font-semibold">{text1}</Text>
        {text2 ? (
          <Text className="text-white/90 mt-1 text-sm">{text2}</Text>
        ) : null}
      </View>
    ),
  } as const;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? "#000000" : "#FFFFFF",
      }}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#000000" : "#FFFFFF"}
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
    </View>
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
