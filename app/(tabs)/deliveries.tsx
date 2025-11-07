import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { acceptOrder, getAvailableOrders, Order } from "@/services/orderApi";
import { checkActiveOrders, updateRiderPresence } from "@/services/riderApi";
import { updateSearchRadius } from "@/services/userApi";
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
  const { user, isLoading, updateUser } = useAuth();
  const router = useRouter();
  const isRider = user?.role === "rider";
  const [online, setOnline] = React.useState(false);
  const [availableOrders, setAvailableOrders] = React.useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState(false);
  const [searchRadius, setSearchRadius] = React.useState(
    user?.searchRadiusKm || 7
  );
  const [updatingRadius, setUpdatingRadius] = React.useState(false);
  const locationTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  React.useEffect(() => {
    if (user?.searchRadiusKm) {
      setSearchRadius(user.searchRadiusKm);
    }
  }, [user?.searchRadiusKm]);

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
      setAvailableOrders(Array.isArray(orders) ? orders : []);
    } catch (e: any) {
      setAvailableOrders([]);
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
      const isLocationError = e?.response?.data?.locationRequired === true;

      if (isKycError) {
        Toast.show({
          type: "error",
          text1: "KYC Verification Required",
          text2:
            "Please complete your profile with NIN or BVN to accept orders",
        });
        setTimeout(() => {
          router.push("/profile/edit" as any);
        }, 1500);
      } else if (isLocationError) {
        Toast.show({
          type: "error",
          text1: "Location Required",
          text2:
            "Please turn on your location services and go online to accept orders",
        });
        // Ensure online toggle is visible
        if (!online) {
          setOnline(true);
        }
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

  const isKycComplete = React.useMemo(() => {
    if (!isRider || !user) return false;

    const hasVerifiedIdentity =
      user.ninVerified === true || user.bvnVerified === true;
    if (!hasVerifiedIdentity) return false;

    const hasAddress = user.address && user.address.trim().length > 0;
    if (!hasAddress) return false;

    const hasDriverLicenseNumber =
      user.driverLicenseNumber && user.driverLicenseNumber.trim().length > 0;
    const hasDriverLicensePicture =
      user.driverLicensePicture && user.driverLicensePicture.trim().length > 0;
    const isDriverLicenseVerified = user.driverLicenseVerified === true;
    if (
      !hasDriverLicenseNumber ||
      !hasDriverLicensePicture ||
      !isDriverLicenseVerified
    ) {
      return false;
    }

    const hasVehiclePicture =
      user.vehiclePicture && user.vehiclePicture.trim().length > 0;
    if (!hasVehiclePicture) return false;

    return true;
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

        {/* Go Online Section - Only show if KYC is complete */}
        {isRider && isKycComplete && (
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
                      const activeOrdersCheck = await checkActiveOrders();
                      if (activeOrdersCheck.hasActiveOrders) {
                        Toast.show({
                          type: "error",
                          text1: "Cannot Go Offline",
                          text2: `You have ${activeOrdersCheck.activeOrderCount} active order(s). Complete or cancel them first.`,
                        });
                        return;
                      }
                    } catch (e: any) {
                      console.error("Error checking active orders:", e);
                    }

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

        {/* Search Radius Settings - Only show if KYC is complete */}
        {isRider && isKycComplete && (
          <View className="bg-secondary rounded-2xl p-5 mb-6 border border-neutral-100">
            <Text className="text-light-100 text-lg font-semibold mb-2">
              Search Radius
            </Text>
            <Text className="text-light-400 text-sm mb-4">
              Adjust how far you want to see delivery requests (1-20 km)
            </Text>
            <View className="flex-row items-center gap-4 mb-2">
              <Text className="text-light-300 text-sm flex-1">
                {searchRadius} km
              </Text>
              <View className="flex-1 flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() => {
                    const newRadius = Math.max(1, searchRadius - 1);
                    setSearchRadius(newRadius);
                  }}
                  disabled={searchRadius <= 1 || updatingRadius}
                  className={`w-10 h-10 rounded-lg items-center justify-center ${
                    searchRadius <= 1
                      ? "bg-dark-100 opacity-50"
                      : "bg-dark-100 border border-neutral-100"
                  }`}
                >
                  <Text className="text-light-100 text-lg">−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const newRadius = Math.min(20, searchRadius + 1);
                    setSearchRadius(newRadius);
                  }}
                  disabled={searchRadius >= 20 || updatingRadius}
                  className={`w-10 h-10 rounded-lg items-center justify-center ${
                    searchRadius >= 20
                      ? "bg-dark-100 opacity-50"
                      : "bg-dark-100 border border-neutral-100"
                  }`}
                >
                  <Text className="text-light-100 text-lg">+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              onPress={async () => {
                if (searchRadius === (user?.searchRadiusKm || 7)) return;
                setUpdatingRadius(true);
                try {
                  const result = await updateSearchRadius(searchRadius);
                  // Update user context with new radius
                  updateUser({ searchRadiusKm: result.searchRadiusKm });
                  Toast.show({
                    type: "success",
                    text1: "Radius updated",
                    text2: `Now searching within ${searchRadius} km`,
                  });
                  // Refresh orders if online
                  if (online) {
                    await fetchAvailableOrders();
                  }
                } catch (e: any) {
                  Toast.show({
                    type: "error",
                    text1: "Failed to update radius",
                    text2: e?.response?.data?.error || e?.message,
                  });
                  // Revert on error
                  setSearchRadius(user?.searchRadiusKm || 7);
                } finally {
                  setUpdatingRadius(false);
                }
              }}
              disabled={
                updatingRadius || searchRadius === (user?.searchRadiusKm || 7)
              }
              className={`rounded-xl py-3 px-4 items-center ${
                updatingRadius || searchRadius === (user?.searchRadiusKm || 7)
                  ? "bg-dark-100 opacity-50"
                  : "bg-accent"
              }`}
            >
              {updatingRadius ? (
                <ActivityIndicator size="small" color="#030014" />
              ) : (
                <Text className="text-primary font-bold">
                  {searchRadius === (user?.searchRadiusKm || 7)
                    ? "Current Radius"
                    : "Save Radius"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Available Deliveries - Only show if KYC is complete */}
        {isRider && isKycComplete && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-light-200 text-lg font-semibold">
                Available Deliveries
              </Text>
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
                    ? `New delivery requests within ${
                        user?.searchRadiusKm || 7
                      }km will appear here`
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
        )}

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
