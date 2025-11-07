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
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TrackScreen() {
  const { isLoading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tabBarHeight = 65;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 20;
  const contentBottomPadding = tabBarHeight + bottomPadding + 32;

  if (isLoading) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-primary"
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: contentBottomPadding,
      }}
    >
      <View className="pt-4 px-6 pb-8">
        {/* Header with Back Button */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => {
              router.push(Routes.tabs.home);
            }}
            className="w-10 h-10 rounded-full bg-dark-200 items-center justify-center"
          >
            <Icons.navigation
              name={IconNames.arrowBack as any}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text className="text-light-100 text-3xl font-bold flex-1 text-center -ml-10">
            Track Deliveries
          </Text>
          <View className="w-10" />
        </View>

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
      {/* Bottom spacer to prevent content from going under tab bar */}
      <View
        style={{ height: contentBottomPadding, backgroundColor: "#030014" }}
      />
    </ScrollView>
  );
}
