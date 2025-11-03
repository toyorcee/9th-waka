import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SOSScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isActivated, setIsActivated] = useState(false);

  if (isLoading) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  const handleSOS = () => {
    if (isActivated) {
      Alert.alert("SOS Deactivated", "Emergency alert has been deactivated.");
      setIsActivated(false);
    } else {
      Alert.alert(
        "Emergency SOS",
        "Are you sure you want to activate emergency SOS? This will alert NightWalker control and nearby riders.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Activate",
            style: "destructive",
            onPress: () => {
              setIsActivated(true);
              // TODO: Send SOS alert to backend
              console.log("SOS Activated");
            },
          },
        ]
      );
    }
  };

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
            Emergency SOS
          </Text>
        </View>

        {/* SOS Info */}
        <View className="bg-secondary rounded-2xl p-6 mb-6 border border-neutral-100">
          <View className="items-center mb-6">
            <View className="w-32 h-32 rounded-full bg-danger/20 items-center justify-center mb-4">
              <Icons.emergency
                name={IconNames.alert as any}
                size={64}
                color="#FF453A"
              />
            </View>
            <Text className="text-light-100 text-xl font-semibold mb-2">
              Emergency Assistance
            </Text>
            <Text className="text-light-300 text-sm text-center px-4">
              Activate SOS to alert NightWalker control center and nearby riders
              in case of emergency
            </Text>
          </View>

          {/* Emergency Contacts */}
          <View className="bg-dark-100 rounded-xl p-4 mb-6 border border-neutral-100">
            <Text className="text-light-200 font-semibold mb-3">
              Emergency Contacts
            </Text>
            <TouchableOpacity className="flex-row items-center justify-between py-2">
              <Text className="text-light-300">NightWalker Control</Text>
              <Text className="text-accent font-semibold">Call</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between py-2">
              <Text className="text-light-300">Local Emergency (112)</Text>
              <Text className="text-accent font-semibold">Call</Text>
            </TouchableOpacity>
          </View>

          {/* SOS Button */}
          <TouchableOpacity
            onPress={handleSOS}
            className={`rounded-xl p-6 items-center ${
              isActivated ? "bg-accentWarm" : "bg-danger"
            }`}
          >
            <Text className="text-primary font-bold text-2xl mb-2">
              {isActivated ? "🆘 SOS ACTIVE" : "🆘 ACTIVATE SOS"}
            </Text>
            <Text className="text-primary text-sm">
              {isActivated
                ? "Tap to deactivate"
                : "Tap to alert emergency services"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Safety Tips */}
        <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
          <Text className="text-light-200 font-semibold mb-3">Safety Tips</Text>
          <Text className="text-light-300 text-sm mb-2">
            • Share your live location when activating SOS
          </Text>
          <Text className="text-light-300 text-sm mb-2">
            • Stay in a safe, well-lit area if possible
          </Text>
          <Text className="text-light-300 text-sm">
            • Keep your phone accessible and charged
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
