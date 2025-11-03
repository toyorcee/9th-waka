import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

export default function ChatListScreen() {
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
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-light-100 text-3xl font-bold">Messages</Text>
        </View>

        {/* Chat List */}
        <View className="mb-6">
          {/* Empty State */}
          <View className="bg-secondary rounded-2xl p-8 items-center border border-neutral-100">
            <Icons.communication
              name={IconNames.chatbubbleOutline as any}
              size={64}
              color="#9CA4AB"
            />
            <Text className="text-light-200 text-lg font-semibold mt-4 mb-2">
              No messages yet
            </Text>
            <Text className="text-light-400 text-sm text-center">
              Your order-related messages will appear here
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
