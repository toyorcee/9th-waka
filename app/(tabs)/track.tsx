import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { getMyOrders, Order } from "@/services/orderApi";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
      return { bg: "bg-neutral-100/20", text: "text-light-300", label: status };
  }
};

const formatDate = (date: string | Date) => {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function TrackScreen() {
  const { isLoading: authLoading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tabBarHeight = 65;

  const loadOrders = async (showRefreshing = false) => {
    if (!isAuthenticated) return;
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await getMyOrders(1, 50);
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
    } catch (e) {
      console.error("Error loading orders:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
      const interval = setInterval(() => loadOrders(false), 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  const statistics = React.useMemo(() => {
    const total = activeOrders.length;
    const inTransit = activeOrders.filter(
      (o) => o.status === "delivering"
    ).length;
    const completed = recentOrders.length;
    return { total, inTransit, completed };
  }, [activeOrders, recentOrders]);

  return (
    <ScrollView
      className="flex-1 bg-primary"
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: tabBarHeight + insets.bottom + 40,
        paddingHorizontal: 24,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadOrders(true)}
          tintColor="#AB8BFF"
        />
      }
    >
      <View>
        {/* Enhanced Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center flex-1">
            <View className="bg-accent/20 rounded-lg p-1.5 mr-3">
              <Icons.map
                name={IconNames.mapOutline as any}
                size={20}
                color="#AB8BFF"
              />
            </View>
            <View className="flex-1">
              <Text className="text-light-100 text-2xl font-bold mb-1">
                Track Deliveries
              </Text>
              <Text className="text-light-400 text-xs">
                Real-time delivery tracking
              </Text>
            </View>
          </View>
          {statistics.total > 0 && (
            <View className="bg-accent/20 rounded-full px-3 py-1.5 border border-accent/30">
              <Text className="text-accent text-xs font-bold">
                {statistics.total} active
              </Text>
            </View>
          )}
        </View>

        {/* Statistics Cards */}
        {isAuthenticated && (
          <View className="flex-row gap-3 mb-6">
            <View
              className="bg-secondary rounded-2xl p-4 flex-1 border border-neutral-100"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View className="flex-row items-center mb-2">
                <View className="bg-accent/20 rounded-lg p-1 mr-2">
                  <Icons.package
                    name={IconNames.packageOutline as any}
                    size={14}
                    color="#AB8BFF"
                  />
                </View>
                <Text className="text-light-400 text-xs">Active</Text>
              </View>
              <Text className="text-light-100 text-xl font-bold">
                {statistics.total}
              </Text>
            </View>
            <View
              className="bg-secondary rounded-2xl p-4 flex-1 border border-neutral-100"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View className="flex-row items-center mb-2">
                <View className="bg-info/20 rounded-lg p-1 mr-2">
                  <Icons.map
                    name={IconNames.mapOutline as any}
                    size={14}
                    color="#5AC8FA"
                  />
                </View>
                <Text className="text-light-400 text-xs">In Transit</Text>
              </View>
              <Text className="text-light-100 text-xl font-bold">
                {statistics.inTransit}
              </Text>
            </View>
            <View
              className="bg-secondary rounded-2xl p-4 flex-1 border border-neutral-100"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View className="flex-row items-center mb-2">
                <View className="bg-success/20 rounded-lg p-1 mr-2">
                  <Icons.status
                    name={IconNames.checkmarkCircle as any}
                    size={14}
                    color="#30D158"
                  />
                </View>
                <Text className="text-light-400 text-xs">Recent</Text>
              </View>
              <Text className="text-light-100 text-xl font-bold">
                {statistics.completed}
              </Text>
            </View>
          </View>
        )}

        {/* Map Section */}
        <View
          className="bg-secondary rounded-3xl p-6 items-center justify-center mb-6 border border-neutral-100 min-h-[300px]"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {activeOrders.length > 0 ? (
            <>
              <View className="bg-accent/20 rounded-full p-6 mb-4">
                <Icons.map
                  name={IconNames.mapOutline as any}
                  size={48}
                  color="#AB8BFF"
                />
              </View>
              <View className="flex-row items-center mb-2">
                <View className="bg-accent/20 rounded-lg p-1.5 mr-2">
                  <Icons.location
                    name={IconNames.locationOutline as any}
                    size={18}
                    color="#AB8BFF"
                  />
                </View>
                <Text className="text-light-100 text-lg font-bold">
                  Live Tracking Active
                </Text>
              </View>
              <Text className="text-light-400 text-sm text-center leading-5 px-4">
                {activeOrders.length} delivery
                {activeOrders.length > 1 ? "ies" : ""} being tracked in
                real-time
              </Text>
            </>
          ) : (
            <>
              <View className="bg-dark-100 rounded-full p-8 mb-6">
                <Icons.map
                  name={IconNames.mapOutline as any}
                  size={64}
                  color="#9CA4AB"
                />
              </View>
              <View className="flex-row items-center mb-3">
                <View className="bg-accent/20 rounded-lg p-1.5 mr-2">
                  <Icons.location
                    name={IconNames.locationOutline as any}
                    size={18}
                    color="#AB8BFF"
                  />
                </View>
                <Text className="text-light-100 text-lg font-bold">
                  Real-time Tracking
                </Text>
              </View>
              <Text className="text-light-400 text-sm text-center leading-5 px-4">
                Active delivery tracking will appear here with live location
                updates
              </Text>
            </>
          )}
        </View>

        {/* Active Deliveries Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="bg-info/20 rounded-lg p-1.5 mr-2">
                <Icons.package
                  name={IconNames.packageOutline as any}
                  size={18}
                  color="#5AC8FA"
                />
              </View>
              <Text className="text-light-100 text-lg font-bold">
                Active Deliveries
              </Text>
            </View>
            {activeOrders.length > 0 && (
              <View className="bg-info/20 rounded-full px-3 py-1 border border-info/30">
                <Text className="text-info text-xs font-bold">
                  {activeOrders.length}
                </Text>
              </View>
            )}
          </View>

          {loading ? (
            <View className="bg-secondary rounded-3xl p-8 border border-neutral-100 items-center">
              <ActivityIndicator size="large" color="#AB8BFF" />
            </View>
          ) : activeOrders.length > 0 ? (
            <View className="gap-3">
              {activeOrders.map((order) => {
                const statusInfo = getStatusColor(order.status);
                return (
                  <TouchableOpacity
                    key={order._id}
                    onPress={() => {
                      router.push({
                        pathname: "/orders/[id]",
                        params: { id: order._id },
                      });
                    }}
                    className="bg-secondary rounded-3xl p-5 border border-neutral-100"
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-2">
                          <View className="bg-accent/20 rounded-lg p-1.5 mr-2">
                            <Icons.package
                              name={IconNames.packageOutline as any}
                              size={14}
                              color="#AB8BFF"
                            />
                          </View>
                          <Text className="text-light-100 font-bold text-base flex-1">
                            {order.items}
                          </Text>
                        </View>
                        <View className="mb-2">
                          <View className="flex-row items-start mb-1">
                            <Icons.location
                              name={IconNames.locationOutline as any}
                              size={12}
                              color="#5AC8FA"
                              style={{ marginRight: 4, marginTop: 2 }}
                            />
                            <Text className="text-light-300 text-xs flex-1">
                              {order.pickup.address}
                            </Text>
                          </View>
                          <View className="flex-row items-start">
                            <Icons.location
                              name={IconNames.locationOutline as any}
                              size={12}
                              color="#FF9500"
                              style={{ marginRight: 4, marginTop: 2 }}
                            />
                            <Text className="text-light-300 text-xs flex-1">
                              {order.dropoff.address}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <View
                            className={`px-2.5 py-1 rounded-lg border ${statusInfo.bg} ${statusInfo.text} border-current/30`}
                          >
                            <Text
                              className={`text-xs font-bold ${statusInfo.text}`}
                            >
                              {statusInfo.label}
                            </Text>
                          </View>
                          {order.distanceKm && (
                            <View className="flex-row items-center">
                              <Icons.map
                                name={IconNames.mapOutline as any}
                                size={10}
                                color="#9CA4AB"
                                style={{ marginRight: 4 }}
                              />
                              <Text className="text-light-400 text-xs">
                                {order.distanceKm.toFixed(1)} km
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      className="bg-accent rounded-xl px-4 py-2.5 flex-row items-center justify-center"
                      style={{
                        shadowColor: "#AB8BFF",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                      }}
                    >
                      <Icons.map
                        name={IconNames.mapOutline as any}
                        size={16}
                        color="#030014"
                        style={{ marginRight: 6 }}
                      />
                      <Text className="text-primary font-bold text-sm">
                        View Details
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="bg-secondary rounded-3xl p-8 border border-neutral-100 items-center">
              <View className="bg-dark-100 rounded-full p-5 mb-4">
                <Icons.delivery
                  name={MCIconNames.delivery as any}
                  size={40}
                  color="#9CA4AB"
                />
              </View>
              <Text className="text-light-200 text-lg font-bold mb-2">
                No active deliveries
              </Text>
              <Text className="text-light-400 text-sm text-center">
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
                <View className="bg-success/20 rounded-lg p-1.5 mr-2">
                  <Icons.status
                    name={IconNames.checkmarkCircle as any}
                    size={18}
                    color="#30D158"
                  />
                </View>
                <Text className="text-light-100 text-lg font-bold">
                  Recent Deliveries
                </Text>
              </View>
            </View>
            <View className="gap-3">
              {recentOrders.map((order) => (
                <TouchableOpacity
                  key={order._id}
                  onPress={() => {
                    router.push({
                      pathname: "/orders/[id]",
                      params: { id: order._id },
                    });
                  }}
                  className="bg-secondary rounded-2xl p-4 border border-neutral-100"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-light-100 font-semibold text-sm mb-1">
                        {order.items}
                      </Text>
                      <View className="flex-row items-center">
                        <Icons.time
                          name={IconNames.timeOutline as any}
                          size={12}
                          color="#9CA4AB"
                          style={{ marginRight: 4 }}
                        />
                        <Text className="text-light-400 text-xs">
                          {formatDate(order.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-success/20 rounded-lg px-2.5 py-1 border border-success/30">
                      <Text className="text-success text-xs font-bold">
                        Delivered
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
