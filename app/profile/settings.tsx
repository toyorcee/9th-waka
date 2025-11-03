import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SettingsScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);

  if (isLoading) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-primary">
      <View className="pt-20 px-6 pb-8">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Icons.navigation
              name={IconNames.arrowBack as any}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text className="text-light-100 text-3xl font-bold">Settings</Text>
        </View>

        {/* Notification Settings */}
        <View className="bg-secondary rounded-2xl p-5 mb-6 border border-neutral-100">
          <Text className="text-light-200 text-lg font-semibold mb-4">
            Notifications
          </Text>

          <View className="flex-row items-center justify-between py-3 border-b border-neutral-100">
            <Text className="text-light-100">Push Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#3A3A3C", true: "#AB8BFF" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View className="flex-row items-center justify-between py-3">
            <Text className="text-light-100">Email Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#3A3A3C", true: "#AB8BFF" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Privacy Settings */}
        <View className="bg-secondary rounded-2xl p-5 mb-6 border border-neutral-100">
          <Text className="text-light-200 text-lg font-semibold mb-4">
            Privacy
          </Text>

          <View className="flex-row items-center justify-between py-3 border-b border-neutral-100">
            <Text className="text-light-100">Location Tracking</Text>
            <Switch
              value={locationTracking}
              onValueChange={setLocationTracking}
              trackColor={{ false: "#3A3A3C", true: "#AB8BFF" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* App Info */}
        <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
          <Text className="text-light-200 text-lg font-semibold mb-4">
            About
          </Text>
          <Text className="text-light-300 text-sm mb-2">
            NightWalker Delivery App
          </Text>
          <Text className="text-light-400 text-xs">Version 1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}
