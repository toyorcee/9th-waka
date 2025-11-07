import { SocketEvents } from "@/constants/socketEvents";
import { useAuth } from "@/contexts/AuthContext";
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  if (!isRider) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <Text className="text-light-300">
          Earnings available for riders only
        </Text>
      </View>
    );
  }

  if (!earnings) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <Text className="text-light-300">No earnings data</Text>
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
      className="flex-1 bg-primary"
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: contentBottomPadding,
      }}
    >
      <View className="pt-4 px-6 pb-10">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-light-100 text-3xl font-bold">Earnings</Text>
          <TouchableOpacity
            onPress={() => loadEarnings(true)}
            disabled={refreshing}
            className="bg-secondary border border-neutral-100 rounded-xl px-3 py-2"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#AB8BFF" />
            ) : (
              <Text className="text-light-200">Refresh</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Payment Reminder */}
        {isFriday && currentWeek.totals.riderNet > 0 && (
          <View className="bg-yellow-500/20 border border-yellow-500/50 rounded-2xl p-4 mb-4">
            <Text className="text-yellow-400 font-bold mb-1">
              💰 Payment Tomorrow!
            </Text>
            <Text className="text-light-200 text-sm">
              Your weekly earnings of ₦
              {currentWeek.totals.riderNet.toLocaleString()} will be paid on
              Saturday
            </Text>
          </View>
        )}

        {/* Current Week Summary */}
        <View className="bg-secondary border border-neutral-100 rounded-2xl p-6 mb-4">
          <Text className="text-light-300 text-sm mb-1">This Week</Text>
          <Text className="text-light-400 text-xs mb-4">
            {weekStart.toLocaleDateString()} -{" "}
            {new Date(weekEnd.getTime() - 1).toLocaleDateString()} (Sun-Sat)
          </Text>
          <Text className="text-accent text-4xl font-bold mb-4">
            ₦{currentWeek.totals.riderNet.toLocaleString()}
          </Text>
          <View className="pt-4 border-t border-neutral-100">
            <View className="flex-row justify-between mb-2">
              <Text className="text-light-400 text-xs">Total Trips</Text>
              <Text className="text-light-200 font-semibold">
                {currentWeek.totals.count}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-light-400 text-xs">Gross Earnings</Text>
              <Text className="text-light-200 font-semibold">
                ₦{currentWeek.totals.gross.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-light-400 text-xs">Commission (10%)</Text>
              <Text className="text-red-400 font-semibold">
                -₦{currentWeek.totals.commission.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between pt-2 border-t border-neutral-100 mt-2">
              <Text className="text-light-200 font-bold">Your Net</Text>
              <Text className="text-accent font-bold text-lg">
                ₦{currentWeek.totals.riderNet.toLocaleString()}
              </Text>
            </View>
          </View>
          {currentWeek.payout && (
            <View className="mt-4 pt-4 border-t border-neutral-100">
              <Text className="text-light-400 text-xs mb-1">Payout Status</Text>
              <Text
                className={`font-semibold ${
                  currentWeek.payout.status === "paid"
                    ? "text-green-400"
                    : "text-yellow-400"
                }`}
              >
                {currentWeek.payout.status === "paid" ? "✓ Paid" : "⏳ Pending"}
              </Text>
              {currentWeek.payout.paidAt && (
                <Text className="text-light-400 text-xs mt-1">
                  Paid:{" "}
                  {new Date(currentWeek.payout.paidAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* All-Time Stats */}
        <View className="bg-secondary border border-neutral-100 rounded-2xl p-5 mb-4">
          <Text className="text-light-200 text-lg font-semibold mb-4">
            All-Time Stats
          </Text>
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-light-300">Total Deliveries</Text>
              <Text className="text-light-100 font-bold">
                {allTime.totals.count}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-light-300">Total Earnings</Text>
              <Text className="text-accent font-bold">
                ₦{allTime.totals.riderNet.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-light-300">Total Commission</Text>
              <Text className="text-light-400">
                ₦{allTime.totals.commission.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Trip Breakdown */}
        <View className="bg-secondary border border-neutral-100 rounded-2xl p-5 mb-4">
          <Text className="text-light-200 text-lg font-semibold mb-4">
            This Week's Trips ({currentWeek.trips.length})
          </Text>
          {currentWeek.trips.length === 0 ? (
            <Text className="text-light-400 text-center py-4">
              No deliveries this week yet
            </Text>
          ) : (
            <View className="gap-3">
              {currentWeek.trips.map((trip) => (
                <TouchableOpacity
                  key={trip.orderId}
                  onPress={() => router.push(`/orders/${trip.orderId}` as any)}
                  className="bg-dark-100 rounded-xl p-4 border border-neutral-100"
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-light-200 font-semibold mb-1">
                        {trip.pickup} → {trip.dropoff}
                      </Text>
                      <Text className="text-light-400 text-xs">
                        {new Date(trip.deliveredAt).toLocaleString()}
                      </Text>
                    </View>
                    <Text className="text-accent font-bold">
                      ₦{trip.riderNetAmount.toLocaleString()}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between pt-2 border-t border-neutral-100 mt-2">
                    <Text className="text-light-400 text-xs">
                      Gross: ₦{trip.grossAmount.toLocaleString()}
                    </Text>
                    <Text className="text-red-400 text-xs">
                      Commission: -₦{trip.commissionAmount.toLocaleString()}
                    </Text>
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
