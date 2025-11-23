import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { SocketEvents } from "@/constants/socketEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  acceptOrder,
  getAvailableOrders,
  getRiderOrders,
  Order,
} from "@/services/orderApi";
import { checkActiveOrders, updateRiderPresence } from "@/services/riderApi";
import { socketClient } from "@/services/socketClient";
import { updateSearchRadius } from "@/services/userApi";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function DeliveriesScreen() {
  const { user, isLoading, updateUser } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const isRider = user?.role === "rider";
  const tabBarHeight = 65;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 20;
  const contentBottomPadding = tabBarHeight + bottomPadding + 32;
  const [online, setOnline] = React.useState(false);
  const [availableOrders, setAvailableOrders] = React.useState<Order[]>([]);
  const [acceptedOrders, setAcceptedOrders] = React.useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState(false);
  const [loadingAcceptedOrders, setLoadingAcceptedOrders] =
    React.useState(false);
  const [acceptingOrderId, setAcceptingOrderId] = React.useState<string | null>(
    null
  );
  const [showAllOrders, setShowAllOrders] = React.useState(false);
  const [searchRadius, setSearchRadius] = React.useState(
    user?.searchRadiusKm || 7
  );
  const [radiusInput, setRadiusInput] = React.useState(
    String(user?.searchRadiusKm || 7)
  );
  const [updatingRadius, setUpdatingRadius] = React.useState(false);
  const locationTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // Animation refs
  const icon1Anim = useRef(new Animated.Value(1)).current;
  const icon2Anim = useRef(new Animated.Value(1)).current;
  const icon3Anim = useRef(new Animated.Value(1)).current;
  const hasAnimatedRef = useRef(false);
  const [showPromoModal, setShowPromoModal] = React.useState(false);
  const starRotateAnim = useRef(new Animated.Value(0)).current;
  const starShineAnim = useRef(new Animated.Value(1)).current;

  // Start icon animations after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      // Icon pulse animations
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

      // Star rotation and shine animations
      Animated.loop(
        Animated.timing(starRotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(starShineAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(starShineAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (user?.searchRadiusKm) {
      setSearchRadius(user.searchRadiusKm);
      setRadiusInput(String(user.searchRadiusKm));
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
      const orders = await getAvailableOrders(showAllOrders);
      const filtered = (Array.isArray(orders) ? orders : []).filter(
        (order) => !order.riderId || String(order.riderId) !== String(user?.id)
      );
      setAvailableOrders(filtered);
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
  }, [online, isRider, showAllOrders, user?.id]);

  const fetchAcceptedOrders = React.useCallback(async () => {
    if (!isRider || !user?.id) return;
    setLoadingAcceptedOrders(true);
    try {
      const response = await getRiderOrders(1, 50);
      // getRiderOrders returns orders assigned to this rider with active statuses
      setAcceptedOrders(response.orders || []);
    } catch (e: any) {
      setAcceptedOrders([]);
      console.error("Error loading accepted orders:", e);
    } finally {
      setLoadingAcceptedOrders(false);
    }
  }, [isRider, user?.id]);

  React.useEffect(() => {
    if (isRider) {
      fetchAcceptedOrders();

      const interval = setInterval(fetchAcceptedOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [isRider, fetchAcceptedOrders]);

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

  React.useEffect(() => {
    if (!isRider || !online) return;

    const socket = socketClient.socketInstance;
    if (!socket || !socket.connected) return;

    const handleNewOrder = (data: any) => {
      fetchAvailableOrders();

      const pickupAddress =
        data.pickup?.address?.length > 35
          ? data.pickup.address.substring(0, 35) + "..."
          : data.pickup?.address || "Location";

      Toast.show({
        type: "info",
        text1: "New delivery available",
        text2: `${data.distanceKm}km away - ₦${Number(
          data.price || 0
        ).toLocaleString()}\n📍 ${pickupAddress}`,
        visibilityTime: 5000,
      });
    };

    socket.on(SocketEvents.NEW_ORDER_AVAILABLE, handleNewOrder);

    return () => {
      socket.off(SocketEvents.NEW_ORDER_AVAILABLE, handleNewOrder);
    };
  }, [isRider, online, fetchAvailableOrders]);

  const handleAcceptOrder = async (orderId: string) => {
    setAcceptingOrderId(orderId);
    try {
      await acceptOrder(orderId);
      Toast.show({ type: "success", text1: "Order accepted" });
      await Promise.all([fetchAvailableOrders(), fetchAcceptedOrders()]);
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
    } finally {
      setAcceptingOrderId(null);
    }
  };

  if (isLoading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-primary" : "bg-white"
        }`}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? "#AB8BFF" : "#1E3A8A"}
        />
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

  // Statistics for riders
  const totalDeliveries = acceptedOrders.length;
  const completedDeliveries = acceptedOrders.filter(
    (o) => o.status === "delivered"
  ).length;
  const totalEarnings = acceptedOrders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + (o.financial?.riderNetAmount || o.price || 0), 0);

  return (
    <View className={`flex-1 ${isDark ? "bg-black" : "bg-white"}`}>
      {/* Fixed Header */}
      <View
        className="absolute top-0 left-0 right-0 z-50"
        style={{
          paddingTop: insets.top,
          backgroundColor: isDark ? "rgba(0, 0, 0, 0.98)" : "#1E3A8A",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <View className="px-6 py-4">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1 mr-3">
              <Animated.View
                style={{
                  transform: [{ scale: icon1Anim }],
                }}
              >
                <View
                  className={`rounded-xl p-3 mr-3 ${
                    isDark ? "bg-accent/20" : "bg-white/20"
                  }`}
                >
                  <Icons.delivery
                    name={MCIconNames.delivery as any}
                    size={24}
                    color={isDark ? "#AB8BFF" : "#FFFFFF"}
                  />
                </View>
              </Animated.View>
              <View className="flex-1" style={{ minWidth: 0 }}>
                <Text
                  className={`text-2xl font-bold mb-1 ${
                    isDark ? "text-light-100" : "text-white"
                  }`}
                  numberOfLines={1}
                >
                  Deliveries
                </Text>
                <Text
                  className={`text-sm ${
                    isDark ? "text-light-400" : "text-white"
                  }`}
                  numberOfLines={1}
                >
                  {isRider
                    ? online
                      ? "Active and ready"
                      : "Manage your deliveries"
                    : "Track your orders"}
                </Text>
              </View>
            </View>
            {isRider && (
              <TouchableOpacity
                onPress={() => setShowPromoModal(true)}
                className="items-center"
                style={{ minWidth: 60 }}
              >
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: starRotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "360deg"],
                        }),
                      },
                      { scale: starShineAnim },
                    ],
                  }}
                >
                  <Icons.action
                    name={IconNames.star as any}
                    size={26}
                    color={isDark ? "#AB8BFF" : "#FFFFFF"}
                  />
                </Animated.View>
                <Text
                  className={`text-xs mt-1.5 ${
                    isDark ? "text-light-400" : "text-white"
                  }`}
                >
                  Promo
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Statistics Cards */}
          {isRider && (
            <Reanimated.View
              entering={FadeInDown.delay(100).duration(400)}
              className={`rounded-3xl p-4 mb-4 ${
                isDark ? "bg-secondary" : "bg-white"
              }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center justify-between gap-3">
                <View
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                  className="items-center"
                >
                  <View
                    className={`rounded-2xl p-3 mb-2 ${
                      isDark ? "bg-dark-100" : "bg-blue-50"
                    }`}
                  >
                    <Icons.package
                      name={MCIconNames.packageVariant as any}
                      size={22}
                      color={isDark ? "#AB8BFF" : "#1E3A8A"}
                    />
                  </View>
                  <Text
                    className={`text-xs mb-1 ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                    numberOfLines={1}
                  >
                    Total
                  </Text>
                  <Text
                    className={`text-lg font-bold ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                    numberOfLines={1}
                  >
                    {totalDeliveries}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                  className="items-center"
                >
                  <View
                    className={`rounded-2xl p-3 mb-2 ${
                      isDark ? "bg-dark-100" : "bg-green-50"
                    }`}
                  >
                    <Icons.action
                      name={IconNames.checkmarkCircle as any}
                      size={22}
                      color={isDark ? "#30D158" : "#10B981"}
                    />
                  </View>
                  <Text
                    className={`text-xs mb-1 ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                    numberOfLines={1}
                  >
                    Completed
                  </Text>
                  <Text
                    className={`text-lg font-bold ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                    numberOfLines={1}
                  >
                    {completedDeliveries}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                  className="items-center"
                >
                  <View
                    className={`rounded-2xl p-3 mb-2 ${
                      isDark ? "bg-dark-100" : "bg-purple-50"
                    }`}
                  >
                    <Icons.money
                      name={MCIconNames.cash as any}
                      size={22}
                      color={isDark ? "#AB8BFF" : "#8B5CF6"}
                    />
                  </View>
                  <Text
                    className={`text-xs mb-1 ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                    numberOfLines={1}
                  >
                    Earnings
                  </Text>
                  <Text
                    className={`text-lg font-bold ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                    numberOfLines={1}
                  >
                    ₦{totalEarnings.toLocaleString()}
                  </Text>
                </View>
              </View>
            </Reanimated.View>
          )}
        </View>
      </View>

      <ScrollView
        className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
        contentContainerStyle={{
          paddingTop: insets.top + (isRider ? 220 : 80),
          paddingBottom: contentBottomPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-8 px-6 pb-8">
          {/* KYC Completion Banner (Riders only) - Modern Design */}
          {isRider && !isKycComplete && (
            <Reanimated.View
              entering={FadeInDown.delay(200).duration(400)}
              className={`border rounded-3xl p-6 mb-6 shadow-lg ${
                isDark
                  ? "bg-accent/20 border-accent/30"
                  : "bg-blue-900/20 border-blue-900/30"
              }`}
            >
              <View className="flex-row items-start">
                <View
                  className={`rounded-2xl p-3 mr-4 ${
                    isDark ? "bg-accent/30" : "bg-blue-900/30"
                  }`}
                >
                  <Icons.safety
                    name={IconNames.securityOutline as any}
                    size={28}
                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`font-bold text-xl mb-2 ${
                      isDark ? "text-accent" : "text-blue-900"
                    }`}
                  >
                    Complete Your KYC Verification
                  </Text>
                  <Text
                    className={`text-sm mb-4 leading-5 ${
                      isDark ? "text-light-300" : "text-gray-600"
                    }`}
                  >
                    To start accepting delivery orders, you need to complete
                    your profile verification with identity documents.
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/profile/edit" as any)}
                    className={`rounded-2xl py-4 px-5 items-center flex-row justify-center shadow-lg ${
                      isDark ? "bg-accent" : "bg-blue-900"
                    }`}
                    style={{
                      shadowColor: isDark ? "#AB8BFF" : "#1E3A8A",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <Icons.action
                      name={IconNames.arrowForward as any}
                      size={18}
                      color={isDark ? "#030014" : "#FFFFFF"}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      className={`font-bold text-base ${
                        isDark ? "text-primary" : "text-white"
                      }`}
                    >
                      Complete KYC Now
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Reanimated.View>
          )}

          {/* Go Online Section - Enhanced Design */}
          {isRider && isKycComplete && (
            <Reanimated.View
              entering={FadeInDown.delay(300).duration(400)}
              className={`rounded-3xl p-6 mb-6 mt-4 ${
                isDark
                  ? "bg-secondary border-neutral-100"
                  : "bg-white border-gray-200"
              }`}
              style={{
                borderWidth: online ? 2 : 1,
                borderColor: online
                  ? "#10B981"
                  : isDark
                  ? "#2C2C2E"
                  : "#E5E5EA",
                shadowColor: online ? "#10B981" : "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: online ? 0.25 : 0.1,
                shadowRadius: online ? 16 : 8,
                elevation: online ? 10 : 4,
              }}
            >
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center flex-1">
                    <View className="relative mr-4">
                      <View
                        className="rounded-full p-4"
                        style={{
                          backgroundColor: online ? "#10B981" : "#9CA4AB",
                        }}
                      >
                        <Icons.status
                          name={
                            online
                              ? (IconNames.radioButtonOn as any)
                              : (IconNames.radioButtonOff as any)
                          }
                          size={28}
                          color="#FFFFFF"
                        />
                      </View>
                      {online && (
                        <View
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full border-2"
                          style={{
                            backgroundColor: "#10B981",
                            borderColor: isDark ? "#1C1C1E" : "#FFFFFF",
                          }}
                        />
                      )}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <Text
                          className={`text-3xl font-bold mr-3 ${
                            isDark ? "text-light-100" : "text-black"
                          }`}
                        >
                          {online ? "You're Online" : "Go Online"}
                        </Text>
                        {online && (
                          <View
                            className="rounded-full px-3 py-1"
                            style={{ backgroundColor: "#10B981" }}
                          >
                            <Text className="text-white text-xs font-bold">
                              ACTIVE
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        className={`text-base mb-3 ${
                          isDark ? "text-light-400" : "text-gray-600"
                        }`}
                      >
                        {online
                          ? "Receiving delivery requests nearby"
                          : "Turn on to start receiving requests"}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={online}
                    onValueChange={async (val: boolean) => {
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

                          if (status === Location.PermissionStatus.GRANTED) {
                            setOnline(true);
                            await updateRiderPresence(true);
                            Toast.show({
                              type: "success",
                              text1: "You're online",
                              text2:
                                "You'll now receive delivery requests near you",
                            });
                          } else if (
                            status === Location.PermissionStatus.DENIED
                          ) {
                            Alert.alert(
                              "Location Permission Required",
                              "To receive delivery orders, please enable location access in your device settings:\n\n1. Tap 'Open Settings' below\n2. Find '9thWaka' in your apps\n3. Enable 'Location' permission\n4. Choose 'While Using the App' or 'Allow'\n\nThen return here and turn on the switch again.",
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Open Settings",
                                  onPress: () => {
                                    if (Platform.OS !== "web") {
                                      Linking.openSettings();
                                    }
                                  },
                                },
                              ]
                            );
                          } else {
                            // Permission not determined or other status
                            Alert.alert(
                              "Location Permission Needed",
                              "To see and accept delivery orders near you, please allow location access. You can choose 'While Using the App' or 'Just Once' - we only use location when you're online.",
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Allow",
                                  onPress: async () => {
                                    const newStatus =
                                      await Location.requestForegroundPermissionsAsync();
                                    if (
                                      newStatus.status ===
                                      Location.PermissionStatus.GRANTED
                                    ) {
                                      setOnline(true);
                                      await updateRiderPresence(true);
                                      Toast.show({
                                        type: "success",
                                        text1: "You're online",
                                        text2:
                                          "You'll now receive delivery requests near you",
                                      });
                                    }
                                  },
                                },
                              ]
                            );
                          }
                        } catch (e: any) {
                          Toast.show({
                            type: "error",
                            text1: "Location error",
                            text2:
                              e?.message ||
                              "Please try again or enable location in Settings",
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
                          Toast.show({
                            type: "success",
                            text1: "You're offline",
                          });
                        } catch (e: any) {
                          Toast.show({
                            type: "error",
                            text1: "Failed to go offline",
                          });
                        }
                      }
                    }}
                    trackColor={{ false: "#3A3A3C", true: "#10B981" }}
                    thumbColor={online ? "#FFFFFF" : "#9CA4AB"}
                    ios_backgroundColor="#3A3A3C"
                  />
                </View>
              </View>

              {!online && (
                <View
                  className={`mt-4 p-4 rounded-2xl ${
                    isDark
                      ? "bg-info/20 border border-info/30"
                      : "bg-blue-50 border border-blue-200"
                  }`}
                >
                  <View className="flex-row items-start">
                    <Icons.info
                      name={IconNames.informationOutline as any}
                      size={20}
                      color={isDark ? "#5AC8FA" : "#1E3A8A"}
                      style={{ marginRight: 12, marginTop: 2 }}
                    />
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-semibold mb-2 ${
                          isDark ? "text-info" : "text-blue-600"
                        }`}
                      >
                        📍 Location Required
                      </Text>
                      <Text
                        className={`text-sm leading-5 ${
                          isDark ? "text-light-300" : "text-gray-700"
                        }`}
                      >
                        You need to enable location services to see orders near
                        you. When you turn on, we'll ask for permission - choose
                        "While Using the App" or "Allow Once".
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {online && (
                <View className="flex-row items-center mt-4 p-3 rounded-2xl bg-success/20">
                  <Icons.location
                    name={IconNames.locationOutline as any}
                    size={20}
                    color="#10B981"
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    className="text-base font-semibold"
                    style={{ color: "#10B981" }}
                  >
                    Location Active
                  </Text>
                </View>
              )}
            </Reanimated.View>
          )}

          {/* Search Radius Settings - Modern Design */}
          {isRider && isKycComplete && online && (
            <Reanimated.View
              entering={FadeInDown.delay(400).duration(400)}
              className={`rounded-3xl p-6 mb-6 border ${
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
              <View className="flex-row items-center mb-4">
                <View
                  className={`rounded-2xl p-2.5 mr-3 ${
                    isDark ? "bg-accent/20" : "bg-blue-900/20"
                  }`}
                >
                  <Icons.map
                    name={IconNames.mapOutline as any}
                    size={22}
                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-lg font-bold mb-1 ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    Search Radius
                  </Text>
                  <Text
                    className={`text-xs ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Adjust delivery request range (km)
                  </Text>
                </View>
              </View>
              <View
                className={`rounded-2xl p-4 mb-4 ${
                  isDark ? "bg-dark-100/50" : "bg-blue-900/30"
                }`}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center flex-1">
                    <Icons.compass
                      name={IconNames.compassOutline as any}
                      size={20}
                      color={isDark ? "#AB8BFF" : "#FFFFFF"}
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      value={radiusInput}
                      onChangeText={(text) => {
                        // Only allow numbers
                        const numericValue = text.replace(/[^0-9]/g, "");
                        setRadiusInput(numericValue);
                        if (numericValue) {
                          const num = parseInt(numericValue, 10);
                          if (!isNaN(num) && num >= 1 && num <= 30) {
                            setSearchRadius(num);
                          }
                        }
                      }}
                      onBlur={() => {
                        // Validate and set on blur
                        const num = parseInt(radiusInput, 10);
                        if (isNaN(num) || num < 1) {
                          setRadiusInput("1");
                          setSearchRadius(1);
                        } else if (num > 30) {
                          setRadiusInput("30");
                          setSearchRadius(30);
                        } else {
                          setRadiusInput(String(num));
                          setSearchRadius(num);
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                      className={`text-2xl font-bold flex-1 ${
                        isDark ? "text-light-200" : "text-white"
                      }`}
                      style={{
                        minWidth: 60,
                      }}
                    />
                    <Text
                      className={`text-2xl font-bold ml-2 ${
                        isDark ? "text-light-200" : "text-white"
                      }`}
                    >
                      km
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      onPress={() => {
                        const newRadius = Math.max(1, searchRadius - 1);
                        setSearchRadius(newRadius);
                        setRadiusInput(String(newRadius));
                      }}
                      disabled={searchRadius <= 1 || updatingRadius}
                      className={`w-11 h-11 rounded-xl items-center justify-center ${
                        searchRadius <= 1
                          ? "bg-dark-200 opacity-40"
                          : isDark
                          ? "bg-accent/20 border border-accent/30 active:bg-accent/30"
                          : "bg-white/20 border border-white/30 active:bg-white/30"
                      }`}
                    >
                      <Icons.action
                        name={IconNames.removeCircle as any}
                        size={22}
                        color={
                          searchRadius <= 1
                            ? "#636366"
                            : isDark
                            ? "#AB8BFF"
                            : "#1E3A8A"
                        }
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const newRadius = Math.min(30, searchRadius + 1);
                        setSearchRadius(newRadius);
                        setRadiusInput(String(newRadius));
                      }}
                      disabled={searchRadius >= 30 || updatingRadius}
                      className={`w-11 h-11 rounded-xl items-center justify-center ${
                        searchRadius >= 30
                          ? "bg-dark-200 opacity-40"
                          : isDark
                          ? "bg-accent/20 border border-accent/30 active:bg-accent/30"
                          : "bg-white/20 border border-white/30 active:bg-white/30"
                      }`}
                    >
                      <Icons.action
                        name={IconNames.addCircle as any}
                        size={22}
                        color={
                          searchRadius >= 30
                            ? "#636366"
                            : isDark
                            ? "#AB8BFF"
                            : "#1E3A8A"
                        }
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  const validRadius = Math.min(30, Math.max(1, searchRadius));
                  if (validRadius === (user?.searchRadiusKm || 7)) return;
                  setUpdatingRadius(true);
                  try {
                    const result = await updateSearchRadius(validRadius);
                    updateUser({ searchRadiusKm: result.searchRadiusKm });
                    setSearchRadius(validRadius);
                    setRadiusInput(String(validRadius));
                    Toast.show({
                      type: "success",
                      text1: "Radius updated",
                      text2: `Now searching within ${validRadius} km`,
                    });
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
                    const originalRadius = user?.searchRadiusKm || 7;
                    setSearchRadius(originalRadius);
                    setRadiusInput(String(originalRadius));
                  } finally {
                    setUpdatingRadius(false);
                  }
                }}
                disabled={
                  updatingRadius ||
                  searchRadius === (user?.searchRadiusKm || 7) ||
                  searchRadius < 1 ||
                  searchRadius > 30
                }
                className={`rounded-2xl py-4 px-5 items-center flex-row justify-center ${
                  updatingRadius || searchRadius === (user?.searchRadiusKm || 7)
                    ? "bg-dark-100 opacity-50"
                    : isDark
                    ? "bg-accent"
                    : "bg-blue-900"
                }`}
                style={
                  !updatingRadius &&
                  searchRadius !== (user?.searchRadiusKm || 7)
                    ? {
                        shadowColor: isDark ? "#AB8BFF" : "#1E3A8A",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 6,
                      }
                    : {}
                }
              >
                {updatingRadius ? (
                  <ActivityIndicator
                    size="small"
                    color={isDark ? "#030014" : "#FFFFFF"}
                  />
                ) : (
                  <>
                    {searchRadius !== (user?.searchRadiusKm || 7) && (
                      <Icons.action
                        name={IconNames.saveOutline as any}
                        size={18}
                        color={isDark ? "#030014" : "#FFFFFF"}
                        style={{ marginRight: 8 }}
                      />
                    )}
                    <Text
                      className={`font-bold text-base ${
                        isDark ? "text-white" : "text-white"
                      }`}
                    >
                      {searchRadius === (user?.searchRadiusKm || 7)
                        ? "Current Radius"
                        : "Save Radius"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Reanimated.View>
          )}

          {/* My Accepted Orders - Modern Section */}
          {isRider && isKycComplete && (
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <View
                  className={`rounded-xl p-2 mr-3 ${
                    isDark ? "bg-accent/20" : "bg-blue-900/20"
                  }`}
                >
                  <Icons.package
                    name={MCIconNames.packageVariant as any}
                    size={20}
                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                  />
                </View>
                <Text
                  className={`text-xl font-bold ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  My Accepted Orders
                </Text>
                {acceptedOrders.length > 0 && (
                  <View
                    className={`rounded-full px-3 py-1 ml-3 ${
                      isDark ? "bg-accent/20" : "bg-blue-900/20"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isDark ? "text-accent" : "text-blue-900"
                      }`}
                    >
                      {acceptedOrders.length}
                    </Text>
                  </View>
                )}
              </View>
              {loadingAcceptedOrders ? (
                <View
                  className={`rounded-3xl p-8 items-center border ${
                    isDark
                      ? "bg-secondary border-neutral-100"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <ActivityIndicator
                    size="large"
                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                  />
                  <Text
                    className={`mt-3 text-sm ${
                      isDark ? "text-light-300" : "text-gray-600"
                    }`}
                  >
                    Loading...
                  </Text>
                </View>
              ) : acceptedOrders.length === 0 ? (
                <View
                  className={`rounded-3xl p-8 items-center border ${
                    isDark
                      ? "bg-secondary border-neutral-100"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Icons.package
                    name={MCIconNames.packageVariant as any}
                    size={48}
                    color="#9CA4AB"
                  />
                  <Text
                    className={`mt-3 text-base font-semibold ${
                      isDark ? "text-light-200" : "text-gray-700"
                    }`}
                  >
                    No accepted orders
                  </Text>
                  <Text
                    className={`mt-1 text-sm text-center ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Orders you accept will appear here
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {acceptedOrders.map((order) => {
                    const orderId = order._id || order.id || "";
                    return (
                      <TouchableOpacity
                        key={orderId}
                        onPress={() => router.push(`/orders/${orderId}` as any)}
                        className={`rounded-2xl p-4 border ${
                          isDark
                            ? "bg-secondary border-neutral-100"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <Text
                              className={`font-bold text-base mb-1 ${
                                isDark ? "text-light-100" : "text-black"
                              }`}
                            >
                              Order #{orderId.slice(-6).toUpperCase()}
                            </Text>
                            <Text
                              className={`text-sm ${
                                isDark ? "text-light-400" : "text-gray-600"
                              }`}
                            >
                              {order.pickup?.address?.slice(0, 40) || "N/A"}
                            </Text>
                          </View>
                          <View
                            className={`rounded-lg px-3 py-1.5 ${
                              isDark ? "bg-accent/20" : "bg-blue-900/20"
                            }`}
                          >
                            <Text
                              className={`text-xs font-semibold capitalize ${
                                isDark ? "text-accent" : "text-blue-900"
                              }`}
                            >
                              {order.status.replace(/_/g, "")}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Available Deliveries - Modern Section */}
          {isRider && isKycComplete && online && (
            <View className="mb-6">
              <View className="mb-4">
                <View className="flex-row items-center mb-3">
                  <View
                    className={`rounded-xl p-2 mr-3 ${
                      isDark ? "bg-accent/20" : "bg-blue-900/20"
                    }`}
                  >
                    <Icons.package
                      name={MCIconNames.packageVariant as any}
                      size={20}
                      color={isDark ? "#AB8BFF" : "#1E3A8A"}
                    />
                  </View>
                  <Text
                    className={`text-xl font-bold ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    Available Deliveries
                  </Text>
                  {availableOrders.length > 0 && (
                    <View
                      className={`rounded-full px-3 py-1 ml-3 ${
                        isDark ? "bg-accent/20" : "bg-blue-900/20"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isDark ? "text-accent" : "text-blue-900"
                        }`}
                      >
                        {availableOrders.length}
                      </Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    disabled={!online || loadingOrders}
                    onPress={() => {
                      setShowAllOrders(!showAllOrders);
                      if (online) {
                        setTimeout(() => fetchAvailableOrders(), 100);
                      }
                    }}
                    className={`rounded-xl px-3 py-2.5 flex-row items-center ${
                      online && showAllOrders
                        ? isDark
                          ? "bg-accent border border-accent/30"
                          : "bg-blue-900 border border-blue-900/30"
                        : online
                        ? isDark
                          ? "bg-accent/20 border border-accent/30"
                          : "bg-blue-900/20 border border-blue-900/30"
                        : "bg-dark-100 opacity-50"
                    }`}
                  >
                    <Icons.map
                      name={IconNames.mapOutline as any}
                      size={16}
                      color={
                        online && showAllOrders
                          ? isDark
                            ? "#030014"
                            : "#FFFFFF"
                          : online
                          ? isDark
                            ? "#AB8BFF"
                            : "#1E3A8A"
                          : "#636366"
                      }
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      className={`text-xs font-semibold ${
                        online && showAllOrders
                          ? isDark
                            ? "text-primary"
                            : "text-white"
                          : online
                          ? isDark
                            ? "text-accent"
                            : "text-blue-900"
                          : "text-light-400"
                      }`}
                    >
                      {showAllOrders ? "All" : "Nearby"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={!online || loadingOrders}
                    onPress={fetchAvailableOrders}
                    className={`rounded-xl p-2.5 ${
                      online
                        ? isDark
                          ? "bg-accent/20 border border-accent/30"
                          : "bg-blue-900/20 border border-blue-900/30"
                        : "bg-dark-100 opacity-50"
                    }`}
                  >
                    {loadingOrders ? (
                      <ActivityIndicator
                        size="small"
                        color={isDark ? "#AB8BFF" : "#1E3A8A"}
                      />
                    ) : (
                      <Icons.action
                        name={IconNames.refreshCircle as any}
                        size={22}
                        color={
                          online ? (isDark ? "#AB8BFF" : "#1E3A8A") : "#636366"
                        }
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              {loadingOrders ? (
                <View
                  className={`rounded-3xl p-12 items-center border ${
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
                  <ActivityIndicator
                    size="large"
                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                  />
                  <Text
                    className={`mt-4 text-sm ${
                      isDark ? "text-light-300" : "text-gray-600"
                    }`}
                  >
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
                      ? showAllOrders
                        ? "Showing all available orders regardless of distance"
                        : `New delivery requests within ${
                            user?.searchRadiusKm || 7
                          }km will appear here`
                      : online
                      ? "Make sure location services are enabled to see orders near you"
                      : "Turn on 'Online' and enable location to receive nearby delivery requests"}
                  </Text>
                  {online && availableOrders.length === 0 && (
                    <View className="mt-4 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20">
                      <View className="flex-row items-start">
                        <Icons.info
                          name={IconNames.informationOutline as any}
                          size={16}
                          color={isDark ? "#F59E0B" : "#D97706"}
                          style={{ marginRight: 8, marginTop: 2 }}
                        />
                        <View className="flex-1">
                          <Text
                            className={`text-xs font-semibold mb-1 ${
                              isDark ? "text-yellow-400" : "text-yellow-700"
                            }`}
                          >
                            💡 No Orders Nearby
                          </Text>
                          <Text
                            className={`text-xs leading-4 ${
                              isDark ? "text-light-400" : "text-gray-600"
                            }`}
                          >
                            {showAllOrders
                              ? "No orders available at the moment. Check back soon!"
                              : `No orders within ${
                                  user?.searchRadiusKm || 7
                                }km. Try increasing your search radius or enable "Show All Orders" to see requests further away.`}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
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
                              <View
                                className={`rounded-lg p-1.5 mr-2 ${
                                  isDark ? "bg-accent/20" : "bg-blue-900/20"
                                }`}
                              >
                                <Icons.package
                                  name={MCIconNames.packageVariant as any}
                                  size={16}
                                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
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
                              disabled={
                                !isKycComplete || acceptingOrderId === orderId
                              }
                              className={`px-5 py-2.5 rounded-xl flex-row items-center ${
                                isKycComplete && acceptingOrderId !== orderId
                                  ? isDark
                                    ? "bg-accent"
                                    : "bg-blue-900"
                                  : isKycComplete &&
                                    acceptingOrderId === orderId
                                  ? isDark
                                    ? "bg-accent/50"
                                    : "bg-blue-900/50"
                                  : "bg-neutral-100/50 opacity-60"
                              }`}
                              style={
                                isKycComplete
                                  ? {
                                      shadowColor: isDark
                                        ? "#AB8BFF"
                                        : "#1E3A8A",
                                      shadowOffset: { width: 0, height: 4 },
                                      shadowOpacity: 0.3,
                                      shadowRadius: 8,
                                      elevation: 6,
                                    }
                                  : {}
                              }
                            >
                              {acceptingOrderId === orderId ? (
                                <>
                                  <ActivityIndicator
                                    size="small"
                                    color={isDark ? "#030014" : "#FFFFFF"}
                                    style={{ marginRight: 6 }}
                                  />
                                  <Text
                                    className={`font-bold text-sm ${
                                      isDark ? "text-primary" : "text-white"
                                    }`}
                                  >
                                    Accepting...
                                  </Text>
                                </>
                              ) : (
                                <>
                                  <Icons.action
                                    name={IconNames.checkmarkCircle as any}
                                    size={18}
                                    color={
                                      isKycComplete
                                        ? isDark
                                          ? "#030014"
                                          : "#FFFFFF"
                                        : "#9CA4AB"
                                    }
                                    style={{ marginRight: 6 }}
                                  />
                                  <Text
                                    className={`font-bold text-sm ${
                                      isKycComplete
                                        ? isDark
                                          ? "text-primary"
                                          : "text-white"
                                        : "text-light-400"
                                    }`}
                                  >
                                    Accept
                                  </Text>
                                </>
                              )}
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
          {isRider && isKycComplete && (
            <View className="mb-6">
              <View className="flex-row items-center mb-5">
                <View className="bg-info/20 rounded-xl p-2 mr-3">
                  <Icons.time
                    name={IconNames.timeOutline as any}
                    size={20}
                    color="#5AC8FA"
                  />
                </View>
                <Text
                  className={`text-xl font-bold ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  My Active Deliveries
                </Text>
                {acceptedOrders.length > 0 && (
                  <View className="bg-info/20 rounded-full px-3 py-1 ml-3">
                    <Text className="text-info text-xs font-bold">
                      {acceptedOrders.length}
                    </Text>
                  </View>
                )}
              </View>
              {loadingAcceptedOrders ? (
                <View
                  className={`rounded-3xl p-8 items-center border ${
                    isDark
                      ? "bg-secondary border-neutral-100"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <ActivityIndicator size="large" color="#5AC8FA" />
                  <Text
                    className={`mt-3 text-sm ${
                      isDark ? "text-light-300" : "text-gray-600"
                    }`}
                  >
                    Loading...
                  </Text>
                </View>
              ) : acceptedOrders.length === 0 ? (
                <View
                  className={`rounded-3xl p-10 items-center border ${
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
                  <View
                    className={`rounded-full p-6 mb-4 ${
                      isDark ? "bg-dark-100" : "bg-gray-100"
                    }`}
                  >
                    <Icons.time
                      name={IconNames.timeOutline as any}
                      size={48}
                      color="#9CA4AB"
                    />
                  </View>
                  <Text
                    className={`text-lg font-bold mb-2 ${
                      isDark ? "text-light-200" : "text-gray-700"
                    }`}
                  >
                    No active deliveries
                  </Text>
                  <Text
                    className={`text-sm text-center ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Your active delivery orders will appear here
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {acceptedOrders.map((order) => {
                    const orderId = order._id || order.id || "";
                    return (
                      <TouchableOpacity
                        key={orderId}
                        onPress={() => router.push(`/orders/${orderId}` as any)}
                        className={`rounded-2xl p-4 border ${
                          isDark
                            ? "bg-secondary border-neutral-100"
                            : "bg-white border-gray-200"
                        }`}
                        style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <View className="flex-row items-center justify-between mb-3">
                          <View className="flex-1 mr-3">
                            <Text
                              className={`font-bold text-base mb-1 ${
                                isDark ? "text-light-100" : "text-black"
                              }`}
                            >
                              Order #{orderId.slice(-6).toUpperCase()}
                            </Text>
                            <Text
                              className={`text-sm mb-1 ${
                                isDark ? "text-light-400" : "text-gray-600"
                              }`}
                            >
                              {order.items}
                            </Text>
                            <View className="flex-row items-center mt-1">
                              <Icons.location
                                name={IconNames.locationOutline as any}
                                size={12}
                                color="#5AC8FA"
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                className={`text-xs flex-1 ${
                                  isDark ? "text-light-400" : "text-gray-500"
                                }`}
                                numberOfLines={1}
                              >
                                {order.pickup?.address || "N/A"} →{" "}
                                {order.dropoff?.address || "N/A"}
                              </Text>
                            </View>
                          </View>
                          <View className="bg-info/20 rounded-lg px-3 py-1.5">
                            <Text className="text-info text-xs font-semibold capitalize">
                              {order.status.replace(/_/g, "")}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row items-center justify-between pt-3 border-t border-neutral-100/50">
                          <View>
                            <Text
                              className={`text-xs mb-1 ${
                                isDark ? "text-light-400" : "text-gray-500"
                              }`}
                            >
                              Delivery Fee
                            </Text>
                            <Text
                              className={`font-bold text-lg ${
                                isDark ? "text-light-100" : "text-black"
                              }`}
                            >
                              ₦{Number(order.price || 0).toLocaleString()}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() =>
                              router.push(`/orders/${orderId}` as any)
                            }
                            className="bg-info rounded-xl px-4 py-2"
                          >
                            <Text className="text-white font-semibold text-sm">
                              View Details
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Promo Modal */}
      <Modal
        visible={showPromoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPromoModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowPromoModal(false)}
          className="flex-1 bg-black/60 items-center justify-end"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className={`w-full rounded-t-3xl p-6 ${
              isDark ? "bg-secondary" : "bg-white"
            }`}
            style={{
              maxHeight: "80%",
            }}
          >
            <View className="items-center mb-6">
              <View
                className={`w-12 h-1 rounded-full mb-4 ${
                  isDark ? "bg-neutral-100" : "bg-gray-300"
                }`}
              />
              <Text
                className={`text-2xl font-bold mb-2 ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                🎉 Special Promotions
              </Text>
              <Text
                className={`text-sm text-center ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                Exclusive offers for riders
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-4">
                {/* Promo Card 1 */}
                <View
                  className={`rounded-2xl p-5 border ${
                    isDark
                      ? "bg-accent/20 border-accent/30"
                      : "bg-blue-900/10 border-blue-900/30"
                  }`}
                >
                  <View className="flex-row items-start">
                    <View
                      className={`rounded-xl p-3 mr-4 ${
                        isDark ? "bg-accent/30" : "bg-blue-900/30"
                      }`}
                    >
                      <Icons.money
                        name={MCIconNames.cash as any}
                        size={28}
                        color={isDark ? "#AB8BFF" : "#1E3A8A"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-bold text-lg mb-1 ${
                          isDark ? "text-accent" : "text-blue-900"
                        }`}
                      >
                        Bonus Earnings Week
                      </Text>
                      <Text
                        className={`text-sm mb-2 ${
                          isDark ? "text-light-300" : "text-gray-600"
                        }`}
                      >
                        Earn 20% extra on all deliveries this week! Complete 10+
                        deliveries to unlock.
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        Valid until next Friday
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Promo Card 2 */}
                <View
                  className={`rounded-2xl p-5 border ${
                    isDark
                      ? "bg-success/20 border-success/30"
                      : "bg-green-100 border-green-300"
                  }`}
                >
                  <View className="flex-row items-start">
                    <View
                      className={`rounded-xl p-3 mr-4 ${
                        isDark ? "bg-success/30" : "bg-green-200"
                      }`}
                    >
                      <Icons.action
                        name={IconNames.star as any}
                        size={28}
                        color={isDark ? "#30D158" : "#10B981"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-bold text-lg mb-1 ${
                          isDark ? "text-success" : "text-green-700"
                        }`}
                      >
                        Fast Delivery Bonus
                      </Text>
                      <Text
                        className={`text-sm mb-2 ${
                          isDark ? "text-light-300" : "text-gray-600"
                        }`}
                      >
                        Complete deliveries in under 30 minutes and get ₦500
                        bonus per delivery!
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        Available all week
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Promo Card 3 */}
                <View
                  className={`rounded-2xl p-5 border ${
                    isDark
                      ? "bg-warning/20 border-warning/30"
                      : "bg-yellow-100 border-yellow-300"
                  }`}
                >
                  <View className="flex-row items-start">
                    <View
                      className={`rounded-xl p-3 mr-4 ${
                        isDark ? "bg-warning/30" : "bg-yellow-200"
                      }`}
                    >
                      <Icons.action
                        name={IconNames.star as any}
                        size={28}
                        color={isDark ? "#FFCC00" : "#F59E0B"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-bold text-lg mb-1 ${
                          isDark ? "text-warning" : "text-yellow-700"
                        }`}
                      >
                        Referral Rewards
                      </Text>
                      <Text
                        className={`text-sm mb-2 ${
                          isDark ? "text-light-300" : "text-gray-600"
                        }`}
                      >
                        Refer a friend and both of you get ₦2,000 bonus when
                        they complete their first 5 deliveries!
                      </Text>
                      <Text
                        className={`text-xs ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        Unlimited referrals
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowPromoModal(false)}
              className={`rounded-2xl py-4 px-5 items-center mt-6 ${
                isDark ? "bg-accent" : "bg-blue-900"
              }`}
            >
              <Text
                className={`font-bold text-base ${
                  isDark ? "text-primary" : "text-white"
                }`}
              >
                Got it!
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
