import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { Routes } from "@/services/navigationHelper";
import { getMyOrders, Order } from "@/services/orderApi";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return { bg: "bg-warning/20", text: "text-warning", label: "Pending" };
    case "assigned":
      return { bg: "bg-info/20", text: "text-info", label: "Assigned" };
    case "picked_up":
      return { bg: "bg-accent/20", text: "text-accent", label: "Picked Up" };
    case "delivering":
      return { bg: "bg-accent/20", text: "text-accent", label: "In Transit" };
    case "delivered":
      return { bg: "bg-active/20", text: "text-active", label: "Delivered" };
    case "cancelled":
      return { bg: "bg-danger/20", text: "text-danger", label: "Cancelled" };
    default:
      return { bg: "bg-neutral-100/20", text: "text-light-300", label: status };
  }
};

const formatDate = (date: string | Date) => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function OrdersScreen() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tabBarHeight = 65;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 20;
  const contentBottomPadding = tabBarHeight + bottomPadding + 32;

  const loadOrders = async (showRefreshing = false) => {
    if (!isAuthenticated) return;
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getMyOrders();
      setOrders(data || []);
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load orders",
        text2: e?.response?.data?.error || e?.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated]);

  if (authLoading) {
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadOrders(true)}
          tintColor="#AB8BFF"
        />
      }
    >
      <View className="pt-4 px-6 pb-8">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-1">
            <Text className="text-light-100 text-3xl font-bold mb-1">
              My Orders
            </Text>
            <Text className="text-light-400 text-sm">
              {orders.length} {orders.length === 1 ? "order" : "orders"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push(Routes.standalone.newOrder)}
            className="bg-accent px-4 py-3 rounded-xl items-center justify-center"
          >
            <Icons.action
              name={IconNames.addCircle as any}
              size={24}
              color="#030014"
            />
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && !refreshing ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#AB8BFF" />
            <Text className="text-light-300 mt-4">Loading orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View className="bg-secondary rounded-2xl p-8 items-center border border-neutral-100">
            <View className="bg-accent/10 rounded-full p-6 mb-4">
              <Icons.package
                name={IconNames.packageOutline as any}
                size={64}
                color="#AB8BFF"
              />
            </View>
            <Text className="text-light-100 text-xl font-bold mb-2">
              No orders yet
            </Text>
            <Text className="text-light-400 text-sm text-center mb-6 px-4">
              Start by creating your first delivery request and track it in
              real-time
            </Text>
            <TouchableOpacity
              onPress={() => router.push(Routes.standalone.newOrder)}
              className="bg-accent px-8 py-4 rounded-xl"
            >
              <Text className="text-primary font-bold text-base">
                Create New Order
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Orders List - THIS IS WHERE ALL FETCHED ORDERS ARE DISPLAYED */
          <View>
            {orders.map((order) => {
              const statusInfo = getStatusColor(order.status);
              const orderId = order._id || order.id || "";
              const createdAt = order.createdAt
                ? formatDate(order.createdAt)
                : "";

              return (
                <TouchableOpacity
                  key={orderId}
                  onPress={() =>
                    router.push(Routes.standalone.orderDetail(orderId) as any)
                  }
                  className="bg-secondary rounded-2xl p-5 mb-4 border border-neutral-100 active:opacity-80"
                >
                  {/* Header with Status */}
                  <View className="flex-row items-start justify-between mb-4">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <Icons.package
                          name={MCIconNames.packageVariant as any}
                          size={20}
                          color="#AB8BFF"
                          style={{ marginRight: 8 }}
                        />
                        <Text className="text-light-200 font-semibold text-base">
                          Order #{String(orderId).slice(-6).toUpperCase()}
                        </Text>
                      </View>
                      <Text className="text-light-400 text-xs">
                        {createdAt}
                      </Text>
                    </View>
                    <View
                      className={`${statusInfo.bg} px-3 py-1.5 rounded-full`}
                    >
                      <Text
                        className={`${statusInfo.text} text-xs font-semibold`}
                      >
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  {/* Route Info */}
                  <View className="mb-4">
                    <View className="flex-row items-start mb-2">
                      <View className="bg-accent/20 rounded-full p-1.5 mr-3 mt-0.5">
                        <Icons.map
                          name={IconNames.locationOutline as any}
                          size={12}
                          color="#AB8BFF"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-light-400 text-xs mb-0.5">
                          Pickup
                        </Text>
                        <Text
                          className="text-light-100 text-sm"
                          numberOfLines={2}
                        >
                          {order.pickup?.address || "N/A"}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-start">
                      <View className="bg-active/20 rounded-full p-1.5 mr-3 mt-0.5">
                        <Icons.map
                          name={IconNames.locationOutline as any}
                          size={12}
                          color="#4ADE80"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-light-400 text-xs mb-0.5">
                          Dropoff
                        </Text>
                        <Text
                          className="text-light-100 text-sm"
                          numberOfLines={2}
                        >
                          {order.dropoff?.address || "N/A"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Items & Price */}
                  <View className="flex-row items-center justify-between pt-4 border-t border-neutral-100/50">
                    <View className="flex-1">
                      <Text className="text-light-400 text-xs mb-1">Items</Text>
                      <Text
                        className="text-light-200 text-sm"
                        numberOfLines={1}
                      >
                        {order.items || "No items specified"}
                      </Text>
                    </View>
                    <View className="items-end ml-4">
                      <Text className="text-light-400 text-xs mb-1">Price</Text>
                      <Text className="text-accent font-bold text-lg">
                        ₦{order.price?.toLocaleString() || "0"}
                      </Text>
                    </View>
                  </View>

                  {/* View Details Hint */}
                  <View className="flex-row items-center justify-center mt-4 pt-3 border-t border-neutral-100/30">
                    <Text className="text-accent text-xs font-medium">
                      Tap to view details
                    </Text>
                    <Icons.navigation
                      name={IconNames.arrowForward as any}
                      size={14}
                      color="#AB8BFF"
                      style={{ marginLeft: 6 }}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
      {/* Bottom spacer to prevent content from going under tab bar */}
      <View
        style={{ height: contentBottomPadding, backgroundColor: "#030014" }}
      />
    </ScrollView>
  );
}
