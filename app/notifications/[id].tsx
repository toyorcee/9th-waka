import { IconNames, Icons } from "@/constants/icons";
import { useTheme } from "@/contexts/ThemeContext";
import { Routes } from "@/services/navigationHelper";
import {
  getNotification,
  markNotificationRead,
  NotificationItem,
} from "@/services/notificationService";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const [notification, setNotification] = useState<NotificationItem | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotification();
  }, [id]);

  const loadNotification = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const notif = await getNotification(id);
      setNotification(notif);

      // Mark as read if not already read
      if (!notif.read) {
        try {
          await markNotificationRead(id);
        } catch (error) {
          console.warn("Failed to mark notification as read", error);
        }
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.error || e?.message || "Failed to load notification";
      Toast.show({ type: "error", text1: "Error", text2: String(msg) });
      // Navigate back on error
      setTimeout(() => {
        router.back();
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRelatedContent = () => {
    if (!notification) return;

    // Navigate to related content based on notification type
    const orderId =
      notification.metadata?.orderId ||
      (notification.type.includes("order") ? notification.id : null);

    if (orderId) {
      router.push(Routes.standalone.orderDetail(orderId) as any);
    } else {
      // For other notification types, navigate to relevant pages
      if (
        notification.type === "payout_generated" ||
        notification.type === "payout_paid"
      ) {
        router.push(Routes.tabs.earnings as any);
      } else if (notification.type === "profile_updated") {
        router.push(Routes.standalone.profileEdit as any);
      } else {
        // Default: go back to notifications list
        router.back();
      }
    }
  };

  if (loading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-primary" : "bg-white"
        }`}
      >
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  if (!notification) {
    return (
      <View
        className={`flex-1 items-center justify-center px-6 ${
          isDark ? "bg-primary" : "bg-white"
        }`}
        style={{ paddingTop: insets.top }}
      >
        <Text
          className={`text-center mb-4 ${
            isDark ? "text-light-300" : "text-gray-600"
          }`}
        >
          Notification not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-accent rounded-xl px-6 py-3"
        >
          <Text className="text-primary font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const orderId =
    notification.metadata?.orderId ||
    (notification.type.includes("order") ? notification.id : null);
  const hasRelatedContent =
    Boolean(orderId) ||
    notification.type === "payout_generated" ||
    notification.type === "payout_paid" ||
    notification.type === "profile_updated";

  return (
    <ScrollView
      className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <View className="px-6 pb-10" style={{ paddingTop: insets.top + 20 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <Icons.navigation
              name={IconNames.arrowBack as any}
              size={24}
              color={isDark ? "#E6E6F0" : "#000000"}
            />
          </TouchableOpacity>
          <Text
            className={`text-2xl font-bold ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            Notification
          </Text>
          <View className="w-10" />
        </View>

        {/* Notification Details */}
        <View
          className={`rounded-2xl p-6 mb-4 border ${
            isDark
              ? "bg-secondary border-neutral-100"
              : "bg-white border-gray-200"
          }`}
        >
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1">
              <Text
                className={`text-xl font-bold mb-2 ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                {notification.title}
              </Text>
              <View className="flex-row items-center gap-2 mb-3">
                <View
                  className={`px-3 py-1 rounded-lg ${
                    notification.read
                      ? isDark
                        ? "bg-dark-100"
                        : "bg-gray-100"
                      : "bg-accent/20 border border-accent"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      notification.read
                        ? isDark
                          ? "text-light-400"
                          : "text-gray-500"
                        : "text-accent"
                    }`}
                  >
                    {notification.read ? "Read" : "Unread"}
                  </Text>
                </View>
                <Text
                  className={`text-xs ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  {new Date(notification.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-4">
            <Text
              className={`text-base leading-6 ${
                isDark ? "text-light-300" : "text-gray-600"
              }`}
            >
              {notification.message}
            </Text>
          </View>

          <View
            className={`pt-4 border-t ${
              isDark ? "border-neutral-100" : "border-gray-200"
            }`}
          >
            <Text
              className={`text-xs mb-2 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              Type
            </Text>
            <Text
              className={`text-sm capitalize ${
                isDark ? "text-light-200" : "text-black"
              }`}
            >
              {notification.type.replace(/_/g, " ")}
            </Text>
          </View>
        </View>

        {/* Related Content Button */}
        {hasRelatedContent && (
          <TouchableOpacity
            onPress={handleViewRelatedContent}
            className="bg-accent rounded-xl px-6 py-4 mb-4"
          >
            <View className="flex-row items-center justify-center gap-2">
              {orderId ? (
                <Icons.package
                  name={IconNames.package as any}
                  size={20}
                  color="#030014"
                />
              ) : notification.type.includes("payout") ? (
                <Icons.money
                  name={IconNames.wallet as any}
                  size={20}
                  color="#030014"
                />
              ) : (
                <Icons.user
                  name={IconNames.personOutline as any}
                  size={20}
                  color="#030014"
                />
              )}
              <Text className="text-primary font-bold text-base">
                {orderId
                  ? "View Order Details"
                  : notification.type.includes("payout")
                  ? "View Earnings"
                  : "View Profile"}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Back to List Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className={`border rounded-xl px-6 py-4 ${
            isDark
              ? "bg-dark-100 border-neutral-100"
              : "bg-white border-gray-200"
          }`}
        >
          <Text
            className={`font-semibold text-center ${
              isDark ? "text-light-200" : "text-black"
            }`}
          >
            Back to Notifications
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
