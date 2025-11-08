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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function DeliveriesScreen() {
  const { user, isLoading, updateUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isRider = user?.role === "rider";
  const tabBarHeight = 65;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 20;
  const contentBottomPadding = tabBarHeight + bottomPadding + 32;
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
    <ScrollView
      className="flex-1 bg-primary"
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: contentBottomPadding,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="pt-6 px-5 pb-8">
        {/* Modern Header with Icon */}
        <View className="flex-row items-center mb-6">
          <View className="bg-accent/20 rounded-xl p-2.5 mr-3">
            <Icons.delivery
              name={MCIconNames.delivery as any}
              size={22}
              color="#AB8BFF"
            />
          </View>
          <View className="flex-1">
            <Text className="text-light-100 text-xl font-bold mb-0.5">
              Deliveries
            </Text>
            <Text className="text-light-400 text-xs">
              {isRider
                ? online
                  ? "Active and ready"
                  : "Manage your deliveries"
                : "Track your orders"}
            </Text>
          </View>
        </View>

        {/* KYC Completion Banner (Riders only) - Modern Design */}
        {isRider && !isKycComplete && (
          <View className="bg-accent/20 border border-accent/30 rounded-3xl p-6 mb-6 shadow-lg">
            <View className="flex-row items-start">
              <View className="bg-accent/30 rounded-2xl p-3 mr-4">
                <Icons.safety
                  name={IconNames.securityOutline as any}
                  size={28}
                  color="#AB8BFF"
                />
              </View>
              <View className="flex-1">
                <Text className="text-accent font-bold text-xl mb-2">
                  Complete Your KYC Verification
                </Text>
                <Text className="text-light-300 text-sm mb-4 leading-5">
                  To start accepting delivery orders, you need to complete your
                  profile verification with identity documents.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/profile/edit" as any)}
                  className="bg-accent rounded-2xl py-4 px-5 items-center flex-row justify-center shadow-lg"
                  style={{
                    shadowColor: "#AB8BFF",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                >
                  <Icons.action
                    name={IconNames.arrowForward as any}
                    size={18}
                    color="#030014"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-primary font-bold text-base">
                    Complete KYC Now
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Go Online Section - Modern Card Design */}
        {isRider && isKycComplete && (
          <View
            className={`rounded-3xl p-6 mb-6 border ${
              online
                ? "bg-active/20 border-active/30"
                : "bg-secondary border-neutral-100"
            }`}
            style={{
              shadowColor: online ? "#30D158" : "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: online ? 0.2 : 0.1,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1">
                <View
                  className={`rounded-2xl p-3 mr-4 ${
                    online ? "bg-active/30" : "bg-dark-100"
                  }`}
                >
                  <Icons.status
                    name={
                      online
                        ? (IconNames.radioButtonOn as any)
                        : (IconNames.radioButtonOff as any)
                    }
                    size={24}
                    color={online ? "#30D158" : "#9CA4AB"}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-light-100 text-xl font-bold mb-1">
                    {online ? "You're Online" : "Go Online"}
                  </Text>
                  <Text className="text-light-400 text-sm">
                    {online
                      ? "Receiving delivery requests nearby"
                      : "Turn on to start receiving requests"}
                  </Text>
                </View>
              </View>
            </View>
            <View className="flex-row items-center justify-between bg-dark-100/50 rounded-2xl p-4">
              <View className="flex-row items-center">
                <Icons.location
                  name={IconNames.locationOutline as any}
                  size={20}
                  color={online ? "#30D158" : "#9CA4AB"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  className={`text-base font-semibold ${
                    online ? "text-active" : "text-light-400"
                  }`}
                >
                  {online ? "Active" : "Inactive"}
                </Text>
              </View>
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
                trackColor={{ false: "#3A3A3C", true: "#30D158" }}
                thumbColor={online ? "#030014" : "#9CA4AB"}
                ios_backgroundColor="#3A3A3C"
              />
            </View>
          </View>
        )}

        {/* Search Radius Settings - Modern Design */}
        {isRider && isKycComplete && (
          <View
            className="bg-secondary rounded-3xl p-6 mb-6 border border-neutral-100"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View className="bg-accent/20 rounded-2xl p-2.5 mr-3">
                <Icons.map
                  name={IconNames.mapOutline as any}
                  size={22}
                  color="#AB8BFF"
                />
              </View>
              <View className="flex-1">
                <Text className="text-light-100 text-lg font-bold mb-1">
                  Search Radius
                </Text>
                <Text className="text-light-400 text-xs">
                  Adjust delivery request range (1-20 km)
                </Text>
              </View>
            </View>
            <View className="bg-dark-100/50 rounded-2xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Icons.compass
                    name={IconNames.compassOutline as any}
                    size={20}
                    color="#AB8BFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-light-200 text-2xl font-bold">
                    {searchRadius} km
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => {
                      const newRadius = Math.max(1, searchRadius - 1);
                      setSearchRadius(newRadius);
                    }}
                    disabled={searchRadius <= 1 || updatingRadius}
                    className={`w-11 h-11 rounded-xl items-center justify-center ${
                      searchRadius <= 1
                        ? "bg-dark-200 opacity-40"
                        : "bg-accent/20 border border-accent/30 active:bg-accent/30"
                    }`}
                  >
                    <Icons.action
                      name={IconNames.removeCircle as any}
                      size={22}
                      color={searchRadius <= 1 ? "#636366" : "#AB8BFF"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const newRadius = Math.min(20, searchRadius + 1);
                      setSearchRadius(newRadius);
                    }}
                    disabled={searchRadius >= 20 || updatingRadius}
                    className={`w-11 h-11 rounded-xl items-center justify-center ${
                      searchRadius >= 20
                        ? "bg-dark-200 opacity-40"
                        : "bg-accent/20 border border-accent/30 active:bg-accent/30"
                    }`}
                  >
                    <Icons.action
                      name={IconNames.addCircle as any}
                      size={22}
                      color={searchRadius >= 20 ? "#636366" : "#AB8BFF"}
                    />
                  </TouchableOpacity>
                </View>
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
              className={`rounded-2xl py-4 px-5 items-center flex-row justify-center ${
                updatingRadius || searchRadius === (user?.searchRadiusKm || 7)
                  ? "bg-dark-100 opacity-50"
                  : "bg-accent"
              }`}
              style={
                !updatingRadius && searchRadius !== (user?.searchRadiusKm || 7)
                  ? {
                      shadowColor: "#AB8BFF",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }
                  : {}
              }
            >
              {updatingRadius ? (
                <ActivityIndicator size="small" color="#030014" />
              ) : (
                <>
                  {searchRadius !== (user?.searchRadiusKm || 7) && (
                    <Icons.action
                      name={IconNames.saveOutline as any}
                      size={18}
                      color="#030014"
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text className="text-primary font-bold text-base">
                    {searchRadius === (user?.searchRadiusKm || 7)
                      ? "Current Radius"
                      : "Save Radius"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Available Deliveries - Modern Section */}
        {isRider && isKycComplete && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-5">
              <View className="flex-row items-center">
                <View className="bg-accent/20 rounded-xl p-2 mr-3">
                  <Icons.package
                    name={MCIconNames.packageVariant as any}
                    size={20}
                    color="#AB8BFF"
                  />
                </View>
                <Text className="text-light-100 text-xl font-bold">
                  Available Deliveries
                </Text>
                {availableOrders.length > 0 && (
                  <View className="bg-accent/20 rounded-full px-3 py-1 ml-3">
                    <Text className="text-accent text-xs font-bold">
                      {availableOrders.length}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                disabled={!online || loadingOrders}
                onPress={fetchAvailableOrders}
                className={`rounded-xl p-2.5 ${
                  online
                    ? "bg-accent/20 border border-accent/30"
                    : "bg-dark-100 opacity-50"
                }`}
              >
                {loadingOrders ? (
                  <ActivityIndicator size="small" color="#AB8BFF" />
                ) : (
                  <Icons.action
                    name={IconNames.refreshCircle as any}
                    size={22}
                    color={online ? "#AB8BFF" : "#636366"}
                  />
                )}
              </TouchableOpacity>
            </View>
            {loadingOrders ? (
              <View
                className="bg-secondary rounded-3xl p-12 items-center border border-neutral-100"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <ActivityIndicator size="large" color="#AB8BFF" />
                <Text className="text-light-300 mt-4 text-sm">
                  Loading orders...
                </Text>
              </View>
            ) : availableOrders.length === 0 ? (
              <View
                className="bg-secondary rounded-3xl p-10 items-center border border-neutral-100"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View className="bg-dark-100 rounded-full p-6 mb-4">
                  <Icons.delivery
                    name={MCIconNames.delivery as any}
                    size={48}
                    color="#9CA4AB"
                  />
                </View>
                <Text className="text-light-200 text-lg font-bold mb-2">
                  {online
                    ? "No deliveries nearby"
                    : "Go online to see deliveries"}
                </Text>
                <Text className="text-light-400 text-sm text-center leading-5">
                  {online
                    ? `New delivery requests within ${
                        user?.searchRadiusKm || 7
                      }km will appear here`
                    : "Turn on 'Online' to receive nearby delivery requests"}
                </Text>
              </View>
            ) : (
              <View className="gap-4">
                {availableOrders.map((order) => {
                  const orderId = order._id || order.id || "";
                  return (
                    <View
                      key={orderId}
                      className="bg-secondary rounded-3xl p-5 border border-neutral-100"
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 12,
                        elevation: 6,
                      }}
                    >
                      {/* Order Header */}
                      <View className="flex-row items-start justify-between mb-4">
                        <View className="flex-1 mr-3">
                          <View className="flex-row items-center mb-2">
                            <View className="bg-accent/20 rounded-lg p-1.5 mr-2">
                              <Icons.package
                                name={MCIconNames.packageVariant as any}
                                size={16}
                                color="#AB8BFF"
                              />
                            </View>
                            <Text className="text-light-100 font-bold text-base flex-1">
                              {order.items}
                            </Text>
                          </View>
                          <View className="flex-row items-start mb-2">
                            <Icons.location
                              name={IconNames.locationOutline as any}
                              size={14}
                              color="#5AC8FA"
                              style={{ marginRight: 6, marginTop: 2 }}
                            />
                            <Text className="text-light-300 text-sm flex-1">
                              {order.pickup?.address || "N/A"}
                            </Text>
                          </View>
                          <View className="flex-row items-start">
                            <Icons.location
                              name={IconNames.locationOutline as any}
                              size={14}
                              color="#FF9500"
                              style={{ marginRight: 6, marginTop: 2 }}
                            />
                            <Text className="text-light-300 text-sm flex-1">
                              {order.dropoff?.address || "N/A"}
                            </Text>
                          </View>
                        </View>
                        {order.distanceKm && (
                          <View className="bg-info/20 border border-info/30 px-3 py-2 rounded-xl">
                            <View className="flex-row items-center">
                              <Icons.map
                                name={IconNames.navigateOutline as any}
                                size={14}
                                color="#5AC8FA"
                                style={{ marginRight: 4 }}
                              />
                              <Text className="text-info text-xs font-bold">
                                {order.distanceKm} km
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>

                      {/* Price and Actions */}
                      <View className="flex-row items-center justify-between pt-4 border-t border-neutral-100/50">
                        <View>
                          <Text className="text-light-400 text-xs mb-1">
                            Delivery Fee
                          </Text>
                          <View className="flex-row items-center">
                            <Icons.money
                              name={MCIconNames.cash as any}
                              size={18}
                              color="#30D158"
                              style={{ marginRight: 6 }}
                            />
                            <Text className="text-light-100 font-bold text-xl">
                              ₦{Number(order.price || 0).toLocaleString()}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row gap-2">
                          <TouchableOpacity
                            onPress={() => {
                              router.push(`/orders/${orderId}` as any);
                            }}
                            className="bg-dark-100 border border-neutral-100 px-4 py-2.5 rounded-xl flex-row items-center"
                          >
                            <Icons.info
                              name={IconNames.informationOutline as any}
                              size={16}
                              color="#D6C6FF"
                              style={{ marginRight: 6 }}
                            />
                            <Text className="text-light-200 font-semibold text-sm">
                              Details
                            </Text>
                          </TouchableOpacity>
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
                              handleAcceptOrder(orderId);
                            }}
                            disabled={!isKycComplete}
                            className={`px-5 py-2.5 rounded-xl flex-row items-center ${
                              isKycComplete
                                ? "bg-accent"
                                : "bg-neutral-100/50 opacity-60"
                            }`}
                            style={
                              isKycComplete
                                ? {
                                    shadowColor: "#AB8BFF",
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 6,
                                  }
                                : {}
                            }
                          >
                            <Icons.action
                              name={IconNames.checkmarkCircle as any}
                              size={18}
                              color={isKycComplete ? "#030014" : "#9CA4AB"}
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              className={`font-bold text-sm ${
                                isKycComplete
                                  ? "text-primary"
                                  : "text-light-400"
                              }`}
                            >
                              Accept
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Active Deliveries - Modern Section */}
        <View className="mb-6">
          <View className="flex-row items-center mb-5">
            <View className="bg-info/20 rounded-xl p-2 mr-3">
              <Icons.time
                name={IconNames.timeOutline as any}
                size={20}
                color="#5AC8FA"
              />
            </View>
            <Text className="text-light-100 text-xl font-bold">
              Active Deliveries
            </Text>
          </View>
          <View
            className="bg-secondary rounded-3xl p-10 items-center border border-neutral-100"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="bg-dark-100 rounded-full p-6 mb-4">
              <Icons.time
                name={IconNames.timeOutline as any}
                size={48}
                color="#9CA4AB"
              />
            </View>
            <Text className="text-light-200 text-lg font-bold mb-2">
              No active deliveries
            </Text>
            <Text className="text-light-400 text-sm text-center">
              Your active delivery orders will appear here
            </Text>
          </View>
        </View>
      </View>
      {/* Bottom spacer to prevent content from going under tab bar */}
      <View
        style={{ height: contentBottomPadding, backgroundColor: "#030014" }}
      />
    </ScrollView>
  );
}
