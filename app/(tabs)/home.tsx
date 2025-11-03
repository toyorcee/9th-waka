import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

export default function HomeScreen() {
  const { user, isLoading } = useAuth();

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
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-light-100 text-3xl font-bold flex-1">
            Welcome back{user?.fullName ? `, ${user.fullName}` : ""}!
          </Text>
          <NotificationBell />
        </View>
        <Text className="text-light-300 text-base mb-6">
          Dashboard overview
        </Text>

        {/* Quick Stats */}
        <View className="bg-secondary rounded-2xl p-5 mb-6 border border-neutral-100">
          <Text className="text-light-200 text-lg font-semibold mb-4">
            Quick Stats
          </Text>
          <View className="flex-row justify-between">
            <View className="flex-1 items-center">
              <Text className="text-accent text-2xl font-bold">0</Text>
              <Text className="text-light-400 text-xs mt-1">Active Orders</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-accent text-2xl font-bold">0</Text>
              <Text className="text-light-400 text-xs mt-1">Total Orders</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
          <Text className="text-light-200 text-lg font-semibold mb-4">
            Quick Actions
          </Text>
          <Text className="text-light-300 text-sm">
            Order management and tracking features will appear here
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
