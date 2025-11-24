import TabBarSpacer from "@/components/TabBarSpacer";
import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AdminPayout, getAllPayouts } from "@/services/adminApi";
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
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatWeekRange = (start: string | Date, end: string | Date) => {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${e.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
};

type StatusFilter = "all" | "pending" | "paid";

export default function AdminPayoutsScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [riderIdFilter, setRiderIdFilter] = useState("");

  // Animation refs
  const icon1Anim = useRef(new Animated.Value(1)).current;

  // These are standalone pages, not in tabs, so no tab bar height needed
  const contentBottomPadding = insets.bottom + 32;

  const loadPayouts = useCallback(
    async (
      showRefreshing = false,
      status?: "pending" | "paid",
      riderId?: string
    ) => {
      if (!user || user.role !== "admin") return;
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await getAllPayouts(riderId, status);
        setPayouts(response.payouts || []);
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Failed to load payouts",
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
      loadPayouts(
        false,
        statusFilter !== "all" ? statusFilter : undefined,
        riderIdFilter || undefined
      );
    }
  }, [user, authLoading, loadPayouts]);

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

  // Filter payouts client-side by search
  const filteredPayouts = React.useMemo(() => {
    let filtered = payouts;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((payout) => {
        const riderName =
          typeof payout.riderId === "object"
            ? payout.riderId.fullName.toLowerCase()
            : "";
        const riderEmail =
          typeof payout.riderId === "object"
            ? payout.riderId.email.toLowerCase()
            : "";
        return (
          riderName.includes(query) ||
          riderEmail.includes(query) ||
          payout._id.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [payouts, searchQuery]);

  const handleStatusFilter = (filter: StatusFilter) => {
    setStatusFilter(filter);
    loadPayouts(
      false,
      filter !== "all" ? filter : undefined,
      riderIdFilter || undefined
    );
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
                isDark ? "bg-accent/20" : "bg-yellow-900/20"
              }`}
            >
              <Icons.money
                name={MCIconNames.cashMultiple as any}
                size={20}
                color={isDark ? "#FBBF24" : "#F59E0B"}
              />
            </View>
            <View className="flex-1">
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-light-100" : "text-gray-900"
                }`}
              >
                All Payouts
              </Text>
              <Text
                className={`text-xs ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                {filteredPayouts.length}{" "}
                {filteredPayouts.length === 1 ? "payout" : "payouts"}
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
            placeholder="Search by rider name or email..."
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
          contentContainerStyle={{ paddingRight: 24 }}
        >
          {(["all", "pending", "paid"] as StatusFilter[]).map(
            (filterOption) => {
              const isActive = statusFilter === filterOption;
              return (
                <TouchableOpacity
                  key={filterOption}
                  onPress={() => handleStatusFilter(filterOption)}
                  className={`px-4 py-2 rounded-xl mr-2 ${
                    isActive
                      ? isDark
                        ? "bg-accent"
                        : "bg-yellow-600"
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
            }
          )}
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
              loadPayouts(
                true,
                statusFilter !== "all" ? statusFilter : undefined,
                riderIdFilter || undefined
              )
            }
            tintColor={isDark ? "#AB8BFF" : "#1E3A8A"}
          />
        }
      >
        {filteredPayouts.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Icons.money
              name={MCIconNames.cashMultiple as any}
              size={64}
              color={isDark ? "#4B5563" : "#9CA4AB"}
            />
            <Text
              className={`text-lg font-semibold mt-4 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              No payouts found
            </Text>
            <Text
              className={`text-sm mt-2 text-center ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "No payouts in the system yet"}
            </Text>
          </View>
        ) : (
          <>
            {filteredPayouts.map((payout, index) => {
              const riderName =
                typeof payout.riderId === "object"
                  ? payout.riderId.fullName
                  : "Unknown";
              const riderEmail =
                typeof payout.riderId === "object" ? payout.riderId.email : "";

              return (
                <Reanimated.View
                  key={payout._id}
                  entering={FadeInDown.delay(index * 50)}
                >
                  <TouchableOpacity
                    onPress={() => {
                      // TODO: Navigate to payout detail
                      Toast.show({
                        type: "info",
                        text1: "Coming Soon",
                        text2: "Payout detail page will be available soon",
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
                          {riderName}
                        </Text>
                        <Text
                          className={`text-sm ${
                            isDark ? "text-light-400" : "text-gray-500"
                          }`}
                        >
                          {riderEmail}
                        </Text>
                        <Text
                          className={`text-xs mt-1 ${
                            isDark ? "text-light-400" : "text-gray-500"
                          }`}
                        >
                          Week:{" "}
                          {formatWeekRange(payout.weekStart, payout.weekEnd)}
                        </Text>
                      </View>
                      <View
                        className={`px-3 py-1 rounded-lg border ${
                          payout.status === "paid"
                            ? isDark
                              ? "bg-active/20 border-active/30"
                              : "bg-green-100 border-green-300"
                            : isDark
                            ? "bg-warning/20 border-warning/30"
                            : "bg-yellow-100 border-yellow-300"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            payout.status === "paid"
                              ? isDark
                                ? "text-active"
                                : "text-green-700"
                              : isDark
                              ? "text-warning"
                              : "text-yellow-700"
                          }`}
                        >
                          {payout.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-2">
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
                            Net: ₦
                            {Number(
                              payout.totals.riderNet || 0
                            ).toLocaleString()}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
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
                            {payout.totals.count} deliveries
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text
                          className={`text-lg font-bold ${
                            isDark ? "text-light-100" : "text-gray-900"
                          }`}
                        >
                          ₦{Number(payout.totals.gross || 0).toLocaleString()}
                        </Text>
                        <Text
                          className={`text-xs ${
                            isDark ? "text-light-400" : "text-gray-500"
                          }`}
                        >
                          Gross
                        </Text>
                        {payout.paidAt && (
                          <Text
                            className={`text-xs mt-1 ${
                              isDark ? "text-light-400" : "text-gray-500"
                            }`}
                          >
                            Paid: {formatDate(payout.paidAt)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </Reanimated.View>
              );
            })}
          </>
        )}
      </ScrollView>
      <TabBarSpacer />
    </SafeAreaView>
  );
}
