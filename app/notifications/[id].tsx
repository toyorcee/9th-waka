import { IconNames, Icons } from "@/constants/icons";
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
import Toast from "react-native-toast-message";

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
      if (notification.type === "payout_generated" || notification.type === "payout_paid") {
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
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  if (!notification) {
    return (
      <View className="flex-1 bg-primary items-center justify-center px-6">
        <Text className="text-light-300 text-center mb-4">
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
  const hasRelatedContent = Boolean(orderId) || 
    notification.type === "payout_generated" ||
    notification.type === "payout_paid" ||
    notification.type === "profile_updated";

  return (
    <ScrollView className="flex-1 bg-primary">
      <View className="pt-20 px-6 pb-10">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <Icons.navigation
              name={IconNames.arrowBack as any}
              size={24}
              color="#E6E6F0"
            />
          </TouchableOpacity>
          <Text className="text-light-100 text-2xl font-bold">Notification</Text>
          <View className="w-10" />
        </View>

        {/* Notification Details */}
        <View className="bg-secondary border border-neutral-100 rounded-2xl p-6 mb-4">
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1">
              <Text className="text-light-100 text-xl font-bold mb-2">
                {notification.title}
              </Text>
              <View className="flex-row items-center gap-2 mb-3">
                <View
                  className={`px-3 py-1 rounded-lg ${
                    notification.read
                      ? "bg-dark-100"
                      : "bg-accent/20 border border-accent"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      notification.read ? "text-light-400" : "text-accent"
                    }`}
                  >
                    {notification.read ? "Read" : "Unread"}
                  </Text>
                </View>
                <Text className="text-light-400 text-xs">
                  {new Date(notification.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-light-300 text-base leading-6">
              {notification.message}
            </Text>
          </View>

          <View className="pt-4 border-t border-neutral-100">
            <Text className="text-light-400 text-xs mb-2">Type</Text>
            <Text className="text-light-200 text-sm capitalize">
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
          className="bg-dark-100 border border-neutral-100 rounded-xl px-6 py-4"
        >
          <Text className="text-light-200 font-semibold text-center">
            Back to Notifications
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

