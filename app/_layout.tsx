import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { Stack } from "expo-router";
import { StatusBar, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import "./globals.css";

export default function RootLayout() {
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
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <StatusBar hidden={true} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="verify" options={{ headerShown: false }} />
            <Stack.Screen
              name="profile/edit"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="profile/settings"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="orders/new" options={{ headerShown: false }} />
            <Stack.Screen name="orders/[id]" options={{ headerShown: false }} />
          </Stack>
          <Toast topOffset={12} config={toastConfig} />
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
