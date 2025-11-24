import TabBarSpacer from "@/components/TabBarSpacer";
import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTabBarPadding } from "@/hooks/useTabBarPadding";
import { checkActiveOrders } from "@/services/riderApi";
import {
  getNotificationPreferences,
  NotificationPreferences,
  updateNotificationPreferences,
} from "@/services/userApi";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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
  const {
    theme,
    themeMode,
    setThemeMode,
    autoThemeEnabled,
    setAutoThemeEnabled,
  } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
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

  // Slide-in animation from right to left
  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (!hasAnimatedRef.current && !loading && user) {
      hasAnimatedRef.current = true;
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, user]);

  useEffect(() => {
    loadPreferences();
    checkLocationPermission();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkLocationPermission();
      if (user?.role === "rider") {
        checkActiveOrdersStatus();
      }
    }, [user?.role])
  );

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
          text2:
            user?.role === "rider"
              ? "You can now go online and receive delivery requests"
              : "You can now quickly set your pickup address when creating orders",
        });
      } else if (status === Location.PermissionStatus.DENIED) {
        Toast.show({
          type: "error",
          text1: "Location permission denied",
          text2:
            "Please enable location in your device settings. Go to Apps, 9thWaka, Permissions, then Location",
        });
        if (Platform.OS !== "web") {
          Linking.openSettings();
        }
      } else {
        Toast.show({
          type: "info",
          text1: "Location permission needed",
          text2:
            "Please allow location access. You can choose 'While Using the App' or 'Just Once'",
        });
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
      <View
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-primary" : "bg-white"
        }`}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? "#AB8BFF" : "#1E3A8A"}
        />
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["top"]}
      className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
    >
      <Animated.View
        className="flex-1"
        style={{
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
        }}
      >
        {/* Fixed Header */}
        <Reanimated.View
          entering={FadeInDown.delay(0)}
          className={`absolute top-0 left-0 right-0 z-50 ${
            isDark ? "bg-primary" : "bg-white"
          }`}
          style={{
            paddingTop: insets.top + 10,
            paddingBottom: 12,
            paddingHorizontal: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "#3A3A3C" : "#E5E5EA",
          }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(tabs)/profile");
                }
              }}
              className="w-10 h-10 items-center justify-center"
              activeOpacity={0.7}
            >
              <Icons.navigation
                name={IconNames.arrowBack as any}
                size={20}
                color={isDark ? "#E6E6F0" : "#000000"}
              />
            </TouchableOpacity>
            <Text
              className={`text-lg font-bold flex-1 text-center ${
                isDark ? "text-light-100" : "text-black"
              }`}
            >
              Settings
            </Text>
            <View className="w-10" />
          </View>
        </Reanimated.View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingTop: insets.top + 80, // Header height + safe area
            paddingBottom: 20, // Reduced padding since TabBarSpacer handles the rest
            paddingHorizontal: 24,
          }}
        >
          <View style={{ paddingBottom: 20 }}>
            {/* Appearance Section */}
            <View className="mb-6">
              <Text
                className={`text-xl font-bold mb-2 ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Appearance
              </Text>
              <Text
                className={`text-sm mb-4 ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                Customize the app's appearance
              </Text>

              <View
                className={`rounded-2xl p-5 border ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.05 : 0.03,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text
                      className={`font-semibold mb-1 ${
                        isDark ? "text-light-100" : "text-black"
                      }`}
                    >
                      Theme
                    </Text>
                    <Text
                      className={`text-xs ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
                      {themeMode === "auto" && autoThemeEnabled
                        ? "Auto (Light at 7:30 AM, Dark at 6:30 PM)"
                        : themeMode === "system"
                        ? "Following system settings"
                        : theme === "dark"
                        ? "Dark mode"
                        : "Light mode"}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      onPress={() => {
                        setThemeMode("light");
                        setAutoThemeEnabled(false);
                      }}
                      className={`px-4 py-2 rounded-xl ${
                        themeMode === "light" && !autoThemeEnabled
                          ? isDark
                            ? "bg-accent"
                            : "bg-blue-900"
                          : isDark
                          ? "bg-dark-100 border border-neutral-100"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <Text
                        className={`font-semibold text-sm ${
                          themeMode === "light" && !autoThemeEnabled
                            ? isDark
                              ? "text-primary"
                              : "text-white"
                            : isDark
                            ? "text-light-400"
                            : "text-gray-500"
                        }`}
                      >
                        Light
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setThemeMode("dark");
                        setAutoThemeEnabled(false);
                      }}
                      className={`px-4 py-2 rounded-xl ${
                        themeMode === "dark" && !autoThemeEnabled
                          ? isDark
                            ? "bg-accent"
                            : "bg-blue-900"
                          : isDark
                          ? "bg-dark-100 border border-neutral-100"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <Text
                        className={`font-semibold text-sm ${
                          themeMode === "dark" && !autoThemeEnabled
                            ? isDark
                              ? "text-primary"
                              : "text-white"
                            : isDark
                            ? "text-light-400"
                            : "text-gray-500"
                        }`}
                      >
                        Dark
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setThemeMode("system")}
                      className={`px-4 py-2 rounded-xl ${
                        themeMode === "system"
                          ? isDark
                            ? "bg-accent"
                            : "bg-blue-900"
                          : isDark
                          ? "bg-dark-100 border border-neutral-100"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <Text
                        className={`font-semibold text-sm ${
                          themeMode === "system"
                            ? isDark
                              ? "text-primary"
                              : "text-white"
                            : isDark
                            ? "text-light-400"
                            : "text-gray-500"
                        }`}
                      >
                        System
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Auto Theme Toggle */}
                <View
                  className={`rounded-2xl p-5 border mt-4 ${
                    isDark
                      ? "bg-secondary border-neutral-100"
                      : "bg-white border-gray-200"
                  }`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.05 : 0.03,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 mr-4">
                      <Text
                        className={`font-semibold mb-1 ${
                          isDark ? "text-light-100" : "text-black"
                        }`}
                      >
                        Auto Theme (Nigerian Time)
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        Automatically switch to light theme at 7:30 AM and dark
                        theme at 6:30 PM
                      </Text>
                    </View>
                    <Switch
                      value={autoThemeEnabled}
                      onValueChange={(value) => {
                        if (value) {
                          setThemeMode("auto");
                        }
                        setAutoThemeEnabled(value);
                      }}
                      trackColor={{
                        false: isDark ? "#3A3A3C" : "#E5E5EA",
                        true: isDark ? "#AB8BFF" : "#1E3A8A",
                      }}
                      thumbColor={
                        autoThemeEnabled
                          ? isDark
                            ? "#030014"
                            : "#FFFFFF"
                          : isDark
                          ? "#9CA4AB"
                          : "#FFFFFF"
                      }
                      ios_backgroundColor={isDark ? "#3A3A3C" : "#E5E5EA"}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Notification Preferences Section */}
            <View className="mb-6">
              <Text
                className={`text-xl font-bold mb-2 ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Notification Preferences
              </Text>
              <Text
                className={`text-sm mb-4 ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                Choose how you want to receive notifications
              </Text>

              <View
                className={`rounded-2xl p-5 border ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.05 : 0.03,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View className="gap-4">
                  {/* In-App Notifications */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className={`font-semibold mb-1 ${
                          isDark ? "text-light-100" : "text-black"
                        }`}
                      >
                        In-App Notifications
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        Show notifications within the app
                      </Text>
                    </View>
                    <View className="relative">
                      {savingChannel === "inApp" && (
                        <View className="absolute inset-0 items-center justify-center z-10">
                          <ActivityIndicator
                            size="small"
                            color={isDark ? "#AB8BFF" : "#1E3A8A"}
                          />
                        </View>
                      )}
                      <Switch
                        value={getChannelStatus("inApp")}
                        onValueChange={(value) =>
                          updateChannelPreference("inApp", value)
                        }
                        trackColor={{
                          false: isDark ? "#2A2D3A" : "#E5E5EA",
                          true: isDark ? "#AB8BFF" : "#1E3A8A",
                        }}
                        thumbColor={isDark ? "#E6E6F0" : "#FFFFFF"}
                        disabled={savingChannel !== null}
                        style={{ opacity: savingChannel === "inApp" ? 0.5 : 1 }}
                      />
                    </View>
                  </View>

                  {/* Push Notifications */}
                  <View
                    className={`flex-row items-center justify-between border-t pt-4 ${
                      isDark ? "border-neutral-100" : "border-gray-200"
                    }`}
                  >
                    <View className="flex-1">
                      <Text
                        className={`font-semibold mb-1 ${
                          isDark ? "text-light-100" : "text-black"
                        }`}
                      >
                        Push Notifications
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        Receive push notifications on your device
                      </Text>
                    </View>
                    <View className="relative">
                      {savingChannel === "push" && (
                        <View className="absolute inset-0 items-center justify-center z-10">
                          <ActivityIndicator
                            size="small"
                            color={isDark ? "#AB8BFF" : "#1E3A8A"}
                          />
                        </View>
                      )}
                      <Switch
                        value={getChannelStatus("push")}
                        onValueChange={(value) =>
                          updateChannelPreference("push", value)
                        }
                        trackColor={{
                          false: isDark ? "#2A2D3A" : "#E5E5EA",
                          true: isDark ? "#AB8BFF" : "#1E3A8A",
                        }}
                        thumbColor={isDark ? "#E6E6F0" : "#FFFFFF"}
                        disabled={savingChannel !== null}
                        style={{ opacity: savingChannel === "push" ? 0.5 : 1 }}
                      />
                    </View>
                  </View>

                  {/* Email Notifications */}
                  <View
                    className={`flex-row items-center justify-between border-t pt-4 ${
                      isDark ? "border-neutral-100" : "border-gray-200"
                    }`}
                  >
                    <View className="flex-1">
                      <Text
                        className={`font-semibold mb-1 ${
                          isDark ? "text-light-100" : "text-black"
                        }`}
                      >
                        Email Notifications
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        Receive notifications via email
                      </Text>
                    </View>
                    <View className="relative">
                      {savingChannel === "email" && (
                        <View className="absolute inset-0 items-center justify-center z-10">
                          <ActivityIndicator
                            size="small"
                            color={isDark ? "#AB8BFF" : "#1E3A8A"}
                          />
                        </View>
                      )}
                      <Switch
                        value={getChannelStatus("email")}
                        onValueChange={(value) =>
                          updateChannelPreference("email", value)
                        }
                        trackColor={{
                          false: isDark ? "#2A2D3A" : "#E5E5EA",
                          true: isDark ? "#AB8BFF" : "#1E3A8A",
                        }}
                        thumbColor={isDark ? "#E6E6F0" : "#FFFFFF"}
                        disabled={savingChannel !== null}
                        style={{ opacity: savingChannel === "email" ? 0.5 : 1 }}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Location Settings */}
            <View className="mb-6">
              <Text
                className={`text-xl font-bold mb-2 ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Location Services
              </Text>
              <Text
                className={`text-sm mb-4 ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                {user?.role === "rider"
                  ? "Enable location to go online and receive delivery requests"
                  : "Enable location to quickly set your pickup address when creating orders"}
              </Text>

              <View
                className={`rounded-2xl p-5 border ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                } ${
                  user?.role === "rider" && hasActiveOrders ? "opacity-60" : ""
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.05 : 0.03,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {user?.role === "rider" && checkingActiveOrders && (
                  <View className="bg-info/20 border border-info rounded-xl p-3 mb-4">
                    <View className="flex-row items-center">
                      <ActivityIndicator
                        size="small"
                        color="#5AC8FA"
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        className={`text-info text-xs ${
                          isDark ? "text-light-300" : "text-gray-600"
                        }`}
                      >
                        Checking active orders...
                      </Text>
                    </View>
                  </View>
                )}
                {user?.role === "rider" &&
                  !checkingActiveOrders &&
                  hasActiveOrders && (
                    <View
                      className={`border rounded-xl p-3 mb-4 ${
                        isDark
                          ? "bg-accent/20 border-accent"
                          : "bg-blue-900/20 border-blue-900"
                      }`}
                    >
                      <Text
                        className={`font-semibold text-sm mb-1 ${
                          isDark ? "text-accent" : "text-blue-900"
                        }`}
                      >
                        Location Locked
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-300" : "text-gray-600"
                        }`}
                      >
                        You have active orders. Location services must remain
                        enabled until all orders are completed or cancelled.
                      </Text>
                    </View>
                  )}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1">
                    <Text
                      className={`font-semibold mb-1 ${
                        isDark ? "text-light-100" : "text-black"
                      }`}
                    >
                      Location Permission
                    </Text>
                    <Text
                      className={`text-xs ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
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
                    <Switch
                      value={
                        locationPermissionStatus ===
                        Location.PermissionStatus.GRANTED
                      }
                      onValueChange={async (value) => {
                        if (value) {
                          await requestLocationPermission();
                        } else {
                          if (user?.role === "rider" && hasActiveOrders) {
                            Toast.show({
                              type: "error",
                              text1: "Cannot disable location",
                              text2:
                                "You have active orders. Complete or cancel them first.",
                            });
                          } else {
                            Toast.show({
                              type: "info",
                              text1: "Disable in device settings",
                              text2:
                                "To turn off location, open your device settings. Go to Apps, then 9thWaka, then Permissions, then Location",
                            });
                            openLocationSettings();
                          }
                        }
                      }}
                      trackColor={{
                        false: isDark ? "#2A2D3A" : "#E5E5EA",
                        true: "#AB8BFF",
                      }}
                      thumbColor={isDark ? "#E6E6F0" : "#FFFFFF"}
                      disabled={
                        checkingLocation ||
                        (user?.role === "rider" && hasActiveOrders)
                      }
                      style={{
                        opacity:
                          checkingLocation ||
                          (user?.role === "rider" && hasActiveOrders)
                            ? 0.5
                            : 1,
                      }}
                    />
                  </View>
                </View>

                {locationPermissionStatus !==
                  Location.PermissionStatus.GRANTED && (
                  <TouchableOpacity
                    onPress={requestLocationPermission}
                    disabled={
                      checkingLocation ||
                      (user?.role === "rider" && hasActiveOrders)
                    }
                    className={`rounded-xl py-3 px-4 items-center mt-2 ${
                      user?.role === "rider" && hasActiveOrders
                        ? isDark
                          ? "bg-dark-100 border border-neutral-100 opacity-50"
                          : "bg-white border border-gray-200 opacity-50"
                        : isDark
                        ? "bg-accent"
                        : "bg-blue-900"
                    }`}
                  >
                    {checkingLocation ? (
                      <ActivityIndicator
                        size="small"
                        color={isDark ? "#030014" : "#FFFFFF"}
                      />
                    ) : (
                      <Text
                        className={`font-bold ${
                          user?.role === "rider" && hasActiveOrders
                            ? isDark
                              ? "text-light-400"
                              : "text-gray-500"
                            : isDark
                            ? "text-primary"
                            : "text-white"
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
                    disabled={user?.role === "rider" && hasActiveOrders}
                    className={`border rounded-xl py-3 px-4 items-center mt-2 ${
                      isDark ? "border-neutral-100" : "border-gray-200"
                    } ${
                      user?.role === "rider" && hasActiveOrders
                        ? isDark
                          ? "bg-dark-100 opacity-50"
                          : "bg-white opacity-50"
                        : isDark
                        ? "bg-dark-100"
                        : "bg-white"
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        user?.role === "rider" && hasActiveOrders
                          ? isDark
                            ? "text-light-400"
                            : "text-gray-500"
                          : isDark
                          ? "text-light-200"
                          : "text-black"
                      }`}
                    >
                      Open Device Settings
                    </Text>
                  </TouchableOpacity>
                )}

                <View
                  className={`mt-4 pt-4 border-t ${
                    isDark ? "border-neutral-100" : "border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-xs mb-2 ${
                      isDark ? "text-light-300" : "text-gray-600"
                    }`}
                  >
                    📍 How it works:
                  </Text>
                  {user?.role === "rider" ? (
                    <>
                      <Text
                        className={`text-xs mb-1 ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        • Location is required to go online and receive orders
                      </Text>
                      <Text
                        className={`text-xs mb-1 ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        • Your location is shared every 30 seconds while online
                      </Text>
                      <Text
                        className={`text-xs mb-1 ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        • Toggle "Go Online" from the Deliveries tab to start
                        receiving orders
                      </Text>
                      {hasActiveOrders && (
                        <Text
                          className={`text-xs mt-2 font-semibold ${
                            isDark ? "text-accent" : "text-blue-900"
                          }`}
                        >
                          ⚠️ Location cannot be disabled while you have active
                          orders
                        </Text>
                      )}
                    </>
                  ) : (
                    <>
                      <Text
                        className={`text-xs mb-1 ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        • Location is used to quickly set your pickup address
                        when creating orders
                      </Text>
                      <Text
                        className={`text-xs mb-1 ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        • We only access location when you tap the location
                        button
                      </Text>
                      <Text
                        className={`text-xs mb-1 ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        • You can choose "While Using the App" or "Just Once"
                        when prompted
                      </Text>
                    </>
                  )}
                  <Text
                    className={`text-xs mt-3 ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    💡 To turn off location: Open Device Settings above, then go
                    to Apps, then 9thWaka, then Permissions, then Location
                  </Text>
                </View>
              </View>
            </View>

            {/* Profile Completion Reminder (for riders) */}
            {user?.role === "rider" &&
              (!user?.fullName || !user?.phoneNumber) && (
                <View className="mb-6">
                  <View
                    className={`border rounded-2xl p-5 ${
                      isDark
                        ? "bg-accent/20 border-accent"
                        : "bg-blue-900/20 border-blue-900"
                    }`}
                  >
                    <Text
                      className={`font-semibold mb-2 ${
                        isDark ? "text-accent" : "text-blue-900"
                      }`}
                    >
                      Complete Your Profile
                    </Text>
                    <Text
                      className={`text-sm mb-3 ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      Add your name and phone number to complete your rider
                      profile. This helps customers contact you for deliveries.
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push("/profile/edit")}
                      className={`rounded-xl py-3 px-4 items-center ${
                        isDark ? "bg-accent" : "bg-blue-900"
                      }`}
                    >
                      <Text
                        className={`font-bold ${
                          isDark ? "text-primary" : "text-white"
                        }`}
                      >
                        Edit Profile
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
          </View>
        </ScrollView>
        <TabBarSpacer />
      </Animated.View>
    </SafeAreaView>
  );
}
