import { IconNames, Icons } from "@/constants/icons";
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

type UnifiedNotification = NotificationItem & { id: string };

function normalizeNotification(n: any): UnifiedNotification {
  return {
    id: String(n.id || n._id || Date.now()),
    type: n.type,
    title: n.title,
    message: n.message,
    timestamp: n.timestamp || n.createdAt || new Date().toISOString(),
    read: Boolean(n.read),
  };
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

      if (notif.type === "order" || notif.type === "order_created") {
        router.push(Routes.standalone.orderDetail(String(notif.id)) as any);
      }
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

  const renderItem = ({ item }: { item: UnifiedNotification }) => (
    <TouchableOpacity
      onPress={() => handleOpenNotification(item)}
      className={`bg-dark-100 rounded-2xl px-5 py-4 mb-3 border ${
        item.read ? "border-neutral-100/40" : "border-accent/50"
      }`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-light-100 text-base font-semibold">
            {item.title}
          </Text>
          <Text className="text-light-300 text-sm mt-1">{item.message}</Text>
          <Text className="text-light-400 text-xs mt-2">
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>
        {!item.read && <View className="w-2 h-2 rounded-full bg-accent mt-2" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-primary" style={{ paddingTop: insets.top + 12 }}>
      <View className="px-6 pb-4 border-b border-neutral-100/40">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(Routes.tabs.home as any);
              }
            }}
            className="w-9 h-9 rounded-full bg-dark-200 items-center justify-center"
          >
            <Icons.navigation
              name={IconNames.arrowBack as any}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <Text className="text-light-100 text-lg font-bold flex-1 text-center -ml-9">
            Notifications
          </Text>

          <View className="w-9 h-9" />
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-light-300 text-sm">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </Text>
          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            <Text
              className={`text-sm font-semibold ${
                unreadCount === 0 ? "text-light-400" : "text-accent"
              }`}
            >
              Mark all read
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing && notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#AB8BFF" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 24,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#AB8BFF"
            />
          }
          ListEmptyComponent={() => (
            <View className="items-center justify-center mt-40">
              <Icons.notification
                name={IconNames.notificationsOutline as any}
                size={48}
                color="#9CA4AB"
              />
              <Text className="text-light-400 text-sm mt-4">
                No notifications yet
              </Text>
              <Text className="text-light-500 text-xs mt-1 text-center px-12">
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
