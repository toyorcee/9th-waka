import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./globals.css";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
