import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { Routes } from "@/services/navigationHelper";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function OrdersScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

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
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-light-100 text-3xl font-bold">My Orders</Text>
          <TouchableOpacity
            onPress={() => router.push(Routes.standalone.newOrder)}
            className="bg-accent px-4 py-2 rounded-xl"
          >
            <Icons.action
              name={IconNames.addCircle as any}
              size={20}
              color="#030014"
            />
          </TouchableOpacity>
        </View>

        {/* Orders List */}
        <View className="mb-6">
          <Text className="text-light-300 text-base mb-4">
            Your order history will appear here
          </Text>

          {/* Empty State */}
          <View className="bg-secondary rounded-2xl p-8 items-center border border-neutral-100">
            <Icons.package
              name={IconNames.packageOutline as any}
              size={64}
              color="#9CA4AB"
            />
            <Text className="text-light-200 text-lg font-semibold mt-4 mb-2">
              No orders yet
            </Text>
            <Text className="text-light-400 text-sm text-center mb-6">
              Start by creating your first delivery request
            </Text>
            <TouchableOpacity
              onPress={() => router.push(Routes.standalone.newOrder)}
              className="bg-accent px-6 py-3 rounded-xl"
            >
              <Text className="text-primary font-bold">Create New Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
