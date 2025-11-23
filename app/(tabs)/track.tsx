import OrderChat from "@/components/OrderChat";
import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Routes } from "@/services/navigationHelper";
import { getMyOrders, Order } from "@/services/orderApi";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
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
      return { bg: "bg-neutral-100/20", text: "text-gray-600", label: status };
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

export default function TrackScreen() {
  const { isLoading: authLoading, isAuthenticated, user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  const tabBarHeight = 65;

  // Icon animations for statistics cards
  const icon1Anim = useRef(new Animated.Value(1)).current;
  const icon2Anim = useRef(new Animated.Value(1)).current;
  const icon3Anim = useRef(new Animated.Value(1)).current;

  const loadOrders = useCallback(
    async (showRefreshing = false, search: string = "") => {
      if (!isAuthenticated) return;
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await getMyOrders(1, 50, search);
        const allOrders = response.orders || [];

        // Filter active orders (assigned, picked_up, delivering)
        const active = allOrders.filter(
          (order: Order) =>
            order.riderId &&
            ["assigned", "picked_up", "delivering"].includes(order.status)
        );
        setActiveOrders(active);

        // Get recent completed/delivered orders (last 5)
        const recent = allOrders
          .filter((order: Order) => order.status === "delivered")
          .slice(0, 5);
        setRecentOrders(recent);
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
    },
    [isAuthenticated]
  );

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders(false, searchQuery.trim());
      const interval = setInterval(
        () => loadOrders(false, searchQuery.trim()),
        30000
      ); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadOrders, searchQuery]);

  // Handle search with debouncing - improved
  useEffect(() => {
    if (!isAuthenticated) return;

    const trimmedQuery = searchQuery.trim();
    const timer = setTimeout(() => {
      loadOrders(false, trimmedQuery);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery, isAuthenticated, loadOrders]);

  // Icon animations after page loads
  useEffect(() => {
    if (
      isAuthenticated &&
      (activeOrders.length > 0 || recentOrders.length > 0)
    ) {
      const createPulseAnimation = (
        animValue: Animated.Value,
        delay: number
      ) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1.15,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const anim1 = createPulseAnimation(icon1Anim, 0);
      const anim2 = createPulseAnimation(icon2Anim, 200);
      const anim3 = createPulseAnimation(icon3Anim, 400);

      anim1.start();
      anim2.start();
      anim3.start();

      return () => {
        anim1.stop();
        anim2.stop();
        anim3.stop();
      };
    }
  }, [isAuthenticated, activeOrders.length, recentOrders.length]);

  if (authLoading) {
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

  // Filter orders based on search
  const filteredActiveOrders = React.useMemo(() => {
    if (!searchQuery.trim()) return activeOrders;
    const query = searchQuery.toLowerCase();
    return activeOrders.filter(
      (order) =>
        order.items?.toLowerCase().includes(query) ||
        order.pickup?.address?.toLowerCase().includes(query) ||
        order.dropoff?.address?.toLowerCase().includes(query) ||
        order._id?.toLowerCase().includes(query)
    );
  }, [activeOrders, searchQuery]);

  const filteredRecentOrders = React.useMemo(() => {
    if (!searchQuery.trim()) return recentOrders;
    const query = searchQuery.toLowerCase();
    return recentOrders.filter(
      (order) =>
        order.items?.toLowerCase().includes(query) ||
        order.pickup?.address?.toLowerCase().includes(query) ||
        order.dropoff?.address?.toLowerCase().includes(query) ||
        order._id?.toLowerCase().includes(query)
    );
  }, [recentOrders, searchQuery]);

  const statistics = React.useMemo(() => {
    const total = activeOrders.length;
    const inTransit = activeOrders.filter(
      (o) => o.status === "delivering"
    ).length;
    const completed = recentOrders.length;
    const assigned = activeOrders.filter((o) => o.status === "assigned").length;
    const pickedUp = activeOrders.filter(
      (o) => o.status === "picked_up"
    ).length;
    return { total, inTransit, completed, assigned, pickedUp };
  }, [activeOrders, recentOrders]);

  return (
    <>
      {/* Fixed Header Section */}
      <View
        className={`absolute top-0 left-0 right-0 z-50 ${
          isDark ? "bg-primary" : "bg-white"
        }`}
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 16,
          paddingHorizontal: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.15 : 0.08,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        {/* Modern Header with Icon */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1">
            <View
              className={`rounded-xl p-2.5 mr-3 ${
                isDark ? "bg-accent/20" : "bg-blue-900/20"
              }`}
            >
              <Icons.map
                name={IconNames.mapOutline as any}
                size={22}
                color={isDark ? "#AB8BFF" : "#1E3A8A"}
              />
            </View>
            <View className="flex-1">
              <Text
                className={`text-xl font-bold mb-0.5 ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Track Deliveries
              </Text>
              <Text
                className={`text-xs ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                {statistics.total}{" "}
                {statistics.total === 1
                  ? "active delivery"
                  : "active deliveries"}
              </Text>
            </View>
          </View>
          {statistics.total > 0 && (
            <View
              className={`rounded-full px-3 py-1.5 border ${
                isDark
                  ? "bg-accent/20 border-accent/30"
                  : "bg-blue-900/20 border-blue-900/30"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isDark ? "text-accent" : "text-blue-900"
                }`}
              >
                {statistics.total}
              </Text>
            </View>
          )}
        </View>

        {/* Statistics Cards - OPay Style with Animated Icons */}
        {isAuthenticated &&
          (activeOrders.length > 0 || recentOrders.length > 0) && (
            <View className="flex-row gap-2.5 mb-4">
              <View
                className={`flex-1 rounded-2xl p-4 ${
                  isDark ? "bg-secondary" : "bg-white"
                }`}
                style={{
                  aspectRatio: 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.1 : 0.05,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <View className="items-center justify-center flex-1">
                  <Animated.View
                    style={{
                      transform: [{ scale: icon1Anim }],
                    }}
                  >
                    <View
                      className={`rounded-2xl p-2.5 mb-2 ${
                        isDark ? "bg-accent/10" : "bg-blue-900/10"
                      }`}
                    >
                      <Icons.package
                        name={MCIconNames.packageVariant as any}
                        size={22}
                        color={isDark ? "#AB8BFF" : "#1E3A8A"}
                      />
                    </View>
                  </Animated.View>
                  <Text
                    className={`text-xs font-medium mb-1.5 ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Active
                  </Text>
                  <Text
                    className={`text-2xl font-bold ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    {statistics.total}
                  </Text>
                </View>
              </View>
              <View
                className={`flex-1 rounded-2xl p-4 ${
                  isDark ? "bg-secondary" : "bg-white"
                }`}
                style={{
                  aspectRatio: 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.1 : 0.05,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <View className="items-center justify-center flex-1">
                  <Animated.View
                    style={{
                      transform: [{ scale: icon2Anim }],
                    }}
                  >
                    <View className="bg-info/10 rounded-2xl p-2.5 mb-2">
                      <Icons.map
                        name={IconNames.navigateOutline as any}
                        size={22}
                        color="#5AC8FA"
                      />
                    </View>
                  </Animated.View>
                  <Text
                    className={`text-xs font-medium mb-1.5 ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    In Transit
                  </Text>
                  <Text
                    className={`text-2xl font-bold ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    {statistics.inTransit}
                  </Text>
                </View>
              </View>
              <View
                className={`flex-1 rounded-2xl p-4 ${
                  isDark ? "bg-secondary" : "bg-white"
                }`}
                style={{
                  aspectRatio: 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.1 : 0.05,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <View className="items-center justify-center flex-1">
                  <Animated.View
                    style={{
                      transform: [{ scale: icon3Anim }],
                    }}
                  >
                    <View className="bg-active/10 rounded-2xl p-2.5 mb-2">
                      <Icons.status
                        name={IconNames.checkmarkCircle as any}
                        size={22}
                        color="#30D158"
                      />
                    </View>
                  </Animated.View>
                  <Text
                    className={`text-xs font-medium mb-1.5 ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Recent
                  </Text>
                  <Text
                    className={`text-2xl font-bold ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    {statistics.completed}
                  </Text>
                </View>
              </View>
            </View>
          )}

        {/* Search Bar */}
        {(activeOrders.length > 0 || recentOrders.length > 0) && (
          <Reanimated.View entering={FadeInDown.delay(100).duration(400)}>
            <View
              className={`rounded-2xl p-3 mb-4 border flex-row items-center ${
                isDark
                  ? "bg-secondary border-neutral-100"
                  : "bg-white border-gray-200"
              }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Icons.search
                name={IconNames.searchOutline as any}
                size={20}
                color="#9CA4AB"
                style={{ marginRight: 10 }}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by items, address, or order ID..."
                placeholderTextColor="#9CA4AB"
                className={`flex-1 text-sm ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    loadOrders(false, "");
                  }}
                >
                  <Icons.action
                    name={IconNames.closeCircle as any}
                    size={20}
                    color="#9CA4AB"
                  />
                </TouchableOpacity>
              )}
            </View>
          </Reanimated.View>
        )}
      </View>

      <ScrollView
        className={`flex-1 ${isDark ? "bg-primary" : "bg-gray-50"}`}
        contentContainerStyle={{
          paddingTop: insets.top + 280,
          paddingBottom: tabBarHeight + insets.bottom + 40,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadOrders(true, searchQuery)}
            tintColor={isDark ? "#AB8BFF" : "#1E3A8A"}
          />
        }
      >
        <View>
          {/* Active Deliveries Section */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View
                  className={`rounded-xl p-2.5 mr-3 ${
                    isDark ? "bg-info/20" : "bg-blue-900/20"
                  }`}
                >
                  <Icons.package
                    name={MCIconNames.packageVariant as any}
                    size={20}
                    color="#5AC8FA"
                  />
                </View>
                <Text
                  className={`text-lg font-bold ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Active Deliveries
                </Text>
              </View>
              {filteredActiveOrders.length > 0 && (
                <View
                  className={`rounded-full px-3 py-1 border ${
                    isDark
                      ? "bg-info/20 border-info/30"
                      : "bg-blue-900/20 border-blue-900/30"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isDark ? "text-info" : "text-blue-900"
                    }`}
                  >
                    {filteredActiveOrders.length}
                  </Text>
                </View>
              )}
            </View>

            {loading ? (
              <View
                className={`rounded-3xl p-8 border items-center ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
              >
                <ActivityIndicator size="large" color="#AB8BFF" />
              </View>
            ) : searchQuery.trim() && filteredActiveOrders.length === 0 ? (
              <View
                className={`rounded-3xl p-10 border items-center ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View
                  className={`rounded-full p-6 mb-4 ${
                    isDark ? "bg-dark-100" : "bg-gray-100"
                  }`}
                >
                  <Icons.search
                    name={IconNames.searchOutline as any}
                    size={48}
                    color="#9CA4AB"
                  />
                </View>
                <Text
                  className={`text-lg font-bold mb-2 ${
                    isDark ? "text-light-200" : "text-black"
                  }`}
                >
                  No active deliveries found
                </Text>
                <Text
                  className={`text-sm text-center ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Try adjusting your search terms
                </Text>
              </View>
            ) : filteredActiveOrders.length > 0 ? (
              <View className="gap-4">
                {filteredActiveOrders.map((order, index) => {
                  const statusInfo = getStatusColor(order.status);
                  const orderId = order._id || order.id || "";
                  const createdAt = order.createdAt
                    ? formatDate(order.createdAt)
                    : "";

                  return (
                    <Reanimated.View
                      key={orderId}
                      entering={FadeInDown.delay(index * 100).duration(400)}
                    >
                      <TouchableOpacity
                        onPress={() =>
                          router.push(
                            Routes.standalone.orderDetail(orderId) as any
                          )
                        }
                        className={`rounded-3xl p-5 border active:opacity-80 ${
                          isDark
                            ? "bg-secondary border-neutral-100"
                            : "bg-white border-gray-200"
                        }`}
                        style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.15,
                          shadowRadius: 12,
                          elevation: 6,
                        }}
                      >
                        {/* Header with Status */}
                        <View className="flex-row items-start justify-between mb-4">
                          <View className="flex-1 mr-3">
                            <View className="flex-row items-center mb-2">
                              <View
                                className={`rounded-lg p-1.5 mr-2 ${
                                  isDark ? "bg-accent/20" : "bg-blue-900/20"
                                }`}
                              >
                                <Icons.package
                                  name={MCIconNames.packageVariant as any}
                                  size={16}
                                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                                />
                              </View>
                              <Text
                                className={`font-bold text-base ${
                                  isDark ? "text-light-100" : "text-black"
                                }`}
                              >
                                Order #{String(orderId).slice(-6).toUpperCase()}
                              </Text>
                            </View>
                            <View className="flex-row items-center">
                              <Icons.time
                                name={IconNames.timeOutline as any}
                                size={12}
                                color={isDark ? "#9CA4AB" : "#6E6E73"}
                                style={{ marginRight: 6 }}
                              />
                              <Text
                                className={`text-xs ${
                                  isDark ? "text-light-400" : "text-gray-500"
                                }`}
                              >
                                {createdAt}
                              </Text>
                            </View>
                          </View>
                          <View
                            className={`${
                              statusInfo.bg
                            } px-3 py-2 rounded-xl border ${
                              order.status === "assigned"
                                ? "border-info/30"
                                : order.status === "picked_up" ||
                                  order.status === "delivering"
                                ? "border-accent/30"
                                : "border-neutral-100/30"
                            }`}
                          >
                            <Text
                              className={`${statusInfo.text} text-xs font-bold`}
                            >
                              {statusInfo.label}
                            </Text>
                          </View>
                        </View>

                        {/* Route Info */}
                        <View className="mb-4">
                          <View className="flex-row items-start mb-3">
                            <View className="bg-info/20 rounded-xl p-2 mr-3">
                              <Icons.location
                                name={IconNames.locationOutline as any}
                                size={14}
                                color="#5AC8FA"
                              />
                            </View>
                            <View className="flex-1">
                              <Text
                                className={`text-xs mb-1 font-medium ${
                                  isDark ? "text-light-400" : "text-gray-500"
                                }`}
                              >
                                Pickup Location
                              </Text>
                              <Text
                                className={`text-sm ${
                                  isDark ? "text-light-100" : "text-black"
                                }`}
                                numberOfLines={2}
                              >
                                {order.pickup?.address || "N/A"}
                              </Text>
                            </View>
                          </View>
                          <View className="flex-row items-start mb-2">
                            <View className="bg-warning/20 rounded-xl p-2 mr-3">
                              <Icons.location
                                name={IconNames.locationOutline as any}
                                size={14}
                                color="#FF9500"
                              />
                            </View>
                            <View className="flex-1">
                              <Text
                                className={`text-xs mb-1 font-medium ${
                                  isDark ? "text-light-400" : "text-gray-500"
                                }`}
                              >
                                Dropoff Location
                              </Text>
                              <Text
                                className={`text-sm ${
                                  isDark ? "text-light-100" : "text-black"
                                }`}
                                numberOfLines={2}
                              >
                                {order.dropoff?.address || "N/A"}
                              </Text>
                            </View>
                          </View>
                          {/* Distance and Rider Info */}
                          {(order.distanceKm ||
                            order.meta?.distanceKm ||
                            order.riderId) && (
                            <View
                              className={`flex-row items-center gap-3 mt-2 pt-2 border-t ${
                                isDark
                                  ? "border-neutral-100/30"
                                  : "border-gray-200"
                              }`}
                            >
                              {order.distanceKm || order.meta?.distanceKm ? (
                                <View className="flex-row items-center">
                                  <Icons.map
                                    name={IconNames.navigateOutline as any}
                                    size={12}
                                    color="#5AC8FA"
                                    style={{ marginRight: 4 }}
                                  />
                                  <Text
                                    className={`text-xs ${
                                      isDark
                                        ? "text-light-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {(
                                      order.distanceKm || order.meta?.distanceKm
                                    )?.toFixed(1)}{" "}
                                    km
                                  </Text>
                                </View>
                              ) : null}
                              {order.riderId && (
                                <View className="flex-row items-center">
                                  <Icons.user
                                    name={IconNames.personOutline as any}
                                    size={12}
                                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                                    style={{ marginRight: 4 }}
                                  />
                                  <Text
                                    className={`text-xs ${
                                      isDark
                                        ? "text-light-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    Rider Assigned
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>

                        {/* Items & Price */}
                        <View className="flex-row items-center justify-between pt-4 border-t border-neutral-100/50">
                          <View className="flex-1">
                            <View className="flex-row items-center mb-1">
                              <Icons.package
                                name={IconNames.boxOutline as any}
                                size={14}
                                color="#D6C6FF"
                                style={{ marginRight: 6 }}
                              />
                              <Text
                                className={`text-xs ${
                                  isDark ? "text-light-400" : "text-gray-500"
                                }`}
                              >
                                Items
                              </Text>
                            </View>
                            <Text
                              className={`text-sm font-medium ${
                                isDark ? "text-light-200" : "text-black"
                              }`}
                              numberOfLines={1}
                            >
                              {order.items || "No items specified"}
                            </Text>
                          </View>
                          <View className="items-end ml-4">
                            <View className="flex-row items-center mb-1">
                              <Icons.money
                                name={MCIconNames.cash as any}
                                size={14}
                                color="#30D158"
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                className={`text-xs ${
                                  isDark ? "text-light-400" : "text-gray-500"
                                }`}
                              >
                                Price
                              </Text>
                            </View>
                            <Text
                              className={`font-bold text-xl ${
                                isDark ? "text-accent" : "text-blue-900"
                              }`}
                            >
                              ₦{order.price?.toLocaleString() || "0"}
                            </Text>
                          </View>
                        </View>

                        {/* Action Buttons */}
                        <View className="flex-row items-center gap-3 mt-4 pt-4 border-t border-neutral-100/30">
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              router.push(
                                Routes.standalone.orderDetail(orderId) as any
                              );
                            }}
                            className={`flex-1 border rounded-xl py-2.5 px-4 flex-row items-center justify-center active:opacity-80 ${
                              isDark
                                ? "bg-secondary border-neutral-100"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <Icons.info
                              name={IconNames.informationOutline as any}
                              size={16}
                              color="#5AC8FA"
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              className={`text-xs font-semibold ${
                                isDark ? "text-light-100" : "text-black"
                              }`}
                            >
                              Details
                            </Text>
                          </TouchableOpacity>
                          {(order.riderId || user?.role === "rider") && (
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                setChatOrderId(orderId);
                                setShowChat(true);
                              }}
                              className="flex-1 rounded-xl py-2.5 px-4 flex-row items-center justify-center active:opacity-80"
                              style={{
                                backgroundColor: isDark ? "#AB8BFF" : "#1E3A8A",
                                shadowColor: isDark ? "#AB8BFF" : "#1E3A8A",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 4,
                              }}
                            >
                              <Icons.communication
                                name={IconNames.chatbubbleOutline as any}
                                size={16}
                                color={isDark ? "#030014" : "#FFFFFF"}
                                style={{ marginRight: 6 }}
                              />
                              <Text
                                className={`text-xs font-bold ${
                                  isDark ? "text-primary" : "text-white"
                                }`}
                              >
                                Chat
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </TouchableOpacity>
                    </Reanimated.View>
                  );
                })}
              </View>
            ) : (
              <View
                className={`rounded-3xl p-8 border items-center ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
              >
                <View
                  className={`rounded-full p-5 mb-4 ${
                    isDark ? "bg-dark-100" : "bg-gray-100"
                  }`}
                >
                  <Icons.delivery
                    name={MCIconNames.delivery as any}
                    size={40}
                    color={isDark ? "#9CA4AB" : "#6E6E73"}
                  />
                </View>
                <Text
                  className={`text-lg font-bold mb-2 ${
                    isDark ? "text-light-200" : "text-black"
                  }`}
                >
                  No active deliveries
                </Text>
                <Text
                  className={`text-sm text-center ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Your active delivery orders will appear here for real-time
                  tracking
                </Text>
              </View>
            )}
          </View>

          {/* Recent Deliveries Section */}
          {isAuthenticated && recentOrders.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <View
                    className={`rounded-xl p-2.5 mr-3 ${
                      isDark ? "bg-active/20" : "bg-green-900/20"
                    }`}
                  >
                    <Icons.status
                      name={IconNames.checkmarkCircle as any}
                      size={20}
                      color="#30D158"
                    />
                  </View>
                  <Text
                    className={`text-lg font-bold ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    Recent Deliveries
                  </Text>
                </View>
                {filteredRecentOrders.length > 0 && (
                  <View
                    className={`rounded-full px-3 py-1 border ${
                      isDark
                        ? "bg-active/20 border-active/30"
                        : "bg-green-900/20 border-green-900/30"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isDark ? "text-active" : "text-green-900"
                      }`}
                    >
                      {filteredRecentOrders.length}
                    </Text>
                  </View>
                )}
              </View>
              {searchQuery.trim() && filteredRecentOrders.length === 0 ? (
                <View
                  className={`rounded-3xl p-8 border items-center ${
                    isDark
                      ? "bg-secondary border-neutral-100"
                      : "bg-white border-gray-200"
                  }`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <View
                    className={`rounded-full p-5 mb-4 ${
                      isDark ? "bg-dark-100" : "bg-gray-100"
                    }`}
                  >
                    <Icons.search
                      name={IconNames.searchOutline as any}
                      size={40}
                      color="#9CA4AB"
                    />
                  </View>
                  <Text
                    className={`text-base font-bold mb-2 ${
                      isDark ? "text-light-200" : "text-black"
                    }`}
                  >
                    No recent deliveries found
                  </Text>
                  <Text
                    className={`text-xs text-center ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Try adjusting your search terms
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {filteredRecentOrders.map((order, index) => {
                    const orderId = order._id || order.id || "";
                    const createdAt = order.createdAt
                      ? formatDate(order.createdAt)
                      : "";

                    return (
                      <Reanimated.View
                        key={orderId}
                        entering={FadeInDown.delay(index * 100).duration(400)}
                      >
                        <TouchableOpacity
                          onPress={() =>
                            router.push(
                              Routes.standalone.orderDetail(orderId) as any
                            )
                          }
                          className={`rounded-2xl p-4 border active:opacity-80 ${
                            isDark
                              ? "bg-secondary border-neutral-100"
                              : "bg-white border-gray-200"
                          }`}
                          style={{
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isDark ? 0.1 : 0.05,
                            shadowRadius: 4,
                            elevation: 2,
                          }}
                        >
                          <View className="flex-row items-center justify-between">
                            <View className="flex-1 mr-3">
                              <View className="flex-row items-center mb-1">
                                <View
                                  className={`rounded-lg p-1 mr-2 ${
                                    isDark ? "bg-accent/20" : "bg-blue-900/20"
                                  }`}
                                >
                                  <Icons.package
                                    name={MCIconNames.packageVariant as any}
                                    size={12}
                                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                                  />
                                </View>
                                <Text
                                  className={`font-semibold text-sm flex-1 ${
                                    isDark ? "text-light-100" : "text-black"
                                  }`}
                                  numberOfLines={1}
                                >
                                  {order.items || "No items specified"}
                                </Text>
                              </View>
                              <View className="flex-row items-center mb-1">
                                <Icons.time
                                  name={IconNames.timeOutline as any}
                                  size={12}
                                  color={isDark ? "#9CA4AB" : "#6E6E73"}
                                  style={{ marginRight: 4 }}
                                />
                                <Text
                                  className={`text-xs ${
                                    isDark ? "text-light-400" : "text-gray-500"
                                  }`}
                                >
                                  {createdAt}
                                </Text>
                              </View>
                              {order.price && (
                                <Text
                                  className={`text-xs font-medium mt-1 ${
                                    isDark ? "text-light-300" : "text-gray-600"
                                  }`}
                                >
                                  ₦{order.price.toLocaleString()}
                                </Text>
                              )}
                            </View>
                            <View
                              className={`rounded-lg px-2.5 py-1.5 border ${
                                isDark
                                  ? "bg-active/20 border-active/30"
                                  : "bg-green-900/20 border-green-900/30"
                              }`}
                            >
                              <Text
                                className={`text-xs font-bold ${
                                  isDark ? "text-active" : "text-green-900"
                                }`}
                              >
                                Delivered
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </Reanimated.View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Chat Modal */}
      {chatOrderId && (
        <OrderChat
          orderId={chatOrderId || ""}
          visible={showChat}
          onClose={() => {
            setShowChat(false);
            setChatOrderId(null);
          }}
        />
      )}
    </>
  );
}
