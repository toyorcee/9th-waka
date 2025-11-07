import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { acceptOrder, getAvailableOrders, Order } from "@/services/orderApi";
import { updateRiderPresence } from "@/services/riderApi";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function DeliveriesScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const isRider = user?.role === "rider";
  const [online, setOnline] = React.useState(false);
  const [availableOrders, setAvailableOrders] = React.useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState(false);
  const locationTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const stopLocationUpdates = React.useCallback(() => {
    if (locationTimerRef.current) {
      clearInterval(locationTimerRef.current as any);
      locationTimerRef.current = null;
    }
  }, []);

  const sendLocationOnce = React.useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      throw new Error("Location permission denied");
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await updateRiderPresence(true, pos.coords.latitude, pos.coords.longitude);
  }, []);

  const fetchAvailableOrders = React.useCallback(async () => {
    if (!online || !isRider) return;
    setLoadingOrders(true);
    try {
      const orders = await getAvailableOrders();
      setAvailableOrders(orders);
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load orders",
        text2: e?.message || "Try again",
      });
    } finally {
      setLoadingOrders(false);
    }
  }, [online, isRider]);

  React.useEffect(() => {
    if (!online) {
      stopLocationUpdates();
      setAvailableOrders([]);
      return;
    }
    // initial send
    sendLocationOnce().catch((e) => {
      Toast.show({
        type: "error",
        text1: "Location error",
        text2: e?.message || "Grant permission",
      });
    });
    // periodic
    locationTimerRef.current = setInterval(() => {
      sendLocationOnce().catch(() => {});
    }, 30000);
    // Fetch orders when going online
    fetchAvailableOrders();
    return () => {
      stopLocationUpdates();
    };
  }, [online, sendLocationOnce, stopLocationUpdates, fetchAvailableOrders]);

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await acceptOrder(orderId);
      Toast.show({ type: "success", text1: "Order accepted" });
      await fetchAvailableOrders();
      router.push(`/orders/${orderId}` as any);
    } catch (e: any) {
      const errorMessage =
        e?.response?.data?.error || e?.message || "Failed to accept order";
      const isKycError = e?.response?.data?.kycRequired === true;

      if (isKycError) {
        Toast.show({
          type: "error",
          text1: "KYC Verification Required",
          text2:
            "Please complete your profile with NIN or BVN to accept orders",
        });
        // Navigate to profile edit after a short delay
        setTimeout(() => {
          router.push("/profile/edit" as any);
        }, 1500);
      } else {
        Toast.show({
          type: "error",
          text1: "Failed to accept",
          text2: errorMessage,
        });
      }
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  // Check KYC completion status for riders
  const isKycComplete = React.useMemo(() => {
    if (!isRider || !user) return false;
    const hasNin = user.nin && user.nin.trim().length > 0;
    const hasBvn = user.bvn && user.bvn.trim().length > 0;
    return hasNin || hasBvn;
  }, [isRider, user]);

  return (
    <ScrollView className="flex-1 bg-primary">
      <View className="pt-20 px-6 pb-8">
        <Text className="text-light-100 text-3xl font-bold mb-6">
          Deliveries
        </Text>

        {/* KYC Completion Banner (Riders only) */}
        {isRider && !isKycComplete && (
          <View className="bg-accent/20 border border-accent rounded-2xl p-5 mb-6">
            <View className="flex-row items-start mb-3">
              <View className="bg-accent/30 rounded-full p-2 mr-3">
                <Icons.safety
                  name={IconNames.securityOutline as any}
                  size={24}
                  color="#AB8BFF"
                />
              </View>
              <View className="flex-1">
                <Text className="text-accent font-bold text-lg mb-1">
                  Complete Your KYC Verification
                </Text>
                <Text className="text-light-300 text-sm mb-3">
                  To start accepting delivery orders, you need to complete your
                  profile verification.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/profile/edit" as any)}
                  className="bg-accent rounded-xl py-3 px-4 items-center"
                >
                  <Text className="text-primary font-bold">
                    Complete KYC Now
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Go Online Section - Moved to Middle */}
        {isRider && (
          <View className="bg-secondary rounded-2xl p-6 mb-6 border border-neutral-100 items-center">
            <Text className="text-light-100 text-xl font-bold mb-2">
              {online ? "You're Online" : "Go Online"}
            </Text>
            <Text className="text-light-400 text-sm text-center mb-4">
              {online
                ? "You're receiving delivery requests nearby"
                : "Turn on to start receiving delivery requests"}
            </Text>
            <View className="flex-row items-center gap-4">
              <Text
                className={`text-base font-semibold ${
                  online ? "text-green-400" : "text-light-400"
                }`}
              >
                {online ? "Online" : "Offline"}
              </Text>
              <Switch
                value={online}
                onValueChange={async (val) => {
                  if (val) {
                    // Check KYC before going online
                    if (!isKycComplete) {
                      Toast.show({
                        type: "error",
                        text1: "KYC Required",
                        text2:
                          "Please complete your KYC verification to go online",
                      });
                      setTimeout(() => {
                        router.push("/profile/edit" as any);
                      }, 1500);
                      return;
                    }
                    try {
                      const { status } =
                        await Location.requestForegroundPermissionsAsync();
                      if (status !== Location.PermissionStatus.GRANTED) {
                        Toast.show({
                          type: "error",
                          text1: "Allow location to go online",
                        });
                        return;
                      }
                      setOnline(true);
                      await updateRiderPresence(true);
                      Toast.show({ type: "success", text1: "You're online" });
                    } catch (e: any) {
                      Toast.show({
                        type: "error",
                        text1: "Location error",
                        text2: e?.message || "Try again",
                      });
                    }
                  } else {
                    try {
                      setOnline(false);
                      stopLocationUpdates();
                      await updateRiderPresence(false);
                      Toast.show({ type: "success", text1: "You're offline" });
                    } catch (e: any) {
                      Toast.show({
                        type: "error",
                        text1: "Failed to go offline",
                      });
                    }
                  }
                }}
                trackColor={{ false: "#3A3A3C", true: "#AB8BFF" }}
                thumbColor={online ? "#030014" : "#9CA4AB"}
              />
            </View>
          </View>
        )}

        {/* Available Deliveries */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-light-200 text-lg font-semibold">
              Available Deliveries
            </Text>
            {isRider && (
              <TouchableOpacity
                disabled={!online || loadingOrders}
                onPress={fetchAvailableOrders}
                className={`px-3 py-2 rounded-xl border ${
                  online ? "border-accent" : "border-neutral-100/50"
                }`}
              >
                {loadingOrders ? (
                  <ActivityIndicator size="small" color="#AB8BFF" />
                ) : (
                  <Text
                    className={`${
                      online ? "text-accent" : "text-light-400"
                    } text-sm`}
                  >
                    Refresh
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          {loadingOrders ? (
            <View className="bg-secondary rounded-2xl p-8 items-center border border-neutral-100">
              <ActivityIndicator size="large" color="#AB8BFF" />
              <Text className="text-light-300 mt-4">Loading orders...</Text>
            </View>
          ) : availableOrders.length === 0 ? (
            <View className="bg-secondary rounded-2xl p-6 items-center border border-neutral-100">
              <Icons.delivery
                name={MCIconNames.delivery as any}
                size={64}
                color="#9CA4AB"
              />
              <Text className="text-light-200 text-lg font-semibold mt-4 mb-2">
                {online
                  ? "No deliveries nearby"
                  : "Go online to see deliveries"}
              </Text>
              <Text className="text-light-400 text-sm text-center">
                {online
                  ? "New delivery requests within 7km will appear here"
                  : "Turn on 'Online' to receive nearby delivery requests"}
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {availableOrders.map((order) => (
                <View
                  key={order._id || order.id}
                  className="bg-secondary rounded-2xl p-5 border border-neutral-100"
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-light-100 font-semibold text-base mb-1">
                        {order.items}
                      </Text>
                      <Text className="text-light-300 text-sm">
                        {order.pickup.address}
                      </Text>
                      <Text className="text-light-300 text-sm">
                        → {order.dropoff.address}
                      </Text>
                    </View>
                    {order.distanceKm && (
                      <View className="bg-accent/20 px-3 py-1 rounded-lg">
                        <Text className="text-accent text-xs font-semibold">
                          {order.distanceKm} km
                        </Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-light-200 font-bold">
                      ₦{Number(order.price || 0).toLocaleString()}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (!isKycComplete) {
                          Toast.show({
                            type: "error",
                            text1: "KYC Verification Required",
                            text2:
                              "Please complete your profile with NIN or BVN to accept orders",
                          });
                          setTimeout(() => {
                            router.push("/profile/edit" as any);
                          }, 1500);
                          return;
                        }
                        handleAcceptOrder(order._id || order.id!);
                      }}
                      disabled={!isKycComplete}
                      className={`px-4 py-2 rounded-xl ${
                        isKycComplete
                          ? "bg-accent"
                          : "bg-neutral-100/50 opacity-60"
                      }`}
                    >
                      <Text
                        className={`font-bold ${
                          isKycComplete ? "text-primary" : "text-light-400"
                        }`}
                      >
                        {isKycComplete ? "Accept" : "Complete KYC"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Active Deliveries */}
        <View className="mb-6">
          <Text className="text-light-200 text-lg font-semibold mb-4">
            Active Deliveries
          </Text>
          <View className="bg-secondary rounded-2xl p-6 items-center border border-neutral-100">
            <Text className="text-light-300 text-sm">
              No active deliveries at the moment
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
