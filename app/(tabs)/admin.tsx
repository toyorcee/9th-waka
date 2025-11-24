import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AdminStats, getAdminStats } from "@/services/adminApi";
import { Routes } from "@/services/navigationHelper";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function AdminScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animation refs for icons
  const icon1Anim = useRef(new Animated.Value(1)).current;
  const icon2Anim = useRef(new Animated.Value(1)).current;
  const icon3Anim = useRef(new Animated.Value(1)).current;
  const icon4Anim = useRef(new Animated.Value(1)).current;
  const icon5Anim = useRef(new Animated.Value(1)).current;
  const icon6Anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      const createPulseAnimation = (animValue: Animated.Value) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animValue, {
              toValue: 1.2,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        );
      };

      createPulseAnimation(icon1Anim).start();
      createPulseAnimation(icon2Anim).start();
      createPulseAnimation(icon3Anim).start();
      createPulseAnimation(icon4Anim).start();
      createPulseAnimation(icon5Anim).start();
      createPulseAnimation(icon6Anim).start();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const isAdmin = user?.role === "admin";

  // Calculate header height for ScrollView padding
  // Header content: icon (28 + padding) + text (3xl + sm) + padding = ~100px
  // Plus paddingBottom: 16px
  const headerContentHeight = 100; // Header content height (icon + text + spacing)
  const headerPaddingBottom = 16;
  const headerTotalHeight = headerContentHeight + headerPaddingBottom;

  // Bottom padding accounts for tab bar
  const tabBarHeight = 65;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 20;
  const contentBottomPadding = tabBarHeight + bottomPadding + 32;

  const loadStats = async (showRefreshing = false) => {
    if (!isAdmin) {
      return;
    }
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load stats",
        text2: error?.message || "Please try again",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin && !authLoading) {
      loadStats();
    }
  }, [isAdmin, authLoading]);

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

  if (!isAdmin) {
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
        <Text
          className={`text-base mt-2 text-center ${
            isDark ? "text-light-400" : "text-gray-600"
          }`}
        >
          You need admin privileges to access this page.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["top"]}
      className={`flex-1 ${isDark ? "bg-black" : "bg-white"}`}
    >
      {/* Fixed Header - Opaque, not transparent */}
      <Reanimated.View
        entering={FadeInDown.delay(0)}
        className={`absolute top-0 left-0 right-0 z-50 ${
          isDark ? "bg-black" : "bg-white"
        }`}
        style={{
          paddingTop: insets.top,
          paddingBottom: 16,
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
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Animated.View
              style={{
                transform: [{ scale: icon1Anim }],
              }}
            >
              <View
                className={`p-3 rounded-2xl ${
                  isDark ? "bg-accent/20" : "bg-blue-900/20"
                }`}
              >
                <Icons.action
                  name={IconNames.shield as any}
                  size={28}
                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                />
              </View>
            </Animated.View>
            <View className="ml-4">
              <Text
                className={`text-3xl font-bold ${
                  isDark ? "text-light-100" : "text-gray-900"
                }`}
              >
                Admin Dashboard
              </Text>
              <Text
                className={`text-sm mt-1 ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                System Overview
              </Text>
            </View>
          </View>
        </View>
      </Reanimated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + headerTotalHeight + 1,
          paddingBottom: contentBottomPadding,
          paddingHorizontal: 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadStats(true)}
            tintColor={isDark ? "#AB8BFF" : "#1E3A8A"}
          />
        }
      >
        {/* Statistics Cards */}
        <View className="mb-8">
          <Text
            className={`text-xl font-bold mb-4 ${
              isDark ? "text-light-100" : "text-gray-900"
            }`}
          >
            Overview
          </Text>

          {/* Orders Stats */}
          <Reanimated.View entering={FadeInDown.delay(100)} className="mb-4">
            <View
              className={`rounded-3xl p-6 ${
                isDark ? "bg-secondary" : "bg-white"
              }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Animated.View
                    style={{
                      transform: [{ scale: icon2Anim }],
                    }}
                  >
                    <View
                      className={`p-3 rounded-xl mr-3 ${
                        isDark ? "bg-dark-100" : "bg-blue-50"
                      }`}
                    >
                      <Icons.package
                        name={MCIconNames.packageVariant as any}
                        size={24}
                        color={isDark ? "#AB8BFF" : "#1E3A8A"}
                      />
                    </View>
                  </Animated.View>
                  <Text
                    className={`text-lg font-bold ${
                      isDark ? "text-light-100" : "text-gray-900"
                    }`}
                  >
                    Orders
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-4">
                <View className="flex-1 min-w-[45%]">
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Total
                  </Text>
                  <Text
                    className={`text-2xl font-bold mt-1 ${
                      isDark ? "text-light-100" : "text-gray-900"
                    }`}
                  >
                    {stats?.orders.total || 0}
                  </Text>
                </View>
                <View className="flex-1 min-w-[45%]">
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Pending
                  </Text>
                  <Text
                    className={`text-2xl font-bold mt-1 ${
                      isDark ? "text-warning" : "text-yellow-600"
                    }`}
                  >
                    {stats?.orders.pending || 0}
                  </Text>
                </View>
                <View className="flex-1 min-w-[45%]">
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Active
                  </Text>
                  <Text
                    className={`text-2xl font-bold mt-1 ${
                      isDark ? "text-accent" : "text-blue-600"
                    }`}
                  >
                    {stats?.orders.active || 0}
                  </Text>
                </View>
                <View className="flex-1 min-w-[45%]">
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Completed
                  </Text>
                  <Text
                    className={`text-2xl font-bold mt-1 ${
                      isDark ? "text-active" : "text-green-600"
                    }`}
                  >
                    {stats?.orders.completed || 0}
                  </Text>
                </View>
              </View>
            </View>
          </Reanimated.View>

          {/* Riders Stats */}
          <Reanimated.View entering={FadeInDown.delay(200)} className="mb-4">
            <View
              className={`rounded-3xl p-6 ${
                isDark ? "bg-secondary" : "bg-white"
              }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Animated.View
                    style={{
                      transform: [{ scale: icon3Anim }],
                    }}
                  >
                    <View
                      className={`p-3 rounded-xl mr-3 ${
                        isDark ? "bg-dark-100" : "bg-green-50"
                      }`}
                    >
                      <Icons.delivery
                        name={MCIconNames.delivery as any}
                        size={24}
                        color={isDark ? "#30D158" : "#10B981"}
                      />
                    </View>
                  </Animated.View>
                  <Text
                    className={`text-lg font-bold ${
                      isDark ? "text-light-100" : "text-gray-900"
                    }`}
                  >
                    Riders
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-4">
                <View className="flex-1 min-w-[45%]">
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Total
                  </Text>
                  <Text
                    className={`text-2xl font-bold mt-1 ${
                      isDark ? "text-light-100" : "text-gray-900"
                    }`}
                  >
                    {stats?.riders.total || 0}
                  </Text>
                </View>
                <View className="flex-1 min-w-[45%]">
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Online
                  </Text>
                  <Text
                    className={`text-2xl font-bold mt-1 ${
                      isDark ? "text-active" : "text-green-600"
                    }`}
                  >
                    {stats?.riders.online || 0}
                  </Text>
                </View>
                <View className="flex-1 min-w-[45%]">
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Blocked
                  </Text>
                  <Text
                    className={`text-2xl font-bold mt-1 ${
                      isDark ? "text-danger" : "text-red-600"
                    }`}
                  >
                    {stats?.riders.blocked || 0}
                  </Text>
                </View>
                <View className="flex-1 min-w-[45%]">
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Verified
                  </Text>
                  <Text
                    className={`text-2xl font-bold mt-1 ${
                      isDark ? "text-accent" : "text-blue-600"
                    }`}
                  >
                    {stats?.riders.verified || 0}
                  </Text>
                </View>
              </View>
            </View>
          </Reanimated.View>

          {/* Revenue & Customers */}
          <View className="flex-row gap-4 mb-4">
            <Reanimated.View
              entering={FadeInDown.delay(300)}
              className="flex-1"
            >
              <View
                className={`rounded-3xl p-6 ${
                  isDark ? "bg-secondary" : "bg-white"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <View className="flex-row items-center mb-4">
                  <Animated.View
                    style={{
                      transform: [{ scale: icon4Anim }],
                    }}
                  >
                    <View
                      className={`p-3 rounded-xl mr-3 ${
                        isDark ? "bg-dark-100" : "bg-purple-50"
                      }`}
                    >
                      <Icons.money
                        name={MCIconNames.cash as any}
                        size={24}
                        color={isDark ? "#AB8BFF" : "#8B5CF6"}
                      />
                    </View>
                  </Animated.View>
                  <Text
                    className={`text-sm font-bold flex-1 ${
                      isDark ? "text-light-100" : "text-gray-900"
                    }`}
                    numberOfLines={1}
                  >
                    Revenue
                  </Text>
                </View>
                <Text
                  className={`text-2xl font-bold ${
                    isDark ? "text-light-100" : "text-gray-900"
                  }`}
                >
                  ₦{Number(stats?.revenue.today || 0).toLocaleString()}
                </Text>
                <Text
                  className={`text-sm mt-1 ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Today
                </Text>
              </View>
            </Reanimated.View>

            <Reanimated.View
              entering={FadeInDown.delay(350)}
              className="flex-1"
            >
              <View
                className={`rounded-3xl p-6 ${
                  isDark ? "bg-secondary" : "bg-white"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <View className="flex-row items-center mb-4">
                  <Animated.View
                    style={{
                      transform: [{ scale: icon5Anim }],
                    }}
                  >
                    <View
                      className={`p-3 rounded-xl mr-3 ${
                        isDark ? "bg-dark-100" : "bg-blue-50"
                      }`}
                    >
                      <Icons.user
                        name={IconNames.people as any}
                        size={24}
                        color={isDark ? "#AB8BFF" : "#1E3A8A"}
                      />
                    </View>
                  </Animated.View>
                  <Text
                    className={`text-sm font-bold flex-1 ${
                      isDark ? "text-light-100" : "text-gray-900"
                    }`}
                    numberOfLines={1}
                  >
                    Customers
                  </Text>
                </View>
                <Text
                  className={`text-2xl font-bold ${
                    isDark ? "text-light-100" : "text-gray-900"
                  }`}
                >
                  {stats?.customers.total || 0}
                </Text>
                <Text
                  className={`text-sm mt-1 ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Total
                </Text>
              </View>
            </Reanimated.View>
          </View>

          {/* Payouts Stats */}
          <Reanimated.View entering={FadeInDown.delay(400)}>
            <View
              className={`rounded-3xl p-6 ${
                isDark ? "bg-secondary" : "bg-white"
              }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Animated.View
                    style={{
                      transform: [{ scale: icon6Anim }],
                    }}
                  >
                    <View
                      className={`p-3 rounded-xl mr-3 ${
                        isDark ? "bg-dark-100" : "bg-yellow-50"
                      }`}
                    >
                      <Icons.money
                        name={MCIconNames.cashMultiple as any}
                        size={24}
                        color={isDark ? "#FBBF24" : "#F59E0B"}
                      />
                    </View>
                  </Animated.View>
                  <Text
                    className={`text-lg font-bold ${
                      isDark ? "text-light-100" : "text-gray-900"
                    }`}
                  >
                    Payouts
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Pending
                  </Text>
                  <Text
                    className={`text-2xl font-bold mt-1 ${
                      isDark ? "text-warning" : "text-yellow-600"
                    }`}
                  >
                    {stats?.payouts.pending || 0}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Overdue
                  </Text>
                  <Text
                    className={`text-2xl font-bold mt-1 ${
                      isDark ? "text-danger" : "text-red-600"
                    }`}
                  >
                    {stats?.payouts.overdue || 0}
                  </Text>
                </View>
              </View>
            </View>
          </Reanimated.View>

          {/* Blocked Riders Card */}
          {stats && stats.riders.blocked > 0 && (
            <Reanimated.View entering={FadeInDown.delay(450)} className="mt-4">
              <TouchableOpacity
                onPress={() => router.push(Routes.admin.blockedRiders as any)}
                className={`rounded-3xl p-6 ${
                  isDark
                    ? "bg-danger/20 border border-danger/30"
                    : "bg-red-50 border border-red-200"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 5,
                }}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Icons.safety
                      name={IconNames.security as any}
                      size={24}
                      color={isDark ? "#EF4444" : "#DC2626"}
                    />
                    <View className="ml-3">
                      <Text
                        className={`text-lg font-bold ${
                          isDark ? "text-light-100" : "text-gray-900"
                        }`}
                      >
                        Blocked Riders
                      </Text>
                      <Text
                        className={`text-sm ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        {stats.riders.blocked}{" "}
                        {stats.riders.blocked === 1 ? "rider" : "riders"} need
                        attention
                      </Text>
                    </View>
                  </View>
                  <Icons.navigation
                    name={IconNames.arrowForward as any}
                    size={20}
                    color={isDark ? "#EF4444" : "#DC2626"}
                  />
                </View>
              </TouchableOpacity>
            </Reanimated.View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="mb-8">
          <Text
            className={`text-xl font-bold mb-4 ${
              isDark ? "text-light-100" : "text-gray-900"
            }`}
          >
            Quick Actions
          </Text>

          <View className="flex-row flex-wrap gap-4">
            <Reanimated.View
              entering={FadeInDown.delay(500)}
              className="flex-1 min-w-[45%]"
            >
              <TouchableOpacity
                onPress={() => router.push(Routes.admin.orders as any)}
                className={`rounded-2xl p-6 ${
                  isDark ? "bg-secondary" : "bg-white"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <Icons.package
                  name={MCIconNames.packageVariant as any}
                  size={32}
                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                />
                <Text
                  className={`text-lg font-bold mt-3 ${
                    isDark ? "text-light-100" : "text-gray-900"
                  }`}
                >
                  All Orders
                </Text>
                <Text
                  className={`text-sm mt-1 ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  View and manage
                </Text>
              </TouchableOpacity>
            </Reanimated.View>

            <Reanimated.View
              entering={FadeInDown.delay(550)}
              className="flex-1 min-w-[45%]"
            >
              <TouchableOpacity
                onPress={() => router.push(Routes.admin.riders as any)}
                className={`rounded-2xl p-6 ${
                  isDark ? "bg-secondary" : "bg-white"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <Icons.delivery
                  name={MCIconNames.delivery as any}
                  size={32}
                  color={isDark ? "#30D158" : "#10B981"}
                />
                <Text
                  className={`text-lg font-bold mt-3 ${
                    isDark ? "text-light-100" : "text-gray-900"
                  }`}
                >
                  All Riders
                </Text>
                <Text
                  className={`text-sm mt-1 ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Manage riders
                </Text>
              </TouchableOpacity>
            </Reanimated.View>

            <Reanimated.View
              entering={FadeInDown.delay(600)}
              className="flex-1 min-w-[45%]"
            >
              <TouchableOpacity
                onPress={() => router.push(Routes.admin.customers as any)}
                className={`rounded-2xl p-6 ${
                  isDark ? "bg-secondary" : "bg-white"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <Icons.user
                  name={IconNames.people as any}
                  size={32}
                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                />
                <Text
                  className={`text-lg font-bold mt-3 ${
                    isDark ? "text-light-100" : "text-gray-900"
                  }`}
                >
                  All Customers
                </Text>
                <Text
                  className={`text-sm mt-1 ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  View customers
                </Text>
              </TouchableOpacity>
            </Reanimated.View>

            <Reanimated.View
              entering={FadeInDown.delay(650)}
              className="flex-1 min-w-[45%]"
            >
              <TouchableOpacity
                onPress={() => router.push(Routes.admin.payouts as any)}
                className={`rounded-2xl p-6 ${
                  isDark ? "bg-secondary" : "bg-white"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <Icons.money
                  name={MCIconNames.cashMultiple as any}
                  size={32}
                  color={isDark ? "#FBBF24" : "#F59E0B"}
                />
                <Text
                  className={`text-lg font-bold mt-3 ${
                    isDark ? "text-light-100" : "text-gray-900"
                  }`}
                >
                  Payouts
                </Text>
                <Text
                  className={`text-sm mt-1 ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Manage payouts
                </Text>
              </TouchableOpacity>
            </Reanimated.View>

            <Reanimated.View
              entering={FadeInDown.delay(700)}
              className="flex-1 min-w-[45%]"
            >
              <TouchableOpacity
                onPress={() => router.push(Routes.admin.rates as any)}
                className={`rounded-2xl p-6 ${
                  isDark ? "bg-secondary" : "bg-white"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <Icons.settings
                  name={IconNames.settings as any}
                  size={32}
                  color={isDark ? "#8B5CF6" : "#7C3AED"}
                />
                <Text
                  className={`text-lg font-bold mt-3 ${
                    isDark ? "text-light-100" : "text-gray-900"
                  }`}
                >
                  Delivery Rates
                </Text>
                <Text
                  className={`text-sm mt-1 ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Configure pricing
                </Text>
              </TouchableOpacity>
            </Reanimated.View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
