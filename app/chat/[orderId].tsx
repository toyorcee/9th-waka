import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChatScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [message, setMessage] = useState("");

  if (isLoading) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  const handleSend = () => {
    if (message.trim()) {
      // TODO: Send message
      console.log("Sending message:", message);
      setMessage("");
    }
  };

  return (
    <View className="flex-1 bg-primary">
      {/* Header */}
      <View className="pt-20 px-6 pb-4 flex-row items-center border-b border-neutral-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Icons.navigation
            name={IconNames.arrowBack as any}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-light-100 text-lg font-semibold">
            Order #{orderId}
          </Text>
          <Text className="text-light-400 text-xs">Chat with rider</Text>
        </View>
      </View>

      {/* Messages Area */}
      <ScrollView className="flex-1 px-6 pt-6">
        <View className="bg-secondary rounded-2xl p-6 items-center border border-neutral-100">
          <Icons.communication
            name={IconNames.chatbubbleOutline as any}
            size={48}
            color="#9CA4AB"
          />
          <Text className="text-light-300 text-sm mt-4 text-center">
            Chat messages will appear here
          </Text>
        </View>
      </ScrollView>

      {/* Message Input */}
      <View className="px-6 pb-8 pt-4 border-t border-neutral-100">
        <View className="flex-row items-center bg-secondary rounded-xl px-4 py-3 border border-neutral-100">
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor="#9CA4AB"
            className="flex-1 text-light-100"
            multiline
          />
          <TouchableOpacity onPress={handleSend} className="ml-3">
            <Icons.communication
              name={IconNames.sendOutline as any}
              size={24}
              color="#AB8BFF"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
