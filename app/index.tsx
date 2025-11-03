import { IconNames, Icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useAuth } from "@/contexts/AuthContext";
import { navigationHelper } from "@/services/navigationHelper";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated, isLoading]);

  const handleAction = async (actionType: "request" | "track" | "sos") => {
    if (!isAuthenticated) {
      // Remember the action they wanted to take and redirect to signup
      await navigationHelper.setPendingAction(actionType);
      router.push("/auth");
    } else {
      // User is logged in, proceed with action
      if (actionType === "request") {
        router.push("/orders/new");
      } else if (actionType === "track") {
        router.push("/(tabs)/track");
      } else if (actionType === "sos") {
        router.push("/sos");
      }
    }
  };
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Main Background - Primary Deep Night Blue */}
      <View className="flex-1 bg-primary min-h-screen">
        {/* Hero Section */}
        <View className="pt-20 px-6 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Image
                source={images.logo}
                style={{ width: 100, height: 50 }}
                contentFit="contain"
                className="mb-2"
              />
              <Text className="text-light-200 text-lg">
                Night Delivery • Safe • Fast
              </Text>
            </View>
            {isAuthenticated ? (
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/profile")}
                className="ml-4"
              >
                <Icons.user
                  name={IconNames.personCircle as any}
                  size={32}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => router.push("/auth")}
                className="ml-4"
              >
                <Icons.user
                  name={IconNames.personOutline as any}
                  size={32}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Service Status Card - Demonstrates Secondary Color */}
        <View className="mx-6 mb-6 bg-secondary rounded-2xl p-5 border border-neutral-100">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-light-100 text-lg font-semibold">
              Service Status
            </Text>
            {/* Active Status Indicator - Uses Success Green */}
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full bg-active mr-2" />
              <Text className="text-active font-medium">Active</Text>
            </View>
          </View>
          <Text className="text-light-300 text-sm">
            Operating: 5:00 PM - 10:00 PM
          </Text>
        </View>

        {/* Quick Actions - Demonstrates Accent Colors */}
        <View className="mx-6 mb-6">
          <Text className="text-light-200 text-base font-semibold mb-4">
            Quick Actions
          </Text>

          <View className="flex-row flex-wrap gap-3">
            {/* Primary Action - Uses Accent Purple */}
            <TouchableOpacity
              onPress={() => handleAction("request")}
              className="bg-accent px-6 py-4 rounded-xl flex-1 min-w-[45%]"
            >
              <Text className="text-primary font-bold text-center text-base">
                Request Delivery
              </Text>
            </TouchableOpacity>

            {/* Secondary Action - Uses Accent Warm (Street Lamp Amber) */}
            <TouchableOpacity
              onPress={() => handleAction("track")}
              className="bg-accentWarm px-6 py-4 rounded-xl flex-1 min-w-[45%]"
            >
              <Text className="text-primary font-bold text-center text-base">
                Track Order
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergency SOS Button - Demonstrates Danger Red */}
        <View className="mx-6 mb-6">
          <TouchableOpacity
            onPress={() => handleAction("sos")}
            className="bg-danger rounded-xl p-5 flex-row items-center justify-center shadow-lg"
          >
            <Text className="text-light-100 font-bold text-lg mr-2">🆘</Text>
            <Text className="text-light-100 font-bold text-lg">
              Emergency SOS
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features Grid - Demonstrates Dark Variations & Text Hierarchy */}
        <View className="mx-6 mb-6">
          <Text className="text-light-200 text-base font-semibold mb-4">
            Features
          </Text>

          <View className="gap-3">
            {/* Feature Card 1 - Dark 100 */}
            <View className="bg-dark-100 rounded-xl p-4 border border-neutral-100">
              <Text className="text-accent font-semibold text-base mb-1">
                AI Safe Routes
              </Text>
              <Text className="text-light-300 text-sm">
                Intelligent routing for maximum safety
              </Text>
            </View>

            {/* Feature Card 2 - Dark 200 */}
            <View className="bg-dark-200 rounded-xl p-4 border border-neutral-100">
              <Text className="text-info font-semibold text-base mb-1">
                Real-Time Tracking
              </Text>
              <Text className="text-light-300 text-sm">
                Follow your delivery live on the map
              </Text>
            </View>

            {/* Feature Card 3 - Dark 300 */}
            <View className="bg-dark-300 rounded-xl p-4 border border-neutral-100">
              <Text className="text-success font-semibold text-base mb-1">
                Night Assurance
              </Text>
              <Text className="text-light-300 text-sm">
                Verified riders, secure deliveries
              </Text>
            </View>
          </View>
        </View>

        {/* Status Indicators - Demonstrates Status Colors */}
        <View className="mx-6 mb-6">
          <Text className="text-light-200 text-base font-semibold mb-4">
            Delivery Status
          </Text>

          <View className="gap-3">
            {/* Pending Status */}
            <View
              className="bg-secondary rounded-xl p-4 flex-row items-center justify-between border border-neutral-100"
              style={{ borderColor: "rgba(255, 149, 0, 0.3)" }}
            >
              <View>
                <Text className="text-light-100 font-medium">Order #1234</Text>
                <Text className="text-light-400 text-xs mt-1">
                  Awaiting rider assignment
                </Text>
              </View>
              <View
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: "rgba(255, 149, 0, 0.2)" }}
              >
                <Text className="text-pending text-xs font-semibold">
                  PENDING
                </Text>
              </View>
            </View>

            {/* Active Status */}
            <View
              className="bg-secondary rounded-xl p-4 flex-row items-center justify-between border border-neutral-100"
              style={{ borderColor: "rgba(48, 209, 88, 0.3)" }}
            >
              <View>
                <Text className="text-light-100 font-medium">Order #1235</Text>
                <Text className="text-light-400 text-xs mt-1">
                  On the way to you
                </Text>
              </View>
              <View
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: "rgba(48, 209, 88, 0.2)" }}
              >
                <Text className="text-active text-xs font-semibold">
                  ACTIVE
                </Text>
              </View>
            </View>

            {/* Completed Status */}
            <View
              className="bg-secondary rounded-xl p-4 flex-row items-center justify-between border border-neutral-100"
              style={{ borderColor: "rgba(52, 199, 89, 0.3)" }}
            >
              <View>
                <Text className="text-light-100 font-medium">Order #1233</Text>
                <Text className="text-light-400 text-xs mt-1">
                  Delivered successfully
                </Text>
              </View>
              <View
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: "rgba(52, 199, 89, 0.2)" }}
              >
                <Text className="text-completed text-xs font-semibold">
                  COMPLETED
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Get Started CTA - For non-authenticated users */}
        {!isAuthenticated && (
          <View className="mx-6 mt-6 mb-4">
            <TouchableOpacity
              onPress={async () => {
                await navigationHelper.setPendingAction("request");
                router.push("/auth");
              }}
              className="bg-accent rounded-xl py-4 px-6 flex-row items-center justify-center"
            >
              <Icons.action
                name={IconNames.addCircle as any}
                size={20}
                color="#030014"
                style={{ marginRight: 8 }}
              />
              <Text className="text-primary font-bold text-base">
                Get Started - Request Your First Delivery
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer Note - Demonstrates Light Text Hierarchy */}
        <View className="mx-6 mt-4 mb-4">
          <Text className="text-light-400 text-xs text-center">
            Operating in Lagos, Nigeria • Night hours only
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
