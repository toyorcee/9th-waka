import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import {
  getNotificationPreferences,
  NotificationPreferences,
  updateNotificationPreferences,
  updateProfile,
} from "@/services/userApi";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

// All notification types that should be updated when toggling a global channel
const ALL_NOTIFICATION_TYPES = [
  "payment_reminder",
  "payment_day",
  "order_created",
  "order_assigned",
  "order_status_updated",
  "delivery_otp",
  "delivery_verified",
  "delivery_proof_updated",
  "auth_verified",
  "profile_updated",
  "payout_generated",
  "payout_paid",
  "price_change_requested",
  "price_change_accepted",
  "price_change_rejected",
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, checkAuthStatus } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({});
  const [loading, setLoading] = useState(true);
  const [savingChannel, setSavingChannel] = useState<
    "inApp" | "push" | "email" | null
  >(null);
  const [savingVehicleType, setSavingVehicleType] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await getNotificationPreferences();
      setPreferences(response.preferences || {});
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load settings",
        text2: error?.response?.data?.error || error?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getChannelStatus = (channel: "inApp" | "push" | "email"): boolean => {
    if (ALL_NOTIFICATION_TYPES.length === 0) return true;
    return ALL_NOTIFICATION_TYPES.every((type) => {
      const pref = preferences[type] || {
        inApp: true,
        push: true,
        email: true,
      };
      return pref[channel] !== false;
    });
  };

  const updateChannelPreference = async (
    channel: "inApp" | "push" | "email",
    value: boolean
  ) => {
    const updated: NotificationPreferences = { ...preferences };

    ALL_NOTIFICATION_TYPES.forEach((type) => {
      updated[type] = {
        ...(updated[type] || { inApp: true, push: true, email: true }),
        [channel]: value,
      };
    });

    setPreferences(updated);
    setSavingChannel(channel); // Set which specific channel is being saved

    try {
      // Send all updated preferences to backend
      await updateNotificationPreferences(updated);
      Toast.show({
        type: "success",
        text1: "Settings saved",
        text2: `All ${channel === "inApp" ? "in-app" : channel} notifications ${
          value ? "enabled" : "disabled"
        }`,
      });
    } catch (error: any) {
      // Revert on error
      setPreferences(preferences);
      Toast.show({
        type: "error",
        text1: "Failed to save",
        text2: error?.response?.data?.error || error?.message,
      });
    } finally {
      setSavingChannel(null); // Clear saving state
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-primary">
      <View className="pt-20 px-6 pb-10">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/profile");
              }
            }}
            className="w-10 h-10 items-center justify-center"
          >
            <Icons.navigation
              name={IconNames.arrowBack as any}
              size={24}
              color="#E6E6F0"
            />
          </TouchableOpacity>
          <Text className="text-light-100 text-2xl font-bold">Settings</Text>
          <View className="w-10" />
        </View>

        {/* Notification Preferences Section */}
        <View className="mb-6">
          <Text className="text-light-100 text-xl font-bold mb-2">
            Notification Preferences
          </Text>
          <Text className="text-light-400 text-sm mb-4">
            Choose how you want to receive notifications
          </Text>

          <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
            <View className="gap-4">
              {/* In-App Notifications */}
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-light-100 font-semibold mb-1">
                    In-App Notifications
                  </Text>
                  <Text className="text-light-400 text-xs">
                    Show notifications within the app
                  </Text>
                </View>
                <View className="relative">
                  {savingChannel === "inApp" && (
                    <View className="absolute inset-0 items-center justify-center z-10">
                      <ActivityIndicator size="small" color="#AB8BFF" />
                    </View>
                  )}
                  <Switch
                    value={getChannelStatus("inApp")}
                    onValueChange={(value) =>
                      updateChannelPreference("inApp", value)
                    }
                    trackColor={{ false: "#2A2D3A", true: "#AB8BFF" }}
                    thumbColor="#E6E6F0"
                    disabled={savingChannel !== null}
                    style={{ opacity: savingChannel === "inApp" ? 0.5 : 1 }}
                  />
                </View>
              </View>

              {/* Push Notifications */}
              <View className="flex-row items-center justify-between border-t border-neutral-100 pt-4">
                <View className="flex-1">
                  <Text className="text-light-100 font-semibold mb-1">
                    Push Notifications
                  </Text>
                  <Text className="text-light-400 text-xs">
                    Receive push notifications on your device
                  </Text>
                </View>
                <View className="relative">
                  {savingChannel === "push" && (
                    <View className="absolute inset-0 items-center justify-center z-10">
                      <ActivityIndicator size="small" color="#AB8BFF" />
                    </View>
                  )}
                  <Switch
                    value={getChannelStatus("push")}
                    onValueChange={(value) =>
                      updateChannelPreference("push", value)
                    }
                    trackColor={{ false: "#2A2D3A", true: "#AB8BFF" }}
                    thumbColor="#E6E6F0"
                    disabled={savingChannel !== null}
                    style={{ opacity: savingChannel === "push" ? 0.5 : 1 }}
                  />
                </View>
              </View>

              {/* Email Notifications */}
              <View className="flex-row items-center justify-between border-t border-neutral-100 pt-4">
                <View className="flex-1">
                  <Text className="text-light-100 font-semibold mb-1">
                    Email Notifications
                  </Text>
                  <Text className="text-light-400 text-xs">
                    Receive notifications via email
                  </Text>
                </View>
                <View className="relative">
                  {savingChannel === "email" && (
                    <View className="absolute inset-0 items-center justify-center z-10">
                      <ActivityIndicator size="small" color="#AB8BFF" />
                    </View>
                  )}
                  <Switch
                    value={getChannelStatus("email")}
                    onValueChange={(value) =>
                      updateChannelPreference("email", value)
                    }
                    trackColor={{ false: "#2A2D3A", true: "#AB8BFF" }}
                    thumbColor="#E6E6F0"
                    disabled={savingChannel !== null}
                    style={{ opacity: savingChannel === "email" ? 0.5 : 1 }}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Rider-Specific Settings */}
        {user?.role === "rider" && (
          <View className="mb-6">
            <Text className="text-light-100 text-xl font-bold mb-2">
              Rider Settings
            </Text>
            <Text className="text-light-400 text-sm mb-4">
              Manage your delivery preferences
            </Text>

            <View className="bg-secondary rounded-2xl p-5 border border-neutral-100">
              {/* Vehicle Type */}
              <View className="mb-4">
                <Text className="text-light-100 font-semibold mb-2">
                  Vehicle Type
                </Text>
                <Text className="text-light-400 text-xs mb-3">
                  Select your delivery vehicle (affects pricing)
                </Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={async () => {
                      if (user?.vehicleType === "motorcycle") return;
                      setSavingVehicleType(true);
                      try {
                        // Update vehicle type via profile update
                        await updateProfile({ vehicleType: "motorcycle" });
                        Toast.show({
                          type: "success",
                          text1: "Vehicle type updated",
                          text2: "Motorcycle selected",
                        });
                        // Refresh user context
                        await checkAuthStatus();
                      } catch (error: any) {
                        Toast.show({
                          type: "error",
                          text1: "Update failed",
                          text2: error?.response?.data?.error || error?.message,
                        });
                      } finally {
                        setSavingVehicleType(false);
                      }
                    }}
                    disabled={savingVehicleType}
                    className={`flex-1 rounded-xl p-4 border-2 ${
                      user?.vehicleType === "motorcycle"
                        ? "border-accent bg-accent/20"
                        : "border-neutral-100 bg-dark-100"
                    }`}
                  >
                    <Text
                      className={`text-center font-bold ${
                        user?.vehicleType === "motorcycle"
                          ? "text-accent"
                          : "text-light-300"
                      }`}
                    >
                      🏍️ Motorcycle
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      if (user?.vehicleType === "car") return;
                      setSavingVehicleType(true);
                      try {
                        await updateProfile({ vehicleType: "car" });
                        Toast.show({
                          type: "success",
                          text1: "Vehicle type updated",
                          text2: "Car/Van selected",
                        });
                        // Refresh user context
                        await checkAuthStatus();
                      } catch (error: any) {
                        Toast.show({
                          type: "error",
                          text1: "Update failed",
                          text2: error?.response?.data?.error || error?.message,
                        });
                      } finally {
                        setSavingVehicleType(false);
                      }
                    }}
                    disabled={savingVehicleType}
                    className={`flex-1 rounded-xl p-4 border-2 ${
                      user?.vehicleType === "car"
                        ? "border-accent bg-accent/20"
                        : "border-neutral-100 bg-dark-100"
                    }`}
                  >
                    <Text
                      className={`text-center font-bold ${
                        user?.vehicleType === "car"
                          ? "text-accent"
                          : "text-light-300"
                      }`}
                    >
                      🚗 Car/Van
                    </Text>
                  </TouchableOpacity>
                </View>
                {savingVehicleType && (
                  <View className="mt-3 items-center">
                    <ActivityIndicator size="small" color="#AB8BFF" />
                  </View>
                )}
              </View>

              {/* Location Settings Info */}
              <View className="border-t border-neutral-100 pt-4">
                <Text className="text-light-100 font-semibold mb-2">
                  Location Services
                </Text>
                <Text className="text-light-400 text-xs mb-2">
                  Location permission is required to go online and receive
                  delivery requests. You can toggle "Go Online" from the
                  Deliveries tab.
                </Text>
                <Text className="text-light-300 text-xs">
                  Your location is shared every 30 seconds while online to help
                  match you with nearby orders.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Profile Completion Reminder (for riders) */}
        {user?.role === "rider" && (!user?.fullName || !user?.phoneNumber) && (
          <View className="mb-6">
            <View className="bg-accent/20 border border-accent rounded-2xl p-5">
              <Text className="text-accent font-semibold mb-2">
                Complete Your Profile
              </Text>
              <Text className="text-light-300 text-sm mb-3">
                Add your name and phone number to complete your rider profile.
                This helps customers contact you for deliveries.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/profile/edit")}
                className="bg-accent rounded-xl py-3 px-4 items-center"
              >
                <Text className="text-primary font-bold">Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
