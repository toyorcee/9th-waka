import { IconNames, Icons } from "@/constants/icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useTabBarPadding } from "@/hooks/useTabBarPadding";
import {
  trackMarkAllRead,
  trackNotificationOpened,
} from "@/services/analyticsService";
import { Routes } from "@/services/navigationHelper";
import {
  fetchNotifications,
  markNotificationRead,
  NotificationItem,
} from "@/services/notificationService";
import useFetch from "@/services/useFetch";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type UnifiedNotification = NotificationItem & { id: string; metadata?: any };

function normalizeNotification(n: any): UnifiedNotification {
  return {
    id: String(n.id || n._id || Date.now()),
    type: n.type,
    title: n.title,
    message: n.message,
    timestamp: n.timestamp || n.createdAt || new Date().toISOString(),
    read: Boolean(n.read),
    metadata: n.metadata || {},
  };
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { tabBarPadding } = useTabBarPadding();
  const isDark = theme === "dark";
  const { data, loading, refetch } = useFetch(
    () => fetchNotifications(0, 100),
    true
  );
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const notifications = useMemo(() => {
    const items = data?.items || [];
    return items
      .map(normalizeNotification)
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [data]);

  const unreadCount = useMemo(
    () => notifications.filter((notif) => !notif.read).length,
    [notifications]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleOpenNotification = useCallback(
    async (notif: UnifiedNotification) => {
      // Track analytics
      await trackNotificationOpened(notif.id, notif.type, Boolean(notif.read));

      try {
        await markNotificationRead(notif.id);
        await refetch();
      } catch (error) {
        console.warn("Failed to mark notification as read", error);
      }

      // Navigate to notification detail page
      router.push(`/notifications/${notif.id}` as any);
    },
    [refetch, router]
  );

  const handleMarkAllRead = useCallback(async () => {
    const unread = notifications.filter((notif) => !notif.read);
    if (unread.length === 0) return;

    // Track analytics
    await trackMarkAllRead(unread.length);

    try {
      await Promise.all(
        unread.map(async (notif) => {
          try {
            await markNotificationRead(notif.id);
          } catch (error) {
            console.warn("Failed to mark notification as read", error);
          }
        })
      );
      await refetch();
    } catch (error) {
      console.warn("Failed to mark all notifications as read", error);
    }
  }, [notifications, refetch]);

  const renderItem = React.useCallback(
    ({ item }: { item: UnifiedNotification }) => (
      <TouchableOpacity
        onPress={() => handleOpenNotification(item)}
        className={`rounded-2xl px-5 py-4 mb-3 border ${
          isDark
            ? item.read
              ? "bg-dark-100 border-neutral-100/40"
              : "bg-dark-100 border-accent/50"
            : item.read
            ? "bg-white border-gray-200"
            : "bg-white border-blue-900/50"
        }`}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <Text
              className={`text-base font-semibold ${
                isDark ? "text-light-100" : "text-black"
              }`}
            >
              {item.title}
            </Text>
            <Text
              className={`text-sm mt-1 ${
                isDark ? "text-light-300" : "text-gray-600"
              }`}
            >
              {item.message}
            </Text>
            <Text
              className={`text-xs mt-2 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              {new Date(item.timestamp).toLocaleString()}
            </Text>
          </View>
          {!item.read && (
            <View
              className={`w-2 h-2 rounded-full mt-2 ${
                isDark ? "bg-accent" : "bg-blue-900"
              }`}
            />
          )}
        </View>
      </TouchableOpacity>
    ),
    [isDark, handleOpenNotification]
  );

  return (
    <View
      className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
      style={{ paddingTop: insets.top + 12 }}
    >
      <View
        className={`px-6 pb-6 border-b ${
          isDark ? "border-neutral-100/40" : "border-gray-200"
        }`}
      >
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(Routes.tabs.home as any);
              }
            }}
            className={`w-11 h-11 rounded-full border items-center justify-center mr-4 ${
              isDark
                ? "bg-secondary border-neutral-100"
                : "bg-white border-gray-200"
            }`}
          >
            <Icons.navigation
              name={IconNames.arrowBack as any}
              size={20}
              color={isDark ? "#9CA4AB" : "#6E6E73"}
            />
          </TouchableOpacity>
        </View>

        {/* Enhanced Header */}
        <View className="items-center mb-4">
          <View
            className={`rounded-2xl p-4 mb-3 ${
              isDark ? "bg-accent/20" : "bg-blue-900/20"
            }`}
          >
            <Icons.notification
              name={IconNames.notificationsOutline as any}
              size={32}
              color={isDark ? "#AB8BFF" : "#1E3A8A"}
            />
          </View>
          <Text
            className={`text-2xl font-bold text-center mb-2 ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            Notifications
          </Text>
          <Text
            className={`text-sm text-center leading-5 px-4 ${
              isDark ? "text-light-400" : "text-gray-600"
            }`}
          >
            Stay updated with your orders, deliveries, and important updates
            from 9thWaka
          </Text>
        </View>

        <View className="flex-row items-center justify-between mt-2">
          <Text
            className={`text-sm ${isDark ? "text-light-300" : "text-gray-600"}`}
          >
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </Text>
          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            <Text
              className={`text-sm font-semibold ${
                unreadCount === 0
                  ? isDark
                    ? "text-light-400"
                    : "text-gray-500"
                  : isDark
                  ? "text-accent"
                  : "text-blue-900"
              }`}
            >
              Mark all read
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing && notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color={isDark ? "#AB8BFF" : "#1E3A8A"}
          />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: tabBarPadding,
          }}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          getItemLayout={(data, index) => ({
            length: 100, // Approximate item height
            offset: 100 * index,
            index,
          })}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={isDark ? "#AB8BFF" : "#1E3A8A"}
            />
          }
          ListEmptyComponent={() => (
            <View className="items-center justify-center mt-40">
              <Icons.notification
                name={IconNames.notificationsOutline as any}
                size={48}
                color={isDark ? "#9CA4AB" : "#6E6E73"}
              />
              <Text
                className={`text-sm mt-4 ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                No notifications yet
              </Text>
              <Text
                className={`text-xs mt-1 text-center px-12 ${
                  isDark ? "text-light-500" : "text-gray-400"
                }`}
              >
                Once you start interacting with orders, updates will appear
                here.
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
