import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { checkActiveOrders } from "@/services/riderApi";
import {
  getNotificationPreferences,
  NotificationPreferences,
  updateNotificationPreferences,
} from "@/services/userApi";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

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
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({});
  const [loading, setLoading] = useState(true);
  const [savingChannel, setSavingChannel] = useState<
    "inApp" | "push" | "email" | null
  >(null);
  const [locationPermissionStatus, setLocationPermissionStatus] =
    useState<Location.PermissionStatus | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [hasActiveOrders, setHasActiveOrders] = useState(false);
  const [checkingActiveOrders, setCheckingActiveOrders] = useState(false);

  useEffect(() => {
    loadPreferences();
    checkLocationPermission();
  }, []);

  // Refresh active orders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.role === "rider") {
        checkActiveOrdersStatus();
      }
    }, [user?.role])
  );

  // Periodically refresh active orders status
  useEffect(() => {
    if (user?.role === "rider") {
      const interval = setInterval(() => {
        checkActiveOrdersStatus();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user?.role]);

  const checkActiveOrdersStatus = async () => {
    if (user?.role !== "rider") return;
    setCheckingActiveOrders(true);
    try {
      const result = await checkActiveOrders();
      setHasActiveOrders(result.hasActiveOrders);
    } catch (error) {
      console.error("Error checking active orders:", error);
    } finally {
      setCheckingActiveOrders(false);
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermissionStatus(status);
    } catch (error) {
      console.error("Error checking location permission:", error);
    }
  };

  const requestLocationPermission = async () => {
    setCheckingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermissionStatus(status);

      if (status === Location.PermissionStatus.GRANTED) {
        Toast.show({
          type: "success",
          text1: "Location enabled",
          text2: "You can now go online and receive delivery requests",
        });
      } else if (status === Location.PermissionStatus.DENIED) {
        Toast.show({
          type: "error",
          text1: "Location permission denied",
          text2: "Please enable location in your device settings",
        });
        // Optionally open settings
        if (Platform.OS !== "web") {
          Linking.openSettings();
        }
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error?.message || "Failed to request location permission",
      });
    } finally {
      setCheckingLocation(false);
    }
  };

  const openLocationSettings = () => {
    if (Platform.OS !== "web") {
      Linking.openSettings();
    }
  };

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

        {/* Location Settings (Riders only) */}
        {user?.role === "rider" && (
          <View className="mb-6">
            <Text className="text-light-100 text-xl font-bold mb-2">
              Location Services
            </Text>
            <Text className="text-light-400 text-sm mb-4">
              Enable location to go online and receive delivery requests
            </Text>

            <View
              className={`bg-secondary rounded-2xl p-5 border border-neutral-100 ${
                hasActiveOrders ? "opacity-60" : ""
              }`}
            >
              {hasActiveOrders && (
                <View className="bg-accent/20 border border-accent rounded-xl p-3 mb-4">
                  <Text className="text-accent font-semibold text-sm mb-1">
                    Location Locked
                  </Text>
                  <Text className="text-light-300 text-xs">
                    You have active orders. Location services must remain
                    enabled until all orders are completed or cancelled.
                  </Text>
                </View>
              )}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-light-100 font-semibold mb-1">
                    Location Permission
                  </Text>
                  <Text className="text-light-400 text-xs">
                    {locationPermissionStatus ===
                    Location.PermissionStatus.GRANTED
                      ? "Location access is enabled"
                      : locationPermissionStatus ===
                        Location.PermissionStatus.DENIED
                      ? "Location access is denied"
                      : "Location permission not granted"}
                  </Text>
                </View>
                <View className="relative">
                  {checkingLocation && (
                    <View className="absolute inset-0 items-center justify-center z-10">
                      <ActivityIndicator size="small" color="#AB8BFF" />
                    </View>
                  )}
                  {locationPermissionStatus ===
                  Location.PermissionStatus.GRANTED ? (
                    <View className="w-12 h-6 bg-green-500 rounded-full items-center justify-center">
                      <Icons.safety
                        name={IconNames.checkmarkCircle as any}
                        size={16}
                        color="#FFFFFF"
                      />
                    </View>
                  ) : (
                    <View className="w-12 h-6 bg-red-500 rounded-full items-center justify-center">
                      <Icons.safety
                        name={IconNames.closeCircle as any}
                        size={16}
                        color="#FFFFFF"
                      />
                    </View>
                  )}
                </View>
              </View>

              {locationPermissionStatus !==
                Location.PermissionStatus.GRANTED && (
                <TouchableOpacity
                  onPress={requestLocationPermission}
                  disabled={checkingLocation || hasActiveOrders}
                  className={`rounded-xl py-3 px-4 items-center mt-2 ${
                    hasActiveOrders
                      ? "bg-dark-100 border border-neutral-100 opacity-50"
                      : "bg-accent"
                  }`}
                >
                  {checkingLocation ? (
                    <ActivityIndicator size="small" color="#030014" />
                  ) : (
                    <Text
                      className={`font-bold ${
                        hasActiveOrders ? "text-light-400" : "text-primary"
                      }`}
                    >
                      Enable Location
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {locationPermissionStatus ===
                Location.PermissionStatus.DENIED && (
                <TouchableOpacity
                  onPress={openLocationSettings}
                  disabled={hasActiveOrders}
                  className={`border border-neutral-100 rounded-xl py-3 px-4 items-center mt-2 ${
                    hasActiveOrders ? "bg-dark-100 opacity-50" : "bg-dark-100"
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      hasActiveOrders ? "text-light-400" : "text-light-200"
                    }`}
                  >
                    Open Device Settings
                  </Text>
                </TouchableOpacity>
              )}

              <View className="mt-4 pt-4 border-t border-neutral-100">
                <Text className="text-light-300 text-xs mb-2">
                  📍 How it works:
                </Text>
                <Text className="text-light-400 text-xs mb-1">
                  • Location is required to go online and receive orders
                </Text>
                <Text className="text-light-400 text-xs mb-1">
                  • Your location is shared every 30 seconds while online
                </Text>
                <Text className="text-light-400 text-xs mb-1">
                  • Toggle "Go Online" from the Deliveries tab to start
                  receiving orders
                </Text>
                {hasActiveOrders && (
                  <Text className="text-accent text-xs mt-2 font-semibold">
                    ⚠️ Location cannot be disabled while you have active orders
                  </Text>
                )}
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
