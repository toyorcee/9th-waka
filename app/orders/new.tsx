import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function NewOrderScreen() {
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
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Icons.navigation
              name={IconNames.arrowBack as any}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text className="text-light-100 text-3xl font-bold">New Order</Text>
        </View>

        {/* Order Form Placeholder */}
        <View className="bg-secondary rounded-2xl p-6 border border-neutral-100">
          <Text className="text-light-200 text-lg font-semibold mb-4">
            Delivery Request
          </Text>
          <Text className="text-light-300 text-sm mb-6">
            Order creation form will be implemented here
          </Text>

          {/* Form Fields Placeholder */}
          <View className="gap-4 mb-6">
            <View className="bg-dark-100 rounded-xl p-4 border border-neutral-100">
              <Text className="text-light-400 text-xs mb-1">
                Pickup Location
              </Text>
              <Text className="text-light-200">Enter pickup address...</Text>
            </View>

            <View className="bg-dark-100 rounded-xl p-4 border border-neutral-100">
              <Text className="text-light-400 text-xs mb-1">
                Delivery Location
              </Text>
              <Text className="text-light-200">Enter delivery address...</Text>
            </View>

            <View className="bg-dark-100 rounded-xl p-4 border border-neutral-100">
              <Text className="text-light-400 text-xs mb-1">
                Package Details
              </Text>
              <Text className="text-light-200">Describe your package...</Text>
            </View>
          </View>

          <TouchableOpacity className="bg-accent rounded-xl p-4 items-center">
            <Text className="text-primary font-bold text-base">
              Request Delivery
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
