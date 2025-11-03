import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

export default function TrackScreen() {
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
        <Text className="text-light-100 text-3xl font-bold mb-6">
          Track Deliveries
        </Text>

        {/* Map Placeholder */}
        <View className="bg-secondary rounded-2xl p-8 items-center justify-center mb-6 border border-neutral-100 min-h-[400px]">
          <Icons.map
            name={IconNames.mapOutline as any}
            size={64}
            color="#9CA4AB"
          />
          <Text className="text-light-200 text-lg font-semibold mt-4 mb-2">
            Real-time tracking
          </Text>
          <Text className="text-light-400 text-sm text-center">
            Active delivery tracking will appear here
          </Text>
        </View>

        {/* Active Deliveries */}
        <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
          <Text className="text-light-200 text-lg font-semibold mb-4">
            Active Deliveries
          </Text>
          <Text className="text-light-300 text-sm">
            No active deliveries at the moment
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
