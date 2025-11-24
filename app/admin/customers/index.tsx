import TabBarSpacer from "@/components/TabBarSpacer";
import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AdminCustomer, getAllCustomers } from "@/services/adminApi";
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

export default function AdminCustomersScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  // These are standalone pages, not in tabs, so no tab bar height needed
  const contentBottomPadding = insets.bottom + 32;

  const loadCustomers = useCallback(
    async (showRefreshing = false, page: number = 1, search: string = "") => {
      if (!user || user.role !== "admin") return;
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await getAllCustomers(
          page,
          pageSize,
          search || undefined
        );
        setCustomers(response.customers || []);
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
          text1: "Failed to load customers",
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
      loadCustomers();
    }
  }, [user, authLoading, loadCustomers]);

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
      loadCustomers(false, 1, searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, user, loadCustomers]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadCustomers(false, newPage, searchQuery);
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
              <Icons.user
                name={IconNames.people as any}
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
                All Customers
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
            placeholder="Search customers..."
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
      </Reanimated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 140,
          paddingBottom: 20,
          paddingHorizontal: 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCustomers(true, currentPage, searchQuery)}
            tintColor={isDark ? "#AB8BFF" : "#1E3A8A"}
          />
        }
      >
        {customers.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Icons.user
              name={IconNames.people as any}
              size={64}
              color={isDark ? "#4B5563" : "#9CA4AB"}
            />
            <Text
              className={`text-lg font-semibold mt-4 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              No customers found
            </Text>
            <Text
              className={`text-sm mt-2 text-center ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              {searchQuery
                ? "Try adjusting your search"
                : "No customers in the system yet"}
            </Text>
          </View>
        ) : (
          <>
            {customers.map((customer, index) => (
              <Reanimated.View
                key={customer._id}
                entering={FadeInDown.delay(index * 50)}
              >
                <TouchableOpacity
                  onPress={() => {
                    // TODO: Navigate to customer detail
                    Toast.show({
                      type: "info",
                      text1: "Coming Soon",
                      text2: "Customer detail page will be available soon",
                    });
                  }}
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
                        {customer.fullName ||
                          customer.email?.split("@")[0] ||
                          "Unknown"}
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        {customer.email}
                      </Text>
                      {customer.role && customer.role !== "customer" && (
                        <View
                          className={`px-2 py-1 rounded-lg mt-1 self-start ${
                            isDark ? "bg-warning/20" : "bg-yellow-100"
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold capitalize ${
                              isDark ? "text-warning" : "text-yellow-700"
                            }`}
                          >
                            {customer.role}
                          </Text>
                        </View>
                      )}
                      {customer.phoneNumber && (
                        <Text
                          className={`text-sm ${
                            isDark ? "text-light-400" : "text-gray-500"
                          }`}
                        >
                          {customer.phoneNumber}
                        </Text>
                      )}
                    </View>
                    <View className="flex-row items-center gap-2">
                      {customer.isVerified ? (
                        <View
                          className={`px-2 py-1 rounded-lg ${
                            isDark ? "bg-active/20" : "bg-green-100"
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              isDark ? "text-active" : "text-green-700"
                            }`}
                          >
                            ✓ VERIFIED
                          </Text>
                        </View>
                      ) : (
                        <View
                          className={`px-2 py-1 rounded-lg ${
                            isDark ? "bg-warning/20" : "bg-yellow-100"
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              isDark ? "text-warning" : "text-yellow-700"
                            }`}
                          >
                            ⚠ UNVERIFIED
                          </Text>
                        </View>
                      )}
                      {customer.accountDeactivated && (
                        <View
                          className={`px-2 py-1 rounded-lg ${
                            isDark ? "bg-danger/20" : "bg-red-100"
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              isDark ? "text-danger" : "text-red-700"
                            }`}
                          >
                            DEACTIVATED
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <Icons.package
                          name={MCIconNames.packageVariant as any}
                          size={16}
                          color={isDark ? "#AB8BFF" : "#1E3A8A"}
                        />
                        <Text
                          className={`text-sm ml-2 ${
                            isDark ? "text-light-300" : "text-gray-700"
                          }`}
                        >
                          {customer.stats.totalOrders} orders
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Icons.money
                          name={MCIconNames.cash as any}
                          size={16}
                          color={isDark ? "#30D158" : "#10B981"}
                        />
                        <Text
                          className={`text-sm ml-2 ${
                            isDark ? "text-light-300" : "text-gray-700"
                          }`}
                        >
                          ₦
                          {Number(
                            customer.stats.totalSpent || 0
                          ).toLocaleString()}{" "}
                          spent
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text
                        className={`text-sm font-semibold ${
                          isDark ? "text-active" : "text-green-600"
                        }`}
                      >
                        {customer.stats.completedOrders} completed
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        {formatDate(customer.createdAt)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Reanimated.View>
            ))}

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
