import { Icons, MCIconNames } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

export default function DeliveriesScreen() {
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
          Deliveries
        </Text>

        {/* Available Deliveries */}
        <View className="mb-6">
          <Text className="text-light-200 text-lg font-semibold mb-4">
            Available Deliveries
          </Text>
          <View className="bg-secondary rounded-2xl p-6 items-center border border-neutral-100">
            <Icons.delivery
              name={MCIconNames.delivery as any}
              size={64}
              color="#9CA4AB"
            />
            <Text className="text-light-200 text-lg font-semibold mt-4 mb-2">
              No deliveries available
            </Text>
            <Text className="text-light-400 text-sm text-center">
              New delivery requests will appear here
            </Text>
          </View>
        </View>

        {/* Active Deliveries */}
        <View className="mb-6">
          <Text className="text-light-200 text-lg font-semibold mb-4">
            Active Deliveries
          </Text>
          <View className="bg-secondary rounded-2xl p-6 items-center border border-neutral-100">
            <Text className="text-light-300 text-sm">
              No active deliveries at the moment
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

