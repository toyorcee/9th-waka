import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { Routes } from "@/services/navigationHelper";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function OrderDetailScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

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
          <Text className="text-light-100 text-3xl font-bold">
            Order Details
          </Text>
        </View>

        {/* Order Info */}
        <View className="bg-secondary rounded-2xl p-6 mb-6 border border-neutral-100">
          <Text className="text-light-200 text-lg font-semibold mb-4">
            Order #{id}
          </Text>

          {/* Order Status */}
          <View className="bg-dark-100 rounded-xl p-4 mb-4 border border-neutral-100">
            <Text className="text-light-400 text-xs mb-2">Status</Text>
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full bg-pending mr-2" />
              <Text className="text-pending font-semibold">PENDING</Text>
            </View>
          </View>

          {/* Order Details */}
          <View className="gap-4 mb-6">
            <View className="bg-dark-100 rounded-xl p-4 border border-neutral-100">
              <Text className="text-light-400 text-xs mb-1">
                Pickup Location
              </Text>
              <Text className="text-light-200">123 Main Street, Lagos</Text>
            </View>

            <View className="bg-dark-100 rounded-xl p-4 border border-neutral-100">
              <Text className="text-light-400 text-xs mb-1">
                Delivery Location
              </Text>
              <Text className="text-light-200">456 Market Road, Lagos</Text>
            </View>

            <View className="bg-dark-100 rounded-xl p-4 border border-neutral-100">
              <Text className="text-light-400 text-xs mb-1">
                Package Details
              </Text>
              <Text className="text-light-200">Food delivery - 2 items</Text>
            </View>
          </View>

          {/* Actions */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() =>
                router.push(Routes.standalone.chatForOrder(String(id)) as any)
              }
              className="flex-1 bg-accent rounded-xl p-4 items-center"
            >
              <Text className="text-primary font-bold">Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(Routes.tabs.track)}
              className="flex-1 bg-accentWarm rounded-xl p-4 items-center"
            >
              <Text className="text-primary font-bold">Track</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
