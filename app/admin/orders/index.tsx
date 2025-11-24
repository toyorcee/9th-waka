import TabBarSpacer from "@/components/TabBarSpacer";
import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AdminOrder, getAllOrders } from "@/services/adminApi";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const getStatusColor = (status: string, isDark: boolean) => {
  switch (status) {
    case "pending":
      return {
        bg: isDark ? "bg-warning/20" : "bg-yellow-100",
        text: isDark ? "text-warning" : "text-yellow-700",
        border: isDark ? "border-warning/30" : "border-yellow-300",
      };
    case "assigned":
      return {
        bg: isDark ? "bg-info/20" : "bg-blue-100",
        text: isDark ? "text-info" : "text-blue-700",
        border: isDark ? "border-info/30" : "border-blue-300",
      };
    case "picked_up":
    case "delivering":
      return {
        bg: isDark ? "bg-accent/20" : "bg-purple-100",
        text: isDark ? "text-accent" : "text-purple-700",
        border: isDark ? "border-accent/30" : "border-purple-300",
      };
    case "delivered":
      return {
        bg: isDark ? "bg-active/20" : "bg-green-100",
        text: isDark ? "text-active" : "text-green-700",
        border: isDark ? "border-active/30" : "border-green-300",
      };
    case "cancelled":
      return {
        bg: isDark ? "bg-danger/20" : "bg-red-100",
        text: isDark ? "text-danger" : "text-red-700",
        border: isDark ? "border-danger/30" : "border-red-300",
      };
    default:
      return {
        bg: isDark ? "bg-neutral-100/20" : "bg-gray-100",
        text: isDark ? "text-light-300" : "text-gray-700",
        border: isDark ? "border-neutral-100/30" : "border-gray-300",
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

type StatusFilter =
  | "all"
  | "pending"
  | "assigned"
  | "delivering"
  | "delivered"
  | "cancelled";

export default function AdminOrdersScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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

  // Animation refs
  const icon1Anim = useRef(new Animated.Value(1)).current;
  const hasAnimatedRef = useRef(false);

  // These are standalone pages, not in tabs, so no tab bar height needed
  const contentBottomPadding = insets.bottom + 32;

  const loadOrders = useCallback(
    async (
      showRefreshing = false,
      page: number = 1,
      search: string = "",
      status: string = ""
    ) => {
      if (!user || user.role !== "admin") return;
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await getAllOrders(
          page,
          pageSize,
          search || undefined,
          status || undefined
        );
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
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Failed to load orders",
          text2: error?.message || "Please try again",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (user && user.role === "admin" && !authLoading) {
      loadOrders();
    }
  }, [user, authLoading, loadOrders]);

  // Icon animation
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(icon1Anim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(icon1Anim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Search debouncing
  useEffect(() => {
    if (!user || user.role !== "admin") return;
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadOrders(
        false,
        1,
        searchQuery,
        statusFilter !== "all" ? statusFilter : ""
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, user, loadOrders]);

  const handleStatusFilter = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
    loadOrders(false, 1, searchQuery, filter !== "all" ? filter : "");
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadOrders(
        false,
        newPage,
        searchQuery,
        statusFilter !== "all" ? statusFilter : ""
      );
    }
  };

  if (authLoading || loading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-black" : "bg-white"
        }`}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? "#AB8BFF" : "#1E3A8A"}
        />
      </View>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <View
        className={`flex-1 items-center justify-center px-6 ${
          isDark ? "bg-black" : "bg-white"
        }`}
      >
        <Icons.safety
          name={IconNames.security as any}
          size={64}
          color={isDark ? "#AB8BFF" : "#1E3A8A"}
        />
        <Text
          className={`text-xl font-bold mt-4 ${
            isDark ? "text-light-100" : "text-gray-900"
          }`}
        >
          Admin Access Required
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["top"]}
      className={`flex-1 ${isDark ? "bg-black" : "bg-white"}`}
    >
      {/* Fixed Header - Small, compact */}
      <Reanimated.View
        entering={FadeInDown.delay(0)}
        className={`absolute top-0 left-0 right-0 z-50 ${
          isDark ? "bg-black" : "bg-white"
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
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-3"
              activeOpacity={0.7}
            >
              <Icons.navigation
                name={IconNames.arrowBack as any}
                size={20}
                color={isDark ? "#AB8BFF" : "#1E3A8A"}
              />
            </TouchableOpacity>
            <View
              className={`rounded-xl p-2 mr-3 ${
                isDark ? "bg-accent/20" : "bg-blue-900/20"
              }`}
            >
              <Icons.package
                name={MCIconNames.packageVariant as any}
                size={20}
                color={isDark ? "#AB8BFF" : "#1E3A8A"}
              />
            </View>
            <View className="flex-1">
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-light-100" : "text-gray-900"
                }`}
              >
                All Orders
              </Text>
              <Text
                className={`text-xs ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                {pagination.total} total
              </Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View
          className={`flex-row items-center rounded-xl px-3 py-2 ${
            isDark ? "bg-dark-100" : "bg-gray-100"
          }`}
        >
          <Icons.search
            name={IconNames.search as any}
            size={20}
            color={isDark ? "#AB8BFF" : "#6E6E73"}
          />
          <TextInput
            className={`flex-1 ml-3 ${
              isDark ? "text-light-100" : "text-gray-900"
            }`}
            placeholder="Search orders..."
            placeholderTextColor={isDark ? "#9CA4AB" : "#6E6E73"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              activeOpacity={0.7}
            >
              <Icons.action
                name={IconNames.closeCircle as any}
                size={20}
                color={isDark ? "#9CA4AB" : "#6E6E73"}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-2"
          contentContainerStyle={{ paddingRight: 24 }}
        >
          {(
            [
              "all",
              "pending",
              "assigned",
              "delivering",
              "delivered",
              "cancelled",
            ] as StatusFilter[]
          ).map((filter) => {
            const isActive = statusFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => handleStatusFilter(filter)}
                className={`px-4 py-2 rounded-xl mr-2 ${
                  isActive
                    ? isDark
                      ? "bg-accent"
                      : "bg-blue-600"
                    : isDark
                    ? "bg-dark-100"
                    : "bg-gray-200"
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`font-semibold capitalize ${
                    isActive
                      ? isDark
                        ? "text-primary"
                        : "text-white"
                      : isDark
                      ? "text-light-400"
                      : "text-gray-700"
                  }`}
                >
                  {filter === "all" ? "All" : filter.replace(/_/g, " ")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Reanimated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 180, 
          paddingBottom: 20, 
          paddingHorizontal: 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              loadOrders(
                true,
                currentPage,
                searchQuery,
                statusFilter !== "all" ? statusFilter : ""
              )
            }
            tintColor={isDark ? "#AB8BFF" : "#1E3A8A"}
          />
        }
      >
        {orders.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Icons.package
              name={MCIconNames.packageVariant as any}
              size={64}
              color={isDark ? "#4B5563" : "#9CA4AB"}
            />
            <Text
              className={`text-lg font-semibold mt-4 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              No orders found
            </Text>
            <Text
              className={`text-sm mt-2 text-center ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "No orders in the system yet"}
            </Text>
          </View>
        ) : (
          <>
            {orders.map((order, index) => {
              const statusColors = getStatusColor(order.status, isDark);
              const customerName =
                typeof order.customerId === "object"
                  ? order.customerId.fullName
                  : "Unknown";
              const riderName =
                order.riderId && typeof order.riderId === "object"
                  ? order.riderId.fullName
                  : order.riderId
                  ? "Assigned"
                  : "Unassigned";

              return (
                <Reanimated.View
                  key={order._id}
                  entering={FadeInDown.delay(index * 50)}
                >
                  <TouchableOpacity
                    onPress={() => router.push(`/orders/${order._id}`)}
                    className={`rounded-2xl p-4 mb-4 ${
                      isDark ? "bg-secondary" : "bg-white"
                    }`}
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 3,
                    }}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1">
                        <Text
                          className={`text-lg font-bold mb-1 ${
                            isDark ? "text-light-100" : "text-gray-900"
                          }`}
                        >
                          {order.items}
                        </Text>
                        <Text
                          className={`text-sm ${
                            isDark ? "text-light-400" : "text-gray-500"
                          }`}
                        >
                          Order #{String(order._id).slice(-8).toUpperCase()}
                        </Text>
                      </View>
                      <View
                        className={`px-3 py-1 rounded-lg border ${statusColors.bg} ${statusColors.border}`}
                      >
                        <Text
                          className={`text-xs font-semibold ${statusColors.text}`}
                        >
                          {order.status.replace(/_/g, "").toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View className="mb-3">
                      <View className="flex-row items-center mb-2">
                        <Icons.location
                          name={IconNames.locationOutline as any}
                          size={16}
                          color={isDark ? "#AB8BFF" : "#1E3A8A"}
                        />
                        <Text
                          className={`text-sm ml-2 flex-1 ${
                            isDark ? "text-light-300" : "text-gray-700"
                          }`}
                          numberOfLines={1}
                        >
                          {order.pickup.address}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Icons.location
                          name={IconNames.locationOutline as any}
                          size={16}
                          color={isDark ? "#30D158" : "#10B981"}
                        />
                        <Text
                          className={`text-sm ml-2 flex-1 ${
                            isDark ? "text-light-300" : "text-gray-700"
                          }`}
                          numberOfLines={1}
                        >
                          {order.dropoff.address}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text
                          className={`text-sm ${
                            isDark ? "text-light-400" : "text-gray-500"
                          }`}
                        >
                          Customer: {customerName}
                        </Text>
                        <Text
                          className={`text-sm ${
                            isDark ? "text-light-400" : "text-gray-500"
                          }`}
                        >
                          Rider: {riderName}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text
                          className={`text-lg font-bold ${
                            isDark ? "text-light-100" : "text-gray-900"
                          }`}
                        >
                          ₦{Number(order.price || 0).toLocaleString()}
                        </Text>
                        <Text
                          className={`text-xs ${
                            isDark ? "text-light-400" : "text-gray-500"
                          }`}
                        >
                          {formatDate(order.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Reanimated.View>
              );
            })}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <View className="flex-row items-center justify-center mt-6 mb-4">
                <TouchableOpacity
                  onPress={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className={`px-4 py-2 rounded-xl mr-2 ${
                    pagination.hasPrevPage
                      ? isDark
                        ? "bg-accent"
                        : "bg-blue-600"
                      : isDark
                      ? "bg-dark-100"
                      : "bg-gray-200"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-semibold ${
                      pagination.hasPrevPage
                        ? isDark
                          ? "text-primary"
                          : "text-white"
                        : isDark
                        ? "text-light-400"
                        : "text-gray-500"
                    }`}
                  >
                    Previous
                  </Text>
                </TouchableOpacity>
                <Text
                  className={`px-4 py-2 ${
                    isDark ? "text-light-300" : "text-gray-700"
                  }`}
                >
                  Page {currentPage} of {pagination.totalPages}
                </Text>
                <TouchableOpacity
                  onPress={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className={`px-4 py-2 rounded-xl ml-2 ${
                    pagination.hasNextPage
                      ? isDark
                        ? "bg-accent"
                        : "bg-blue-600"
                      : isDark
                      ? "bg-dark-100"
                      : "bg-gray-200"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-semibold ${
                      pagination.hasNextPage
                        ? isDark
                          ? "text-primary"
                          : "text-white"
                        : isDark
                        ? "text-light-400"
                        : "text-gray-500"
                    }`}
                  >
                    Next
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
      <TabBarSpacer />
    </SafeAreaView>
  );
}
