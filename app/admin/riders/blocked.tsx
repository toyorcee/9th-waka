import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { BlockedRider, getBlockedRiders } from "@/services/adminApi";
import { apiClient } from "@/services/apiClient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

export default function AdminBlockedRidersScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  const [riders, setRiders] = useState<BlockedRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  // Animation refs
  const icon1Anim = useRef(new Animated.Value(1)).current;

  // These are standalone pages, not in tabs, so no tab bar height needed
  const contentBottomPadding = insets.bottom + 32;

  const loadBlockedRiders = useCallback(
    async (showRefreshing = false) => {
      if (!user || user.role !== "admin") return;
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await getBlockedRiders();
        setRiders(response.riders || []);
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Failed to load blocked riders",
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
      loadBlockedRiders();
    }
  }, [user, authLoading, loadBlockedRiders]);

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

  const handleUnblock = async (riderId: string) => {
    Alert.alert(
      "Unblock Rider",
      "Are you sure you want to unblock this rider? This will allow them to receive orders again.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Unblock",
          style: "destructive",
          onPress: async () => {
            setUnblockingId(riderId);
            try {
              await apiClient.patch(`/payouts/admin/riders/${riderId}/unblock`);
              Toast.show({
                type: "success",
                text1: "Rider unblocked",
                text2: "The rider can now receive orders again",
              });
              loadBlockedRiders();
            } catch (error: any) {
              Toast.show({
                type: "error",
                text1: "Failed to unblock rider",
                text2:
                  error?.response?.data?.error ||
                  error?.message ||
                  "Please try again",
              });
            } finally {
              setUnblockingId(null);
            }
          },
        },
      ]
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
        <View className="flex-row items-center justify-between">
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
                isDark ? "bg-danger/20" : "bg-red-900/20"
              }`}
            >
              <Icons.safety
                name={IconNames.security as any}
                size={20}
                color={isDark ? "#EF4444" : "#DC2626"}
              />
            </View>
            <View className="flex-1">
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-light-100" : "text-gray-900"
                }`}
              >
                Blocked Riders
              </Text>
              <Text
                className={`text-xs ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                {riders.length} {riders.length === 1 ? "rider" : "riders"}{" "}
                blocked
              </Text>
            </View>
          </View>
        </View>
      </Reanimated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 120, // Header height + safe area
          paddingBottom: insets.bottom + 100, // Tab bar + safe area
          paddingHorizontal: 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBlockedRiders(true)}
            tintColor={isDark ? "#AB8BFF" : "#1E3A8A"}
          />
        }
      >
        {riders.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Icons.safety
              name={IconNames.checkmarkCircle as any}
              size={64}
              color={isDark ? "#10B981" : "#059669"}
            />
            <Text
              className={`text-lg font-semibold mt-4 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              No blocked riders
            </Text>
            <Text
              className={`text-sm mt-2 text-center ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              All riders are currently active
            </Text>
          </View>
        ) : (
          <>
            {riders.map((rider, index) => (
              <Reanimated.View
                key={rider._id}
                entering={FadeInDown.delay(index * 50)}
              >
                <View
                  className={`rounded-2xl p-4 mb-4 ${
                    isDark ? "bg-secondary" : "bg-white"
                  }`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 3,
                    borderLeftWidth: 4,
                    borderLeftColor: isDark ? "#EF4444" : "#DC2626",
                  }}
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text
                        className={`text-lg font-bold mb-1 ${
                          isDark ? "text-light-100" : "text-gray-900"
                        }`}
                      >
                        {rider.fullName}
                      </Text>
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
                        BLOCKED
                      </Text>
                    </View>
                  </View>

                  <View className="mb-3">
                    <View className="flex-row items-center mb-2">
                      <Icons.action
                        name={IconNames.alert as any}
                        size={16}
                        color={isDark ? "#FBBF24" : "#F59E0B"}
                      />
                      <Text
                        className={`text-sm ml-2 ${
                          isDark ? "text-light-300" : "text-gray-700"
                        }`}
                      >
                        Strikes: {rider.strikes}
                      </Text>
                    </View>
                    {rider.paymentBlockedAt && (
                      <View className="flex-row items-center mb-2">
                        <Icons.time
                          name={IconNames.time as any}
                          size={16}
                          color={isDark ? "#AB8BFF" : "#1E3A8A"}
                        />
                        <Text
                          className={`text-sm ml-2 ${
                            isDark ? "text-light-300" : "text-gray-700"
                          }`}
                        >
                          Blocked: {formatDate(rider.paymentBlockedAt)}
                        </Text>
                      </View>
                    )}
                    {rider.paymentBlockedReason && (
                      <View className="mt-2">
                        <Text
                          className={`text-xs ${
                            isDark ? "text-light-400" : "text-gray-500"
                          }`}
                        >
                          Reason: {rider.paymentBlockedReason}
                        </Text>
                      </View>
                    )}
                    {rider.currentWeekPayout && (
                      <View className="mt-2">
                        <Text
                          className={`text-sm font-semibold ${
                            isDark ? "text-warning" : "text-yellow-600"
                          }`}
                        >
                          Owed: ₦
                          {Number(
                            rider.currentWeekPayout.commission || 0
                          ).toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => handleUnblock(rider._id)}
                    disabled={unblockingId === rider._id}
                    className={`rounded-xl px-4 py-3 items-center ${
                      isDark ? "bg-active" : "bg-green-600"
                    }`}
                    activeOpacity={0.7}
                  >
                    {unblockingId === rider._id ? (
                      <ActivityIndicator
                        size="small"
                        color={isDark ? "#030014" : "#FFFFFF"}
                      />
                    ) : (
                      <Text
                        className={`font-bold ${
                          isDark ? "text-primary" : "text-white"
                        }`}
                      >
                        Unblock Rider
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Reanimated.View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
