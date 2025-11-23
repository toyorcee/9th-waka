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
  Modal,
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

const getStatusColor = (status: string, isDark: boolean) => {
  switch (status) {
    case "pending":
      return {
        bg: isDark ? "bg-warning/20" : "bg-yellow-100",
        text: isDark ? "text-warning" : "text-yellow-700",
        border: isDark ? "border-warning/30" : "border-yellow-300",
        label: "Pending",
      };
    case "assigned":
      return {
        bg: isDark ? "bg-info/20" : "bg-blue-100",
        text: isDark ? "text-info" : "text-blue-700",
        border: isDark ? "border-info/30" : "border-blue-300",
        label: "Assigned",
      };
    case "picked_up":
      return {
        bg: isDark ? "bg-accent/20" : "bg-purple-100",
        text: isDark ? "text-accent" : "text-purple-700",
        border: isDark ? "border-accent/30" : "border-purple-300",
        label: "Picked Up",
      };
    case "delivering":
      return {
        bg: isDark ? "bg-accent/20" : "bg-purple-100",
        text: isDark ? "text-accent" : "text-purple-700",
        border: isDark ? "border-accent/30" : "border-purple-300",
        label: "In Transit",
      };
    case "delivered":
      return {
        bg: isDark ? "bg-active/20" : "bg-green-100",
        text: isDark ? "text-active" : "text-green-700",
        border: isDark ? "border-active/30" : "border-green-300",
        label: "Delivered",
      };
    case "cancelled":
      return {
        bg: isDark ? "bg-danger/20" : "bg-red-100",
        text: isDark ? "text-danger" : "text-red-700",
        border: isDark ? "border-danger/30" : "border-red-300",
        label: "Cancelled",
      };
    default:
      return {
        bg: isDark ? "bg-neutral-100/20" : "bg-gray-100",
        text: isDark ? "text-light-300" : "text-gray-700",
        border: isDark ? "border-neutral-100/30" : "border-gray-300",
        label: status,
      };
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

type FilterType = "all" | "pending" | "active" | "completed" | "cancelled";

export default function OrdersScreen() {
  const { isLoading: authLoading, isAuthenticated, user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [pagination, setPagination] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  const tabBarHeight = 65;

  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;
  const hasAnimatedRef = useRef(false);

  const [showPromoModal, setShowPromoModal] = useState(false);

  const starRotateAnim = useRef(new Animated.Value(0)).current;
  const starShineAnim = useRef(new Animated.Value(1)).current;

  const loadOrders = useCallback(
    async (showRefreshing = false, page: number = 1, search: string = "") => {
      if (!isAuthenticated) return;
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await getMyOrders(page, pageSize, search);
        setOrders(response.orders || []);
        setPagination(
          response.pagination || {
            page: 1,
            limit: pageSize,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          }
        );
        setCurrentPage(page);
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
    [isAuthenticated, pageSize]
  );

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders(false, 1, ""); // Load first page on mount
    }
  }, [isAuthenticated, loadOrders]);

  // Animate summary cards on mount (first time only)
  useEffect(() => {
    if (!hasAnimatedRef.current && isAuthenticated) {
      hasAnimatedRef.current = true;
      // Animate cards with staggered delay
      Animated.parallel([
        Animated.timing(card1Anim, {
          toValue: 1,
          duration: 600,
          delay: 100,
          useNativeDriver: true,
        }),
        Animated.timing(card2Anim, {
          toValue: 1,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(card3Anim, {
          toValue: 1,
          duration: 600,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Set to final state immediately if already animated or not authenticated
      card1Anim.setValue(1);
      card2Anim.setValue(1);
      card3Anim.setValue(1);
    }
  }, [isAuthenticated]);

  // Promo star rotation and shine animation
  useEffect(() => {
    const timer = setTimeout(() => {
      // Rotation animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(starRotateAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(starRotateAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Shine animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(starShineAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(starShineAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 3000);

    return () => {
      clearTimeout(timer);
      starRotateAnim.stopAnimation();
      starShineAnim.stopAnimation();
    };
  }, []);

  // Handle search with debouncing
  useEffect(() => {
    if (!isAuthenticated) return;

    // Clear existing timer
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on search
      loadOrders(false, 1, searchQuery);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery, isAuthenticated, loadOrders]);

  // Handle page changes
  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= pagination.totalPages) {
        loadOrders(false, newPage, searchQuery);
      }
    },
    [pagination.totalPages, loadOrders, searchQuery]
  );

  // Handle filter changes - reset to page 1
  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setCurrentPage(1);
    // Note: Filtering is done client-side after fetching
  };

  // Filter orders client-side (for status filters)
  const filteredOrders = React.useMemo(() => {
    let filtered = orders;

    // Apply status filter (client-side for instant filtering)
    if (filter === "pending") {
      filtered = filtered.filter(
        (order) => order.status === "pending" && !order.riderId
      );
    } else if (filter === "active") {
      filtered = filtered.filter(
        (order) =>
          !["delivered", "cancelled"].includes(order.status) && order.riderId
      );
    } else if (filter === "completed") {
      filtered = filtered.filter((order) => order.status === "delivered");
    } else if (filter === "cancelled") {
      filtered = filtered.filter((order) => order.status === "cancelled");
    }

    // Note: Search is handled server-side, so no client-side search filtering needed
    return filtered;
  }, [orders, filter]);

  // Calculate statistics - need to fetch all orders for accurate stats
  // For now, we'll show stats based on current page, but ideally we'd have a separate stats endpoint
  const statistics = React.useMemo(() => {
    // Note: These stats are based on current page only
    // For accurate stats, we'd need a separate API call or load all orders
    const total = pagination.total; // Use total from pagination
    const pending = orders.filter(
      (order) => order.status === "pending" && !order.riderId
    ).length;
    const active = orders.filter(
      (order) =>
        !["delivered", "cancelled"].includes(order.status) && order.riderId
    ).length;
    const completed = orders.filter(
      (order) => order.status === "delivered"
    ).length;
    const cancelled = orders.filter(
      (order) => order.status === "cancelled"
    ).length;
    const totalSpent = orders
      .filter((order) => order.status === "delivered")
      .reduce((sum, order) => sum + (order.price || 0), 0);

    return { total, pending, active, completed, cancelled, totalSpent };
  }, [orders, pagination.total]);

  if (authLoading) {
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
    <>
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
          shadowOpacity: isDark ? 0.1 : 0.05,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        {/* Modern Header with Icon - Fixed */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View
              className={`rounded-xl p-2.5 mr-3 ${
                isDark ? "bg-accent/20" : "bg-blue-900/20"
              }`}
            >
              <Icons.package
                name={MCIconNames.packageVariant as any}
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
                My Orders
              </Text>
              <Text
                className={`text-xs ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                {statistics.total} {statistics.total === 1 ? "order" : "orders"}{" "}
                total
              </Text>
            </View>
          </View>
          <View className="flex-row items-end gap-3">
            <View className="items-center">
              <TouchableOpacity
                onPress={() => setShowPromoModal(true)}
                className={`rounded-xl p-2 items-center justify-center ${
                  isDark ? "bg-accent/20" : "bg-blue-50"
                }`}
              >
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: starRotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "360deg"],
                        }),
                      },
                      {
                        scale: starShineAnim,
                      },
                    ],
                  }}
                >
                  <Icons.status
                    name={IconNames.star as any}
                    size={18}
                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                  />
                </Animated.View>
              </TouchableOpacity>
              <Text
                className={`text-[10px] mt-1 font-medium ${
                  isDark ? "text-light-400" : "text-gray-600"
                }`}
              >
                Promo
              </Text>
            </View>
            <View className="items-center">
              <TouchableOpacity
                onPress={() => router.push(Routes.standalone.newOrder)}
                className={`rounded-xl p-2 items-center justify-center ${
                  isDark ? "bg-accent" : "bg-blue-500"
                }`}
                style={
                  isDark
                    ? {
                        shadowColor: "#AB8BFF",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                      }
                    : {}
                }
              >
                <Icons.action
                  name={IconNames.addCircle as any}
                  size={18}
                  color={isDark ? "#030014" : "#FFFFFF"}
                />
              </TouchableOpacity>
              <Text
                className={`text-[10px] mt-1 font-medium ${
                  isDark ? "text-light-400" : "text-gray-600"
                }`}
              >
                New Order
              </Text>
            </View>
          </View>
        </View>
      </View>
      <ScrollView
        className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
        contentContainerStyle={{
          paddingTop: insets.top + 90,
          paddingBottom: tabBarHeight + insets.bottom + 40,
          paddingHorizontal: 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadOrders(true, currentPage, searchQuery)}
            tintColor={isDark ? "#AB8BFF" : "#1E3A8A"}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View>
          {/* Statistics Cards - OPay Style with Parent Background */}
          {orders.length > 0 && (
            <View
              className={`rounded-3xl p-4 mb-6 ${
                isDark ? "bg-secondary" : "bg-white"
              }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.1 : 0.05,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <View className="flex-row gap-2.5">
                <Animated.View
                  className="flex-1"
                  style={{
                    aspectRatio: 1,
                    opacity: card1Anim,
                    transform: [
                      {
                        translateY: card1Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <View
                    className={`rounded-2xl p-4 items-center justify-center flex-1 ${
                      isDark ? "bg-dark-100" : "bg-blue-50"
                    }`}
                  >
                    <View
                      className={`rounded-xl p-2.5 mb-2 ${
                        isDark ? "bg-info/20" : "bg-blue-100"
                      }`}
                    >
                      <Icons.package
                        name={MCIconNames.packageVariant as any}
                        size={22}
                        color={isDark ? "#5AC8FA" : "#1E3A8A"}
                      />
                    </View>
                    <Text
                      className={`text-xs font-medium mb-1.5 ${
                        isDark ? "text-light-400" : "text-gray-600"
                      }`}
                    >
                      Total
                    </Text>
                    <Text
                      className={`text-2xl font-bold ${
                        isDark ? "text-light-100" : "text-gray-900"
                      }`}
                    >
                      {statistics.total}
                    </Text>
                  </View>
                </Animated.View>
                <Animated.View
                  className="flex-1"
                  style={{
                    aspectRatio: 1,
                    opacity: card2Anim,
                    transform: [
                      {
                        translateY: card2Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <View
                    className={`rounded-2xl p-4 items-center justify-center flex-1 ${
                      isDark ? "bg-dark-100" : "bg-green-50"
                    }`}
                  >
                    <View
                      className={`rounded-xl p-2.5 mb-2 ${
                        isDark ? "bg-active/20" : "bg-green-100"
                      }`}
                    >
                      <Icons.status
                        name={IconNames.checkmarkCircle as any}
                        size={22}
                        color={isDark ? "#30D158" : "#059669"}
                      />
                    </View>
                    <Text
                      className={`text-xs font-medium mb-1.5 ${
                        isDark ? "text-light-400" : "text-gray-600"
                      }`}
                    >
                      Completed
                    </Text>
                    <Text
                      className={`text-2xl font-bold ${
                        isDark ? "text-light-100" : "text-gray-900"
                      }`}
                    >
                      {statistics.completed}
                    </Text>
                  </View>
                </Animated.View>
                <Animated.View
                  className="flex-1"
                  style={{
                    aspectRatio: 1,
                    opacity: card3Anim,
                    transform: [
                      {
                        translateY: card3Anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <View
                    className={`rounded-2xl p-4 items-center justify-center flex-1 ${
                      isDark ? "bg-dark-100" : "bg-purple-50"
                    }`}
                  >
                    <View
                      className={`rounded-xl p-2.5 mb-2 ${
                        isDark ? "bg-accent/20" : "bg-purple-100"
                      }`}
                    >
                      <Icons.money
                        name={MCIconNames.cash as any}
                        size={22}
                        color={isDark ? "#AB8BFF" : "#7C3AED"}
                      />
                    </View>
                    <Text
                      className={`text-xs font-medium mb-1.5 ${
                        isDark ? "text-light-400" : "text-gray-600"
                      }`}
                    >
                      Spent
                    </Text>
                    <Text
                      className={`text-lg font-bold ${
                        isDark ? "text-light-100" : "text-gray-900"
                      }`}
                    >
                      ₦{statistics.totalSpent.toLocaleString()}
                    </Text>
                  </View>
                </Animated.View>
              </View>
            </View>
          )}

          {/* Search Bar */}
          {orders.length > 0 && (
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
                onChangeText={(text) => {
                  setSearchQuery(text);
                  // Debouncing is handled in useEffect
                }}
                placeholder="Search orders by items, address, or ID..."
                placeholderTextColor="#9CA4AB"
                className={`flex-1 text-sm ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                    loadOrders(false, 1, "");
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
          )}

          {/* Status Filters */}
          {orders.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              contentContainerStyle={{ gap: 8 }}
              nestedScrollEnabled={true}
            >
              {(
                [
                  { key: "all", label: "All", icon: IconNames.menuOutline },
                  {
                    key: "pending",
                    label: "Pending",
                    icon: IconNames.timeOutline,
                  },
                  {
                    key: "active",
                    label: "Active",
                    icon: IconNames.navigateOutline,
                  },
                  {
                    key: "completed",
                    label: "Completed",
                    icon: IconNames.checkmarkCircle,
                  },
                  {
                    key: "cancelled",
                    label: "Cancelled",
                    icon: IconNames.closeCircle,
                  },
                ] as const
              ).map((filterOption) => (
                <TouchableOpacity
                  key={filterOption.key}
                  onPress={() =>
                    handleFilterChange(filterOption.key as FilterType)
                  }
                  className={`rounded-xl py-2.5 px-4 items-center border ${
                    filter === filterOption.key
                      ? isDark
                        ? "bg-accent border-accent/30"
                        : "border-blue-800"
                      : isDark
                      ? "bg-dark-100 border-neutral-100"
                      : "bg-gray-100 border-gray-200"
                  }`}
                  style={[
                    filter === filterOption.key && !isDark
                      ? { backgroundColor: "#1E3A8A" }
                      : undefined,
                    { minWidth: 90 },
                  ]}
                >
                  <Icons.status
                    name={filterOption.icon as any}
                    size={16}
                    color={
                      filter === filterOption.key
                        ? isDark
                          ? "#030014"
                          : "#FFFFFF"
                        : "#9CA4AB"
                    }
                    style={{ marginBottom: 4 }}
                  />
                  <Text
                    className={`text-xs font-semibold ${
                      filter === filterOption.key
                        ? isDark
                          ? "text-primary"
                          : "text-white"
                        : isDark
                        ? "text-light-400"
                        : "text-gray-500"
                    }`}
                  >
                    {filterOption.label}
                  </Text>
                  {/* Show count badge for each filter */}
                  {filterOption.key === "all" && (
                    <View
                      className={`rounded-full px-1.5 py-0.5 mt-1 ${
                        filter === filterOption.key
                          ? isDark
                            ? "bg-primary/30"
                            : "bg-white/30"
                          : isDark
                          ? "bg-accent/20"
                          : "bg-blue-900/20"
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          filter === filterOption.key
                            ? isDark
                              ? "text-primary"
                              : "text-white"
                            : isDark
                            ? "text-accent"
                            : "text-blue-900"
                        }`}
                      >
                        {statistics.total || 0}
                      </Text>
                    </View>
                  )}
                  {filterOption.key === "pending" && statistics.pending > 0 && (
                    <View className="bg-warning/20 rounded-full px-1.5 py-0.5 mt-1">
                      <Text className="text-warning text-[10px] font-bold">
                        {statistics.pending}
                      </Text>
                    </View>
                  )}
                  {filterOption.key === "active" && statistics.active > 0 && (
                    <View className="bg-info/20 rounded-full px-1.5 py-0.5 mt-1">
                      <Text className="text-info text-[10px] font-bold">
                        {statistics.active}
                      </Text>
                    </View>
                  )}
                  {filterOption.key === "completed" &&
                    statistics.completed > 0 && (
                      <View className="bg-active/20 rounded-full px-1.5 py-0.5 mt-1">
                        <Text className="text-active text-[10px] font-bold">
                          {statistics.completed}
                        </Text>
                      </View>
                    )}
                  {filterOption.key === "cancelled" &&
                    statistics.cancelled > 0 && (
                      <View className="bg-danger/20 rounded-full px-1.5 py-0.5 mt-1">
                        <Text className="text-danger text-[10px] font-bold">
                          {statistics.cancelled}
                        </Text>
                      </View>
                    )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Loading State */}
          {loading && !refreshing ? (
            <View
              className={`rounded-3xl p-12 items-center border ${
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
              <ActivityIndicator
                size="large"
                color={isDark ? "#AB8BFF" : "#1E3A8A"}
              />
              <Text
                className={`mt-4 text-sm ${
                  isDark ? "text-light-300" : "text-gray-600"
                }`}
              >
                Loading orders...
              </Text>
            </View>
          ) : orders.length === 0 ? (
            <View
              className={`rounded-3xl p-10 items-center border ${
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
                <Icons.package
                  name={MCIconNames.packageVariant as any}
                  size={48}
                  color="#9CA4AB"
                />
              </View>
              <Text
                className={`text-xl font-bold mb-2 ${
                  isDark ? "text-light-200" : "text-black"
                }`}
              >
                No orders yet
              </Text>
              <Text
                className={`text-sm text-center mb-6 leading-5 ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                Start by creating your first delivery request and track it in
                real-time
              </Text>
              <TouchableOpacity
                onPress={() => router.push(Routes.standalone.newOrder)}
                className="rounded-2xl px-8 py-4 flex-row items-center"
                style={{
                  backgroundColor: isDark ? "#AB8BFF" : "#1E3A8A",
                  shadowColor: isDark ? "#AB8BFF" : "#1E3A8A",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Icons.action
                  name={IconNames.addCircle as any}
                  size={20}
                  color={isDark ? "#030014" : "#FFFFFF"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  className={`font-bold text-base ${
                    isDark ? "text-primary" : "text-white"
                  }`}
                >
                  Create New Order
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Orders List - THIS IS WHERE ALL FETCHED ORDERS ARE DISPLAYED */
            <>
              {filteredOrders.length === 0 ? (
                <View
                  className={`rounded-3xl p-10 items-center border ${
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
                    {searchQuery
                      ? "No orders found"
                      : filter === "all"
                      ? "No orders"
                      : `No ${filter} orders`}
                  </Text>
                  <Text
                    className={`text-sm text-center ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    {searchQuery
                      ? "Try adjusting your search terms"
                      : filter === "all"
                      ? "You haven't created any orders yet"
                      : filter === "pending"
                      ? "No orders waiting for riders"
                      : `You don't have any ${filter} orders`}
                  </Text>
                </View>
              ) : (
                <View className="gap-4">
                  {filteredOrders.map((order, index) => {
                    const statusInfo = getStatusColor(order.status, isDark);
                    const orderId = order._id || order.id || "";
                    const createdAt = order.createdAt
                      ? formatDate(order.createdAt)
                      : "";

                    return (
                      <Reanimated.View
                        key={orderId}
                        entering={FadeInDown.delay(index * 100)
                          .duration(500)
                          .springify()}
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
                                  Order #
                                  {String(orderId).slice(-6).toUpperCase()}
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
                              className={`${statusInfo.bg} px-3 py-2 rounded-xl border ${statusInfo.border}`}
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
                                        order.distanceKm ||
                                        order.meta?.distanceKm
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
                                <Text className="text-light-400 text-xs">
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
                                <Text className="text-light-400 text-xs">
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
                                  backgroundColor: isDark
                                    ? "#AB8BFF"
                                    : "#1E3A8A",
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
              )}

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <View
                  className="bg-secondary rounded-3xl p-5 border border-neutral-100 mt-6"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  {/* Page Info */}
                  <View className="flex-row items-center justify-between mb-4 flex-wrap">
                    <View className="flex-1 min-w-[150px] mb-2">
                      <Text
                        className={`text-xs mb-1 ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        Showing {orders.length} of {pagination.total} orders
                      </Text>
                      <Text className="text-light-200 text-sm font-semibold">
                        Page {pagination.page} of {pagination.totalPages}
                      </Text>
                    </View>
                    <View
                      className={`rounded-xl px-3 py-1.5 ${
                        isDark ? "bg-accent/20" : "bg-blue-900/20"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isDark ? "text-accent" : "text-blue-900"
                        }`}
                      >
                        {pagination.total} Total
                      </Text>
                    </View>
                  </View>

                  {/* Navigation Buttons - Stack on small screens */}
                  <View className="flex-col gap-3">
                    {/* Top Row: Previous and Next */}
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.hasPrevPage}
                        className={`flex-1 rounded-xl py-3 px-3 items-center border ${
                          pagination.hasPrevPage
                            ? "bg-dark-100 border-neutral-100 active:opacity-80"
                            : "bg-dark-100/50 border-neutral-100/30 opacity-50"
                        }`}
                      >
                        <View className="flex-row items-center justify-center">
                          <Icons.navigation
                            name={IconNames.arrowBack as any}
                            size={18}
                            color={
                              pagination.hasPrevPage
                                ? isDark
                                  ? "#AB8BFF"
                                  : "#1E3A8A"
                                : "#9CA4AB"
                            }
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            className={`text-sm font-semibold ${
                              pagination.hasPrevPage
                                ? isDark
                                  ? "text-accent"
                                  : "text-blue-900"
                                : "text-light-400"
                            }`}
                          >
                            Previous
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.hasNextPage}
                        className={`flex-1 rounded-xl py-3 px-3 items-center border ${
                          pagination.hasNextPage
                            ? "bg-dark-100 border-neutral-100 active:opacity-80"
                            : "bg-dark-100/50 border-neutral-100/30 opacity-50"
                        }`}
                      >
                        <View className="flex-row items-center justify-center">
                          <Text
                            className={`text-sm font-semibold ${
                              pagination.hasNextPage
                                ? isDark
                                  ? "text-accent"
                                  : "text-blue-900"
                                : "text-light-400"
                            }`}
                          >
                            Next
                          </Text>
                          <Icons.navigation
                            name={IconNames.arrowForward as any}
                            size={18}
                            color={
                              pagination.hasNextPage
                                ? isDark
                                  ? "#AB8BFF"
                                  : "#1E3A8A"
                                : "#9CA4AB"
                            }
                            style={{ marginLeft: 6 }}
                          />
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Bottom Row: Page Numbers */}
                    <View className="flex-row items-center justify-center flex-wrap gap-1.5">
                      {Array.from(
                        { length: Math.min(5, pagination.totalPages) },
                        (_, i) => {
                          let pageNum: number;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (
                            pagination.page >=
                            pagination.totalPages - 2
                          ) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }

                          return (
                            <TouchableOpacity
                              key={pageNum}
                              onPress={() => handlePageChange(pageNum)}
                              className={`w-10 h-10 rounded-xl items-center justify-center border ${
                                pagination.page === pageNum
                                  ? isDark
                                    ? "bg-accent border-accent/30"
                                    : "border-blue-800"
                                  : "bg-dark-100 border-neutral-100"
                              }`}
                              style={
                                pagination.page === pageNum && !isDark
                                  ? { backgroundColor: "#1E3A8A" }
                                  : undefined
                              }
                            >
                              <Text
                                className={`text-sm font-bold ${
                                  pagination.page === pageNum
                                    ? isDark
                                      ? "text-primary"
                                      : "text-white"
                                    : "text-light-200"
                                }`}
                              >
                                {pageNum}
                              </Text>
                            </TouchableOpacity>
                          );
                        }
                      )}
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Promo Modal */}
      <Modal
        visible={showPromoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPromoModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className={`rounded-t-3xl p-6 pb-10 ${
              isDark ? "bg-secondary" : "bg-white"
            }`}
            style={{
              maxHeight: "70%",
            }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center">
                <View
                  className={`rounded-xl p-2.5 mr-3 ${
                    isDark ? "bg-accent/20" : "bg-blue-100"
                  }`}
                >
                  <Icons.status
                    name={IconNames.star as any}
                    size={24}
                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                  />
                </View>
                <Text
                  className={`text-2xl font-bold ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Special Promos
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPromoModal(false)}
                className={`rounded-xl p-2 ${
                  isDark ? "bg-dark-100" : "bg-gray-100"
                }`}
              >
                <Icons.navigation
                  name={IconNames.close as any}
                  size={20}
                  color={isDark ? "#E6E6F0" : "#000000"}
                />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-4">
                {/* Promo Card 1 */}
                <View
                  className={`rounded-2xl p-5 border ${
                    isDark
                      ? "bg-accent/10 border-accent/30"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <View className="flex-row items-center mb-3">
                    <View
                      className={`rounded-xl p-2.5 mr-3 ${
                        isDark ? "bg-accent/30" : "bg-blue-100"
                      }`}
                    >
                      <Icons.money
                        name={MCIconNames.cash as any}
                        size={20}
                        color={isDark ? "#AB8BFF" : "#1E3A8A"}
                      />
                    </View>
                    <Text
                      className={`text-lg font-bold flex-1 ${
                        isDark ? "text-light-100" : "text-gray-900"
                      }`}
                    >
                      20% Off Next Order
                    </Text>
                  </View>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-600"
                    }`}
                  >
                    Get 20% discount on your next 3 orders. Use code PROMO20 at
                    checkout. Limited time offer!
                  </Text>
                </View>

                {/* Promo Card 2 */}
                <View
                  className={`rounded-2xl p-5 border ${
                    isDark
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <View className="flex-row items-center mb-3">
                    <View
                      className={`rounded-xl p-2.5 mr-3 ${
                        isDark ? "bg-green-500/30" : "bg-green-100"
                      }`}
                    >
                      <Icons.status
                        name={IconNames.checkmarkCircle as any}
                        size={20}
                        color={isDark ? "#10B981" : "#059669"}
                      />
                    </View>
                    <Text
                      className={`text-lg font-bold flex-1 ${
                        isDark ? "text-light-100" : "text-gray-900"
                      }`}
                    >
                      Free Delivery Weekend
                    </Text>
                  </View>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-600"
                    }`}
                  >
                    Enjoy free delivery on all orders placed during weekends. No
                    minimum order required!
                  </Text>
                </View>

                {/* Promo Card 3 */}
                <View
                  className={`rounded-2xl p-5 border ${
                    isDark
                      ? "bg-purple-500/10 border-purple-500/30"
                      : "bg-purple-50 border-purple-200"
                  }`}
                >
                  <View className="flex-row items-center mb-3">
                    <View
                      className={`rounded-xl p-2.5 mr-3 ${
                        isDark ? "bg-purple-500/30" : "bg-purple-100"
                      }`}
                    >
                      <Icons.status
                        name={IconNames.star as any}
                        size={20}
                        color={isDark ? "#9333EA" : "#7C3AED"}
                      />
                    </View>
                    <Text
                      className={`text-lg font-bold flex-1 ${
                        isDark ? "text-light-100" : "text-gray-900"
                      }`}
                    >
                      Referral Bonus
                    </Text>
                  </View>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-600"
                    }`}
                  >
                    Refer a friend and both of you get ₦500 credit. Share your
                    referral code now!
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
