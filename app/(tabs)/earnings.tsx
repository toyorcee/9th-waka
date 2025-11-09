import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { SocketEvents } from "@/constants/socketEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { EarningsData, getRiderEarnings } from "@/services/riderApi";
import { socketClient } from "@/services/socketClient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function EarningsScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isRider = user?.role === "rider";
  const tabBarHeight = 65;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 20;
  const contentBottomPadding = tabBarHeight + bottomPadding + 32;

  const loadEarnings = async (showRefreshing = false) => {
    if (!isRider) return;
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getRiderEarnings();
      setEarnings(data);
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load earnings",
        text2: e?.response?.data?.error || e?.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isRider) {
      loadEarnings();
    }
  }, [isRider]);

  // Listen for delivery completion to refresh earnings in real-time
  useEffect(() => {
    if (!isRider) return;

    const handleDelivery = () => {
      // Refresh earnings when order is delivered
      loadEarnings();
    };

    const socket = socketClient.socketInstance;
    if (socket && socket.connected) {
      socket.on(SocketEvents.DELIVERY_VERIFIED, handleDelivery);
      return () => {
        socket.off(SocketEvents.DELIVERY_VERIFIED, handleDelivery);
      };
    }
  }, [isRider]);

  if (authLoading || loading) {
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

  if (!isRider) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-primary" : "bg-white"
        }`}
      >
        <Text className={`${isDark ? "text-light-300" : "text-gray-600"}`}>
          Earnings available for riders only
        </Text>
      </View>
    );
  }

  if (!earnings) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-primary" : "bg-white"
        }`}
      >
        <Text className={`${isDark ? "text-light-300" : "text-gray-600"}`}>
          No earnings data
        </Text>
      </View>
    );
  }

  const { currentWeek, allTime } = earnings;
  const weekStart = new Date(currentWeek.weekStart);
  const weekEnd = new Date(currentWeek.weekEnd);
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const isFriday = dayOfWeek === 5; // Friday = day before Saturday payment

  return (
    <ScrollView
      className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: contentBottomPadding,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="pt-6 px-5 pb-10">
        {/* Modern Header with Icon */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center flex-1">
            <View className="bg-accent/20 rounded-xl p-2.5 mr-3">
              <Icons.money
                name={MCIconNames.cash as any}
                size={22}
                color="#AB8BFF"
              />
            </View>
            <View className="flex-1">
              <Text
                className={`text-xl font-bold mb-0.5 ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Earnings
              </Text>
              <Text
                className={`text-xs ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                Track your delivery income
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => loadEarnings(true)}
            disabled={refreshing}
            className="bg-accent/20 border border-accent/30 rounded-xl p-2.5"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#AB8BFF" />
            ) : (
              <Icons.action
                name={IconNames.refreshCircle as any}
                size={22}
                color="#AB8BFF"
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Payment Reminder */}
        {isFriday && currentWeek.totals.riderNet > 0 && (
          <View
            className="bg-warning/20 border border-warning/30 rounded-3xl p-5 mb-6"
            style={{
              shadowColor: "#FF9500",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <View className="flex-row items-start">
              <View className="bg-warning/30 rounded-2xl p-2.5 mr-3">
                <Icons.money
                  name={MCIconNames.cashMultiple as any}
                  size={24}
                  color="#FF9500"
                />
              </View>
              <View className="flex-1">
                <Text className="text-warning font-bold text-lg mb-1">
                  Payment Tomorrow!
                </Text>
                <Text
                  className={`text-sm leading-5 ${
                    isDark ? "text-light-200" : "text-black"
                  }`}
                >
                  Your weekly earnings of ₦
                  {currentWeek.totals.riderNet.toLocaleString()} will be paid on
                  Saturday
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Current Week Summary */}
        <View
          className={`border rounded-3xl p-6 mb-6 ${
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
          <View className="flex-row items-center mb-4">
            <View className="bg-accent/20 rounded-xl p-2 mr-3">
              <Icons.time
                name={IconNames.calendarOutline as any}
                size={20}
                color="#AB8BFF"
              />
            </View>
            <View className="flex-1">
              <Text
                className={`text-lg font-bold mb-1 ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                This Week
              </Text>
              <Text
                className={`text-xs ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                {weekStart.toLocaleDateString()} -{" "}
                {new Date(weekEnd.getTime() - 1).toLocaleDateString()} (Sun-Sat)
              </Text>
            </View>
          </View>
          <View className="bg-dark-100/50 rounded-2xl p-4 mb-4">
            <Text
              className={`text-xs mb-2 ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              Net Earnings
            </Text>
            <View className="flex-row items-center">
              <Icons.money
                name={MCIconNames.cash as any}
                size={28}
                color="#30D158"
                style={{ marginRight: 8 }}
              />
              <Text className="text-accent text-4xl font-bold">
                ₦{currentWeek.totals.riderNet.toLocaleString()}
              </Text>
            </View>
          </View>
          <View className="pt-4 border-t border-neutral-100">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <Icons.delivery
                  name={MCIconNames.delivery as any}
                  size={16}
                  color="#5AC8FA"
                  style={{ marginRight: 8 }}
                />
                <Text
                  className={`text-sm ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Total Trips
                </Text>
              </View>
              <Text
                className={`font-bold text-base ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                {currentWeek.totals.count}
              </Text>
            </View>
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <Icons.money
                  name={MCIconNames.cashMultiple as any}
                  size={16}
                  color="#AB8BFF"
                  style={{ marginRight: 8 }}
                />
                <Text
                  className={`text-sm ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Gross Earnings
                </Text>
              </View>
              <Text
                className={`font-semibold text-base ${
                  isDark ? "text-light-200" : "text-black"
                }`}
              >
                ₦{currentWeek.totals.gross.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <Icons.money
                  name={MCIconNames.cash as any}
                  size={16}
                  color="#FF3B30"
                  style={{ marginRight: 8 }}
                />
                <Text
                  className={`text-sm ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Commission (10%)
                </Text>
              </View>
              <Text className="text-danger font-semibold text-base">
                -₦{currentWeek.totals.commission.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between items-center pt-3 border-t border-neutral-100 mt-2">
              <Text
                className={`font-bold text-base ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Your Net
              </Text>
              <Text className="text-accent font-bold text-xl">
                ₦{currentWeek.totals.riderNet.toLocaleString()}
              </Text>
            </View>
          </View>
          {currentWeek.payout && (
            <View className="mt-4 pt-4 border-t border-neutral-100">
              <View className="flex-row items-center mb-2">
                <Icons.status
                  name={
                    currentWeek.payout.status === "paid"
                      ? (IconNames.checkmarkCircle as any)
                      : (IconNames.timeOutline as any)
                  }
                  size={16}
                  color={
                    currentWeek.payout.status === "paid" ? "#30D158" : "#FF9500"
                  }
                  style={{ marginRight: 8 }}
                />
                <Text
                  className={`text-xs ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Payout Status
                </Text>
              </View>
              <Text
                className={`font-bold text-base ${
                  currentWeek.payout.status === "paid"
                    ? "text-active"
                    : "text-warning"
                }`}
              >
                {currentWeek.payout.status === "paid" ? "✓ Paid" : "⏳ Pending"}
              </Text>
              {currentWeek.payout.paidAt && (
                <Text
                  className={`text-xs mt-1 ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Paid:{" "}
                  {new Date(currentWeek.payout.paidAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* All-Time Stats */}
        <View
          className={`border rounded-3xl p-6 mb-6 ${
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
          <View className="flex-row items-center mb-5">
            <View className="bg-info/20 rounded-xl p-2 mr-3">
              <Icons.status
                name={IconNames.starOutline as any}
                size={20}
                color="#5AC8FA"
              />
            </View>
            <Text className="text-light-100 text-xl font-bold">
              All-Time Stats
            </Text>
          </View>
          <View className="gap-4">
            <View className="flex-row items-center justify-between bg-dark-100/50 rounded-xl p-3">
              <View className="flex-row items-center">
                <Icons.delivery
                  name={MCIconNames.delivery as any}
                  size={18}
                  color="#5AC8FA"
                  style={{ marginRight: 10 }}
                />
                <Text className="text-light-300 text-sm">Total Deliveries</Text>
              </View>
              <Text
                className={`font-bold text-base ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                {allTime.totals.count}
              </Text>
            </View>
            <View className="flex-row items-center justify-between bg-dark-100/50 rounded-xl p-3">
              <View className="flex-row items-center">
                <Icons.money
                  name={MCIconNames.cashMultiple as any}
                  size={18}
                  color="#30D158"
                  style={{ marginRight: 10 }}
                />
                <Text className="text-light-300 text-sm">Total Earnings</Text>
              </View>
              <Text className="text-accent font-bold text-base">
                ₦{allTime.totals.riderNet.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row items-center justify-between bg-dark-100/50 rounded-xl p-3">
              <View className="flex-row items-center">
                <Icons.money
                  name={MCIconNames.cash as any}
                  size={18}
                  color="#FF3B30"
                  style={{ marginRight: 10 }}
                />
                <Text className="text-light-300 text-sm">Total Commission</Text>
              </View>
              <Text className="text-light-400 font-semibold text-sm">
                ₦{allTime.totals.commission.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Trip Breakdown */}
        <View
          className="bg-secondary border border-neutral-100 rounded-3xl p-6 mb-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center mb-5">
            <View className="bg-accent/20 rounded-xl p-2 mr-3">
              <Icons.package
                name={MCIconNames.packageVariant as any}
                size={20}
                color="#AB8BFF"
              />
            </View>
            <Text className="text-light-100 text-xl font-bold">
              This Week's Trips
            </Text>
            {currentWeek.trips.length > 0 && (
              <View className="bg-accent/20 rounded-full px-3 py-1 ml-3">
                <Text className="text-accent text-xs font-bold">
                  {currentWeek.trips.length}
                </Text>
              </View>
            )}
          </View>
          {currentWeek.trips.length === 0 ? (
            <View className="items-center py-6">
              <View className="bg-dark-100 rounded-full p-4 mb-3">
                <Icons.delivery
                  name={MCIconNames.delivery as any}
                  size={32}
                  color="#9CA4AB"
                />
              </View>
              <Text className="text-light-400 text-sm text-center">
                No deliveries this week yet
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {currentWeek.trips.map((trip) => (
                <TouchableOpacity
                  key={trip.orderId}
                  onPress={() => router.push(`/orders/${trip.orderId}` as any)}
                  className="bg-dark-100 rounded-2xl p-4 border border-neutral-100 active:opacity-80"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 mr-3">
                      <View className="flex-row items-center mb-2">
                        <Icons.location
                          name={IconNames.locationOutline as any}
                          size={14}
                          color="#5AC8FA"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-light-200 font-semibold text-sm flex-1">
                          {trip.pickup} → {trip.dropoff}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Icons.time
                          name={IconNames.timeOutline as any}
                          size={12}
                          color="#9CA4AB"
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          className={`text-xs ${
                            isDark ? "text-light-400" : "text-gray-500"
                          }`}
                        >
                          {new Date(trip.deliveredAt).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-accent/20 border border-accent/30 rounded-xl px-3 py-2">
                      <Text className="text-accent font-bold text-base">
                        ₦{trip.riderNetAmount.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between pt-3 border-t border-neutral-100">
                    <View className="flex-row items-center">
                      <Icons.money
                        name={MCIconNames.cashMultiple as any}
                        size={14}
                        color="#AB8BFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        Gross: ₦{trip.grossAmount.toLocaleString()}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Icons.money
                        name={MCIconNames.cash as any}
                        size={14}
                        color="#FF3B30"
                        style={{ marginRight: 6 }}
                      />
                      <Text className="text-danger text-xs">
                        -₦{trip.commissionAmount.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
      {/* Bottom spacer to prevent content from going under tab bar */}
      <View
        style={{ height: contentBottomPadding, backgroundColor: "#030014" }}
      />
    </ScrollView>
  );
}
