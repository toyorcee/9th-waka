import TabBarSpacer from "@/components/TabBarSpacer";
import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AdminRider, getAllRiders } from "@/services/adminApi";
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

type FilterType = "all" | "online" | "offline" | "blocked" | "verified";

export default function AdminRidersScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  const [riders, setRiders] = useState<AdminRider[]>([]);
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

  const icon1Anim = useRef(new Animated.Value(1)).current;

  const contentBottomPadding = insets.bottom + 32;

  const loadRiders = useCallback(
    async (
      showRefreshing = false,
      page: number = 1,
      search: string = "",
      online?: boolean,
      blocked?: boolean,
      verified?: boolean
    ) => {
      if (!user || user.role !== "admin") return;
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await getAllRiders(
          page,
          pageSize,
          search || undefined,
          online,
          blocked,
          verified
        );
        setRiders(response.riders || []);
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
          text1: "Failed to load riders",
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
      loadRiders();
    }
  }, [user, authLoading, loadRiders]);

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
      const online =
        filter === "online" ? true : filter === "offline" ? false : undefined;
      const blocked = filter === "blocked" ? true : undefined;
      const verified = filter === "verified" ? true : undefined;
      loadRiders(false, 1, searchQuery, online, blocked, verified);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, filter, user, loadRiders]);

  const handleFilter = (newFilter: FilterType) => {
    setFilter(newFilter);
    setCurrentPage(1);
    const online =
      newFilter === "online"
        ? true
        : newFilter === "offline"
        ? false
        : undefined;
    const blocked = newFilter === "blocked" ? true : undefined;
    const verified = newFilter === "verified" ? true : undefined;
    loadRiders(false, 1, searchQuery, online, blocked, verified);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      const online =
        filter === "online" ? true : filter === "offline" ? false : undefined;
      const blocked = filter === "blocked" ? true : undefined;
      const verified = filter === "verified" ? true : undefined;
      loadRiders(false, newPage, searchQuery, online, blocked, verified);
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
                isDark ? "bg-accent/20" : "bg-green-900/20"
              }`}
            >
              <Icons.delivery
                name={MCIconNames.delivery as any}
                size={20}
                color={isDark ? "#30D158" : "#10B981"}
              />
            </View>
            <View className="flex-1">
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-light-100" : "text-gray-900"
                }`}
              >
                All Riders
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
          className={`flex-row items-center rounded-xl px-3 py-2 mb-2 ${
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
            placeholder="Search riders..."
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

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 24 }}
        >
          {(
            ["all", "online", "offline", "blocked", "verified"] as FilterType[]
          ).map((filterOption) => {
            const isActive = filter === filterOption;
            return (
              <TouchableOpacity
                key={filterOption}
                onPress={() => handleFilter(filterOption)}
                className={`px-4 py-2 rounded-xl mr-2 ${
                  isActive
                    ? isDark
                      ? "bg-accent"
                      : "bg-green-600"
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
                  {filterOption}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Reanimated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 180, // Header height + safe area
          paddingBottom: 20, // Reduced padding since TabBarSpacer handles the rest
          paddingHorizontal: 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              const online =
                filter === "online"
                  ? true
                  : filter === "offline"
                  ? false
                  : undefined;
              const blocked = filter === "blocked" ? true : undefined;
              const verified = filter === "verified" ? true : undefined;
              loadRiders(
                true,
                currentPage,
                searchQuery,
                online,
                blocked,
                verified
              );
            }}
            tintColor={isDark ? "#AB8BFF" : "#1E3A8A"}
          />
        }
      >
        {riders.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Icons.delivery
              name={MCIconNames.delivery as any}
              size={64}
              color={isDark ? "#4B5563" : "#9CA4AB"}
            />
            <Text
              className={`text-lg font-semibold mt-4 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              No riders found
            </Text>
            <Text
              className={`text-sm mt-2 text-center ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              {searchQuery || filter !== "all"
                ? "Try adjusting your filters"
                : "No riders in the system yet"}
            </Text>
          </View>
        ) : (
          <>
            {riders.map((rider, index) => (
              <Reanimated.View
                key={rider._id}
                entering={FadeInDown.delay(index * 50)}
              >
                <TouchableOpacity
                  onPress={() => {
                    // TODO: Navigate to rider detail
                    Toast.show({
                      type: "info",
                      text1: "Coming Soon",
                      text2: "Rider detail page will be available soon",
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
                      <View className="flex-row items-center mb-1">
                        <Text
                          className={`text-lg font-bold ${
                            isDark ? "text-light-100" : "text-gray-900"
                          }`}
                        >
                          {rider.fullName}
                        </Text>
                        {rider.online && (
                          <View
                            className={`ml-2 px-2 py-0.5 rounded-full ${
                              isDark ? "bg-active/20" : "bg-green-100"
                            }`}
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                isDark ? "text-active" : "text-green-700"
                              }`}
                            >
                              ONLINE
                            </Text>
                          </View>
                        )}
                        {rider.paymentBlocked && (
                          <View
                            className={`ml-2 px-2 py-0.5 rounded-full ${
                              isDark ? "bg-danger/20" : "bg-red-100"
                            }`}
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                isDark ? "text-danger" : "text-red-700"
                              }`}
                            >
                              BLOCKED
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        className={`text-sm ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        {rider.email}
                      </Text>
                      {rider.phoneNumber && (
                        <Text
                          className={`text-sm ${
                            isDark ? "text-light-400" : "text-gray-500"
                          }`}
                        >
                          {rider.phoneNumber}
                        </Text>
                      )}
                    </View>
                    {rider.driverLicenseVerified && (
                      <View
                        className={`px-2 py-1 rounded-lg ${
                          isDark ? "bg-accent/20" : "bg-blue-100"
                        }`}
                      >
                        <Icons.action
                          name={IconNames.checkmarkCircle as any}
                          size={16}
                          color={isDark ? "#AB8BFF" : "#1E3A8A"}
                        />
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <Icons.delivery
                          name={MCIconNames.motorcycle as any}
                          size={16}
                          color={isDark ? "#AB8BFF" : "#1E3A8A"}
                        />
                        <Text
                          className={`text-sm ml-2 capitalize ${
                            isDark ? "text-light-300" : "text-gray-700"
                          }`}
                        >
                          {rider.vehicleType || "Not set"}
                        </Text>
                      </View>
                      {rider.averageRating > 0 && (
                        <View className="flex-row items-center">
                          <Icons.action
                            name={IconNames.star as any}
                            size={16}
                            color={isDark ? "#FBBF24" : "#F59E0B"}
                          />
                          <Text
                            className={`text-sm ml-1 ${
                              isDark ? "text-light-300" : "text-gray-700"
                            }`}
                          >
                            {rider.averageRating.toFixed(1)} (
                            {rider.totalRatings})
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="items-end">
                      {rider.currentWeekEarnings && (
                        <Text
                          className={`text-lg font-bold ${
                            isDark ? "text-light-100" : "text-gray-900"
                          }`}
                        >
                          ₦
                          {Number(
                            rider.currentWeekEarnings.earnings || 0
                          ).toLocaleString()}
                        </Text>
                      )}
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        {formatDate(rider.createdAt)}
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
                        : "bg-green-600"
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
                        : "bg-green-600"
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
