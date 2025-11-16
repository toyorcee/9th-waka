import NotificationBell from "@/components/NotificationBell";
import OrderTrackingMap from "@/components/OrderTrackingMap";
import { IconNames, Icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTabBarPadding } from "@/hooks/useTabBarPadding";
import { navigationHelper, Routes } from "@/services/navigationHelper";
import { getMyOrders, Order } from "@/services/orderApi";
import { toAbsoluteUrl } from "@/services/url";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function OrderSkeletonLoader() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const SkeletonBox = ({
    width,
    height,
    className = "",
  }: {
    width: string | number;
    height: number;
    className?: string;
  }) => {
    const widthStyle =
      typeof width === "string"
        ? { width: width as any }
        : { width: width as number };
    return (
      <Animated.View
        style={[
          {
            opacity,
            height,
          },
          widthStyle,
        ]}
        className={`rounded-lg ${
          isDark ? "bg-dark-100" : "bg-gray-100"
        } ${className}`}
      />
    );
  };

  return (
    <View className="gap-3">
      {[1, 2].map((i) => (
        <View
          key={i}
          className={`rounded-2xl p-4 border ${
            isDark
              ? "bg-secondary border-neutral-100"
              : "bg-white border-gray-200"
          }`}
        >
          <View className="mb-3">
            <SkeletonBox width="60%" height={20} className="mb-2" />
            <SkeletonBox width="90%" height={16} className="mb-1" />
            <SkeletonBox width="85%" height={16} className="mb-2" />
            <SkeletonBox width="30%" height={24} />
          </View>
          <View
            className={`rounded-xl h-12 items-center justify-center ${
              isDark ? "bg-dark-100" : "bg-gray-100"
            }`}
          >
            <View className="flex-row items-center gap-2">
              <SkeletonBox width={20} height={20} />
              <SkeletonBox width={120} height={16} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function HomeLanding() {
  const { isAuthenticated, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tabBarPadding } = useTabBarPadding();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  const promoCarouselRef = useRef<FlatList>(null);
  const screenWidth = Dimensions.get("window").width;

  const isDark = theme === "dark";

  // Promo banners data
  const promoBanners = [
    {
      id: "1",
      title: "Fast & Reliable Delivery",
      subtitle:
        "Experience lightning-fast delivery services across Lagos. Your packages delivered safely and on time!",
      cta: "Order Now",
      image: images.sliders.waka1,
    },
    {
      id: "2",
      title: "Track Your Orders",
      subtitle:
        "Real-time tracking for all your deliveries. Know exactly where your package is at every moment.",
      cta: "Track Now",
      image: images.sliders.waka2,
    },
    {
      id: "3",
      title: "Premium Service",
      subtitle:
        "Professional delivery experience with secure handling. Trust us with your valuable packages.",
      cta: "Get Started",
      image: images.sliders.waka3,
    },
  ];

  // Featured partners data
  const featuredPartners = [
    { id: "1", name: "BoltFood", logo: images.partners.boltFood },
    { id: "2", name: "Chowdeck", logo: images.partners.chowdeck },
    { id: "3", name: "DHL", logo: images.partners.dhl },
    { id: "4", name: "Glovo", logo: images.partners.glovo },
    { id: "5", name: "Item7", logo: images.partners.item7 },
    { id: "6", name: "Xtabel-Buka", logo: images.partners.xtabelBuka },
  ];

  // Auto-slide promo carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromoIndex((prev) => {
        const next = (prev + 1) % promoBanners.length;
        promoCarouselRef.current?.scrollToIndex({
          index: next,
          animated: true,
        });
        return next;
      });
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      isAuthenticated &&
      (user?.role === "customer" || user?.role === "admin")
    ) {
      loadActiveOrders();
      const interval = setInterval(loadActiveOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user?.role]);

  const loadActiveOrders = async () => {
    if (!isAuthenticated) return;
    setLoadingOrders(true);
    try {
      const response = await getMyOrders();
      const active = response.orders.filter(
        (order: Order) =>
          order.riderId &&
          ["assigned", "picked_up", "delivering"].includes(order.status)
      );
      setActiveOrders(active);
    } catch (e) {
      console.error("Error loading active orders:", e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleAction = async (
    actionType:
      | "request"
      | "track"
      | "sos"
      | "orders"
      | "deliveries"
      | "earnings"
  ) => {
    if (!isAuthenticated) {
      await navigationHelper.setPendingAction(actionType);
      router.push(Routes.standalone.auth);
    } else {
      if (actionType === "request") router.push(Routes.standalone.newOrder);
      else if (actionType === "track") router.push(Routes.tabs.track);
      else if (actionType === "sos") router.push(Routes.standalone.sos);
      else if (actionType === "orders") router.push(Routes.tabs.orders);
      else if (actionType === "deliveries") router.push(Routes.tabs.deliveries);
      else if (actionType === "earnings") router.push(Routes.tabs.earnings);
    }
  };

  return (
    <>
      {/* Fixed Header */}
      <View
        className={`absolute top-0 left-0 right-0 z-50 ${
          isDark ? "bg-primary" : "bg-white"
        }`}
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 10,
          paddingHorizontal: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.1 : 0.05,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="rounded-xl p-2">
            <Image
              source={isDark ? images.logo : images.logoDark}
              style={{ width: 56, height: 56 }}
              contentFit="contain"
            />
          </View>
          <View className="flex-row items-center">
            {/* Theme Toggle Button */}
            <TouchableOpacity
              onPress={toggleTheme}
              className="mr-3"
              accessibilityRole="button"
              accessibilityLabel={
                isDark ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              <Icons.action
                name={isDark ? "moon-outline" : "sunny-outline"}
                size={24}
                color={isDark ? "#FFFFFF" : "#000000"}
              />
            </TouchableOpacity>
            {!isAuthenticated ? (
              <TouchableOpacity
                onPress={() => router.push(Routes.standalone.auth)}
                className="rounded-xl px-4 py-2.5 flex-row items-center"
                style={{
                  backgroundColor: isDark ? "#AB8BFF" : "#1E3A8A",
                  shadowColor: isDark ? "#AB8BFF" : "#1E3A8A",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <Icons.action
                  name={IconNames.arrowForward as any}
                  size={18}
                  color={isDark ? "#030014" : "#FFFFFF"}
                  style={{ marginRight: 6 }}
                />
                <Text
                  className={`font-bold text-sm ${
                    isDark ? "text-primary" : "text-white"
                  }`}
                >
                  Sign In
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <NotificationBell />
                <TouchableOpacity
                  onPress={() => router.push(Routes.tabs.profile)}
                  className="ml-3"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  {user?.profilePicture ? (
                    <Image
                      source={{
                        uri: String(toAbsoluteUrl(String(user.profilePicture))),
                      }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        borderWidth: 2,
                        borderColor: isDark ? "#AB8BFF" : "#1E3A8A",
                      }}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      className={`rounded-full p-2 border-2 ${
                        isDark
                          ? "bg-accent/20 border-accent/30"
                          : "bg-blue-900/20 border-blue-900/30"
                      }`}
                    >
                      <Icons.user
                        name={IconNames.personCircle as any}
                        size={24}
                        color={isDark ? "#AB8BFF" : "#1E3A8A"}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
        contentContainerStyle={{
          paddingTop: insets.top + 100,
          paddingBottom: tabBarPadding,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {/* Welcome Section */}
          <View className="mb-6 mt-2">
            <Text
              className={`text-2xl font-bold mb-1 ${
                isDark ? "text-light-100" : "text-black"
              }`}
              style={{
                fontStyle: "italic",
                letterSpacing: 0.5,
                fontFamily: Platform.select({
                  ios: "Georgia",
                  android: "serif",
                  default: "Georgia",
                }),
              }}
            >
              {isAuthenticated && user?.fullName
                ? `Welcome, ${user.fullName.split(" ")[0]}!`
                : "Welcome to 9thWaka"}
            </Text>
            <Text
              className={`text-sm ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              Modern Delivery • Safe • Fast
            </Text>
          </View>

          {/* Active Orders Section - For Customers and Admin */}
          {isAuthenticated &&
            (user?.role === "customer" || user?.role === "admin") && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <View
                      className={`rounded-lg p-1.5 mr-2 ${
                        isDark ? "bg-accent/20" : "bg-blue-900/20"
                      }`}
                    >
                      <Icons.package
                        name={IconNames.packageOutline as any}
                        size={18}
                        color={isDark ? "#AB8BFF" : "#1E3A8A"}
                      />
                    </View>
                    <Text
                      className={`text-lg font-bold ${
                        isDark ? "text-light-100" : "text-black"
                      }`}
                    >
                      Active Deliveries
                    </Text>
                  </View>
                  {!loadingOrders && activeOrders.length > 0 && (
                    <View
                      className={`rounded-full px-3 py-1 border ${
                        isDark
                          ? "bg-accent/20 border-accent/30"
                          : "bg-blue-900/20 border-blue-900/30"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isDark ? "text-accent" : "text-blue-900"
                        }`}
                      >
                        {activeOrders.length} active
                      </Text>
                    </View>
                  )}
                </View>

                {loadingOrders ? (
                  <OrderSkeletonLoader />
                ) : activeOrders.length > 0 ? (
                  activeOrders.map((order) => (
                    <View
                      key={order._id}
                      className={`rounded-3xl p-5 mb-4 border ${
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
                      <View className="flex-row items-start justify-between mb-4">
                        <View className="flex-1">
                          <View className="flex-row items-center mb-3">
                            <View
                              className={`rounded-lg p-1.5 mr-2 ${
                                isDark ? "bg-accent/20" : "bg-blue-900/20"
                              }`}
                            >
                              <Icons.package
                                name={IconNames.packageOutline as any}
                                size={14}
                                color={isDark ? "#AB8BFF" : "#1E3A8A"}
                              />
                            </View>
                            <Text
                              className={`font-bold text-base flex-1 ${
                                isDark ? "text-light-100" : "text-black"
                              }`}
                            >
                              {order.items}
                            </Text>
                          </View>
                          <View className="mb-3">
                            <View className="flex-row items-start mb-2">
                              <Icons.location
                                name={IconNames.locationOutline as any}
                                size={14}
                                color="#5AC8FA"
                                style={{ marginRight: 6, marginTop: 2 }}
                              />
                              <Text
                                className={`text-sm flex-1 ${
                                  isDark ? "text-light-300" : "text-gray-600"
                                }`}
                              >
                                {order.pickup.address}
                              </Text>
                            </View>
                            <View className="flex-row items-start">
                              <Icons.location
                                name={IconNames.locationOutline as any}
                                size={14}
                                color="#FF9500"
                                style={{ marginRight: 6, marginTop: 2 }}
                              />
                              <Text
                                className={`text-sm flex-1 ${
                                  isDark ? "text-light-300" : "text-gray-600"
                                }`}
                              >
                                {order.dropoff.address}
                              </Text>
                            </View>
                          </View>
                          <View className="flex-row items-center gap-2">
                            <View
                              className={`px-3 py-1.5 rounded-lg border ${
                                order.status === "delivering"
                                  ? isDark
                                    ? "bg-accent/20 border-accent/30"
                                    : "bg-blue-900/20 border-blue-900/30"
                                  : order.status === "picked_up"
                                  ? "bg-info/20 border-info/30"
                                  : "bg-warning/20 border-warning/30"
                              }`}
                            >
                              <Text
                                className={`text-xs font-bold capitalize ${
                                  order.status === "delivering"
                                    ? isDark
                                      ? "text-accent"
                                      : "text-blue-900"
                                    : order.status === "picked_up"
                                    ? "text-info"
                                    : "text-warning"
                                }`}
                              >
                                {order.status.replace("_", " ")}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedOrderId(order._id);
                          setShowMapModal(true);
                        }}
                        className={`rounded-xl px-4 py-3.5 flex-row items-center justify-center ${
                          isDark ? "bg-accent" : ""
                        }`}
                        style={{
                          backgroundColor: isDark ? "#AB8BFF" : "#1E3A8A",
                          shadowColor: isDark ? "#AB8BFF" : "#1E3A8A",
                          shadowOffset: { width: 0, height: isDark ? 4 : 2 },
                          shadowOpacity: isDark ? 0.5 : 0.3,
                          shadowRadius: isDark ? 8 : 4,
                          elevation: isDark ? 8 : 4,
                          borderWidth: isDark ? 1 : 0,
                          borderColor: isDark ? "#C4A5FF" : "transparent",
                        }}
                      >
                        <View
                          className={`rounded-lg p-1 mr-2 ${
                            isDark ? "bg-primary/20" : "bg-white/20"
                          }`}
                        >
                          <Icons.map
                            name={IconNames.mapOutline as any}
                            size={18}
                            color={isDark ? "#030014" : "#FFFFFF"}
                          />
                        </View>
                        <Text
                          className={`font-bold text-base ${
                            isDark ? "text-primary" : "text-white"
                          }`}
                        >
                          View Live Map
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <View
                    className={`rounded-3xl p-8 border items-center ${
                      isDark
                        ? "bg-secondary border-neutral-100"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Icons.package
                      name={IconNames.packageOutline as any}
                      size={48}
                      color="#9CA4AB"
                    />
                    <Text
                      className={`text-sm mt-3 text-center ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
                      No active deliveries at the moment
                    </Text>
                  </View>
                )}
              </View>
            )}

          {/* Service Status Card */}
          <View
            className={`rounded-3xl p-5 mb-6 border ${
              isDark
                ? "bg-secondary border-neutral-100"
                : "bg-gray-50 border-gray-200"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="bg-active/20 rounded-lg p-1.5 mr-2">
                  <Icons.status
                    name={IconNames.checkmarkCircle as any}
                    size={18}
                    color="#30D158"
                  />
                </View>
                <Text
                  className={`text-lg font-bold ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Service Status
                </Text>
              </View>
              {isAuthenticated && (
                <View className="flex-row items-center bg-active/20 rounded-full px-3 py-1.5 border border-active/30">
                  <View className="w-2.5 h-2.5 rounded-full bg-active mr-2" />
                  <Text className="text-active font-bold text-xs">Active</Text>
                </View>
              )}
            </View>
            <View className="flex-row items-center">
              <Icons.time
                name={IconNames.timeOutline as any}
                size={14}
                color="#9CA4AB"
                style={{ marginRight: 6 }}
              />
              <Text
                className={`text-sm ${
                  isDark ? "text-light-300" : "text-gray-600"
                }`}
              >
                Daily Service • Open until 10:00 PM
              </Text>
            </View>
          </View>

          {/* Track Shipment Search Bar */}
          <View className="mb-4">
            <View
              className={`flex-row items-center rounded-2xl px-4 py-3 border ${
                isDark
                  ? "bg-dark-100 border-neutral-100"
                  : "bg-gray-100 border-gray-200"
              }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.1 : 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Icons.search
                name={IconNames.search as any}
                size={20}
                color={isDark ? "#9CA4AB" : "#6E6E73"}
                style={{ marginRight: 12 }}
              />
              <TextInput
                placeholder="Enter tracking code or order ID"
                placeholderTextColor={isDark ? "#9CA4AB" : "#6E6E73"}
                value={trackingCode}
                onChangeText={setTrackingCode}
                className={`flex-1 text-base ${
                  isDark ? "text-light-100" : "text-black"
                }`}
                onSubmitEditing={() => {
                  if (trackingCode.trim()) {
                    router.push(`/orders/${trackingCode.trim()}` as any);
                  }
                }}
              />
              {trackingCode.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    if (trackingCode.trim()) {
                      router.push(`/orders/${trackingCode.trim()}` as any);
                    }
                  }}
                  className="ml-2"
                >
                  <Icons.action
                    name={IconNames.arrowForward as any}
                    size={20}
                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Promo Carousel */}
          <View className="mb-6">
            <FlatList
              ref={promoCarouselRef}
              data={promoBanners}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / screenWidth
                );
                setCurrentPromoIndex(index);
              }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={{ width: screenWidth - 48 }}
                  className="mr-4"
                  onPress={() => {
                    if (isAuthenticated) {
                      router.push(Routes.standalone.newOrder as any);
                    } else {
                      navigationHelper.setPendingAction("request");
                      router.push(Routes.standalone.auth as any);
                    }
                  }}
                >
                  <View
                    className={`rounded-2xl overflow-hidden border ${
                      isDark
                        ? "bg-secondary border-neutral-100"
                        : "bg-white border-gray-200"
                    }`}
                    style={{
                      height: 180,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isDark ? 0.15 : 0.08,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    {/* Image Background */}
                    {item.image && (
                      <View className="absolute inset-0">
                        <Image
                          source={item.image}
                          style={{
                            width: "100%",
                            height: "100%",
                          }}
                          contentFit="cover"
                        />
                        {/* Overlay for better text readability */}
                        <View
                          className="absolute inset-0"
                          style={{
                            backgroundColor: isDark
                              ? "rgba(0, 0, 0, 0.15)"
                              : "rgba(255, 255, 255, 0.2)",
                          }}
                        />
                      </View>
                    )}
                    {/* Content */}
                    <View className="flex-1 p-6 justify-between">
                      <View>
                        <Text
                          className="text-2xl font-bold mb-2 text-white"
                          style={{
                            textShadowColor: "rgba(0, 0, 0, 0.6)",
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 3,
                          }}
                        >
                          {item.title}
                        </Text>
                        <Text
                          className="text-sm leading-5 text-white"
                          numberOfLines={2}
                          style={{
                            textShadowColor: "rgba(0, 0, 0, 0.6)",
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 3,
                          }}
                        >
                          {item.subtitle}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Text
                          className="font-semibold text-base text-white"
                          style={{
                            textShadowColor: "rgba(0, 0, 0, 0.6)",
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 3,
                          }}
                        >
                          {item.cta}
                        </Text>
                        <Icons.action
                          name={IconNames.arrowForward as any}
                          size={18}
                          color="#FFFFFF"
                          style={{ marginLeft: 8 }}
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
            {/* Carousel Indicators */}
            <View className="flex-row justify-center mt-3">
              {promoBanners.map((_, index) => (
                <View
                  key={index}
                  className={`h-2 rounded-full mx-1 ${
                    index === currentPromoIndex
                      ? isDark
                        ? "bg-accent w-6"
                        : "bg-blue-900 w-6"
                      : isDark
                      ? "bg-dark-100 w-2"
                      : "bg-gray-300 w-2"
                  }`}
                />
              ))}
            </View>
          </View>

          {/* Quick Actions - Role Based */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <View
                className={`rounded-lg p-1.5 mr-2 ${
                  isDark ? "bg-accent/20" : "bg-blue-900/20"
                }`}
              >
                <Icons.action
                  name={IconNames.starOutline as any}
                  size={18}
                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                />
              </View>
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Quick Actions
              </Text>
            </View>

            {isAuthenticated && user?.role === "rider" ? (
              /* Rider Quick Actions */
              <View className="flex-row flex-wrap gap-2.5">
                <TouchableOpacity
                  onPress={() => handleAction("deliveries")}
                  className={`px-4 py-3.5 flex-1 min-w-[30%] ${
                    isDark ? "bg-accent" : ""
                  }`}
                  style={{
                    borderRadius: 20,
                    backgroundColor: isDark ? undefined : "#1E3A8A",
                    shadowColor: isDark ? "#AB8BFF" : "#1E3A8A",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 5,
                  }}
                >
                  <Icons.package
                    name={IconNames.packageOutline as any}
                    size={20}
                    color={isDark ? "#030014" : "#FFFFFF"}
                    style={{ marginBottom: 6, alignSelf: "center" }}
                  />
                  <Text
                    className={`font-bold text-center text-xs ${
                      isDark ? "text-primary" : "text-white"
                    }`}
                  >
                    Available Orders
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAction("track")}
                  className={`px-4 py-3.5 flex-1 min-w-[30%] ${
                    isDark ? "bg-info/80" : ""
                  }`}
                  style={{
                    borderRadius: 20,
                    backgroundColor: isDark ? undefined : "#0EA5E9",
                    shadowColor: isDark ? "#5AC8FA" : "#0EA5E9",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 5,
                  }}
                >
                  <Icons.map
                    name={IconNames.mapOutline as any}
                    size={20}
                    color="#FFFFFF"
                    style={{ marginBottom: 6, alignSelf: "center" }}
                  />
                  <Text className="text-white font-bold text-center text-xs">
                    My Deliveries
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAction("earnings")}
                  className={`border-2 px-4 py-3.5 flex-1 min-w-[30%] ${
                    isDark
                      ? "border-accent/30 bg-secondary"
                      : "border-blue-900/30 bg-white"
                  }`}
                  style={{
                    borderRadius: 20,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Icons.money
                    name={IconNames.cash as any}
                    size={20}
                    color={isDark ? "#AB8BFF" : "#1E3A8A"}
                    style={{ marginBottom: 6, alignSelf: "center" }}
                  />
                  <Text
                    className={`font-bold text-center text-xs ${
                      isDark ? "text-accent" : "text-blue-900"
                    }`}
                  >
                    Earnings
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Customer/Admin Quick Actions */
              <View className="flex-row flex-wrap gap-3">
                <TouchableOpacity
                  onPress={() => handleAction("request")}
                  className="px-5 py-4 flex-1 min-w-[30%]"
                  style={{
                    borderRadius: 20,
                    backgroundColor: isDark ? "#AB8BFF" : "#1E3A8A",
                    shadowColor: isDark ? "#AB8BFF" : "#1E3A8A",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <View className="items-center">
                    <View
                      className="rounded-full p-2 mb-2"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(3, 0, 20, 0.2)"
                          : "rgba(255, 255, 255, 0.2)",
                      }}
                    >
                      <Icons.action
                        name={IconNames.addCircle as any}
                        size={24}
                        color={isDark ? "#FFFFFF" : "#FFFFFF"}
                      />
                    </View>
                    <Text
                      className="font-bold text-center text-sm"
                      style={{ color: "#FFFFFF" }}
                    >
                      Request Delivery
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAction("track")}
                  className="px-5 py-4 flex-1 min-w-[30%]"
                  style={{
                    borderRadius: 20,
                    backgroundColor: isDark ? "#5AC8FA" : "#0EA5E9",
                    shadowColor: isDark ? "#5AC8FA" : "#0EA5E9",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <View className="items-center">
                    <View
                      className="rounded-full p-2 mb-2"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                      }}
                    >
                      <Icons.map
                        name={IconNames.mapOutline as any}
                        size={24}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text
                      className="font-bold text-center text-sm"
                      style={{ color: "#FFFFFF" }}
                    >
                      Track Order
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAction("orders")}
                  className="px-5 py-4 flex-1 min-w-[30%]"
                  style={{
                    borderRadius: 20,
                    backgroundColor: isDark ? "#6B7280" : "#E5E7EB",
                    shadowColor: isDark ? "#6B7280" : "#9CA3AF",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <View className="items-center flex-1 justify-between">
                    <View
                      className="rounded-full p-2"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(255, 255, 255, 0.2)"
                          : "rgba(30, 58, 138, 0.2)",
                      }}
                    >
                      <Icons.package
                        name={IconNames.packageOutline as any}
                        size={24}
                        color={isDark ? "#FFFFFF" : "#1E3A8A"}
                      />
                    </View>
                    <View style={{ flex: 1 }} />
                    <Text
                      className="font-bold text-center text-sm"
                      style={{
                        color: isDark ? "#FFFFFF" : "#1E3A8A",
                      }}
                    >
                      My Orders
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* SOS Button - Only for Riders */}
          {isAuthenticated && user?.role === "rider" && (
            <View className="mb-6">
              <TouchableOpacity
                onPress={() => handleAction("sos")}
                className="bg-danger rounded-2xl p-5 flex-row items-center justify-center"
                style={{
                  shadowColor: "#FF3B30",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Icons.action
                  name={IconNames.warningOutline as any}
                  size={24}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text
                  className={`font-bold text-lg ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Emergency SOS
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Available Vehicles Section */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <View
                className={`rounded-lg p-1.5 mr-2 ${
                  isDark ? "bg-accent/20" : "bg-blue-900/20"
                }`}
              >
                <Icons.delivery
                  name={IconNames.carOutline as any}
                  size={18}
                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                />
              </View>
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Available Vehicles
              </Text>
            </View>
            <Text
              className={`text-sm mb-4 ${
                isDark ? "text-light-400" : "text-gray-600"
              }`}
            >
              Choose from our range of delivery vehicles. Riders can register
              with any vehicle type, and customers can select their preferred
              option when requesting deliveries.
            </Text>
            <View className="flex-row flex-wrap gap-2.5">
              {[
                {
                  type: "bicycle",
                  label: "Bicycle",
                  icon: "bicycle",
                  description: "Eco-friendly, fast for short distances",
                  color: isDark ? "#6B7280" : "#9CA3AF",
                },
                {
                  type: "motorbike",
                  label: "Motorbike",
                  icon: "motorbike",
                  description: "Most popular, quick & affordable",
                  color: isDark ? "#AB8BFF" : "#1E3A8A",
                },
                {
                  type: "tricycle",
                  label: "Tricycle",
                  icon: "rickshaw",
                  description: "More capacity, stable delivery",
                  color: isDark ? "#5AC8FA" : "#0EA5E9",
                },
                {
                  type: "car",
                  label: "Car",
                  icon: "car-outline",
                  description: "Comfortable, weather-protected",
                  color: isDark ? "#9333EA" : "#7C3AED",
                },
                {
                  type: "van",
                  label: "Van",
                  icon: "van-utility",
                  description: "Large items, bulk deliveries",
                  color: isDark ? "#F59E0B" : "#D97706",
                },
              ].map((vehicle) => (
                <View
                  key={vehicle.type}
                  className={`rounded-xl p-3 border flex-1 min-w-[45%] ${
                    isDark
                      ? "bg-secondary border-neutral-100"
                      : "bg-white border-gray-200"
                  }`}
                  style={{
                    shadowColor: vehicle.color,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View className="flex-row items-center mb-2">
                    <View
                      className="rounded-lg p-1.5 mr-2"
                      style={{
                        backgroundColor: `${vehicle.color}20`,
                      }}
                    >
                      <Icons.motorcycle
                        name={vehicle.icon as any}
                        size={18}
                        color={vehicle.color}
                      />
                    </View>
                    <Text
                      className={`font-bold text-sm ${
                        isDark ? "text-light-100" : "text-black"
                      }`}
                    >
                      {vehicle.label}
                    </Text>
                  </View>
                  <Text
                    className={`text-xs ${
                      isDark ? "text-light-400" : "text-gray-600"
                    }`}
                  >
                    {vehicle.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Features Section */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <View className="bg-info/20 rounded-lg p-1.5 mr-2">
                <Icons.action
                  name={IconNames.starOutline as any}
                  size={18}
                  color="#5AC8FA"
                />
              </View>
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Features
              </Text>
            </View>
            <View className="gap-3">
              <View
                className={`rounded-2xl p-4 border overflow-hidden ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "border-blue-900/20"
                }`}
                style={{
                  backgroundColor: isDark ? undefined : "#1E3A8A",
                  shadowColor: isDark ? "#000" : "#1E3A8A",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.05 : 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View className="flex-row items-center mb-2">
                  <View
                    className={`rounded-lg p-1.5 mr-2 ${
                      isDark ? "bg-accent/20" : "bg-white/20"
                    }`}
                  >
                    <Icons.action
                      name={IconNames.shieldOutline as any}
                      size={16}
                      color={isDark ? "#AB8BFF" : "#FFFFFF"}
                    />
                  </View>
                  <Text
                    className={`font-bold text-base ${
                      isDark ? "text-accent" : "text-white"
                    }`}
                  >
                    AI Safe Routes
                  </Text>
                </View>
                <Text
                  className={`text-sm ${
                    isDark ? "text-light-300" : "text-white/90"
                  }`}
                >
                  Intelligent routing for maximum safety
                </Text>
              </View>
              <View
                className={`rounded-2xl p-4 border overflow-hidden ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "border-cyan-500/20"
                }`}
                style={{
                  backgroundColor: isDark ? undefined : "#0EA5E9",
                  shadowColor: isDark ? "#000" : "#0EA5E9",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.05 : 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View className="flex-row items-center mb-2">
                  <View
                    className={`rounded-lg p-1.5 mr-2 ${
                      isDark ? "bg-info/20" : "bg-white/20"
                    }`}
                  >
                    <Icons.map
                      name={IconNames.locationOutline as any}
                      size={16}
                      color={isDark ? "#5AC8FA" : "#FFFFFF"}
                    />
                  </View>
                  <Text
                    className={`font-bold text-base ${
                      isDark ? "text-info" : "text-white"
                    }`}
                  >
                    Real-Time Tracking
                  </Text>
                </View>
                <Text
                  className={`text-sm ${
                    isDark ? "text-light-300" : "text-white/90"
                  }`}
                >
                  Follow your delivery live on the map
                </Text>
              </View>
              <View
                className={`rounded-2xl p-4 border overflow-hidden ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "border-green-500/20"
                }`}
                style={{
                  backgroundColor: isDark ? undefined : "#10B981",
                  shadowColor: isDark ? "#000" : "#10B981",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.05 : 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View className="flex-row items-center mb-2">
                  <View
                    className={`rounded-lg p-1.5 mr-2 ${
                      isDark ? "bg-success/20" : "bg-white/20"
                    }`}
                  >
                    <Icons.status
                      name={IconNames.checkmarkCircle as any}
                      size={16}
                      color={isDark ? "#30D158" : "#FFFFFF"}
                    />
                  </View>
                  <Text
                    className={`font-bold text-base ${
                      isDark ? "text-success" : "text-white"
                    }`}
                  >
                    Night Assurance
                  </Text>
                </View>
                <Text
                  className={`text-sm ${
                    isDark ? "text-light-300" : "text-white/90"
                  }`}
                >
                  Verified riders, secure deliveries
                </Text>
              </View>
            </View>
          </View>

          {/* CTA for guests */}
          {!isAuthenticated && (
            <View className="mb-6">
              <TouchableOpacity
                onPress={async () => {
                  await navigationHelper.setPendingAction("request");
                  router.push(Routes.standalone.auth);
                }}
                className="rounded-2xl py-4 px-6 flex-row items-center justify-center"
                style={{
                  backgroundColor: isDark ? "#AB8BFF" : "#1E3A8A",
                  shadowColor: isDark ? "#AB8BFF" : "#1E3A8A",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Icons.action
                  name={IconNames.addCircle as any}
                  size={20}
                  color={isDark ? "#030014" : "#FFFFFF"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  className="font-bold text-base"
                  style={{
                    color: isDark ? "#030014" : "#FFFFFF",
                  }}
                >
                  Get Started - Request Your First Delivery
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer */}
          <View className="mb-4">
            <Text className="text-light-400 text-xs text-center">
              Serving Lagos, Nigeria • Daily until 10 PM
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Map Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowMapModal(false)}
      >
        {selectedOrderId && (
          <OrderTrackingMap
            orderId={selectedOrderId}
            onClose={() => {
              setShowMapModal(false);
              setSelectedOrderId(null);
            }}
          />
        )}
      </Modal>
    </>
  );
}
