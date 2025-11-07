import NotificationBell from "@/components/NotificationBell";
import OrderTrackingMap from "@/components/OrderTrackingMap";
import { IconNames, Icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useAuth } from "@/contexts/AuthContext";
import { navigationHelper, Routes } from "@/services/navigationHelper";
import { getMyOrders, Order } from "@/services/orderApi";
import { toAbsoluteUrl } from "@/services/url";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function OrderSkeletonLoader() {
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
        className={`bg-dark-100 rounded-lg ${className}`}
      />
    );
  };

  return (
    <View className="gap-3">
      {[1, 2].map((i) => (
        <View
          key={i}
          className="bg-secondary rounded-2xl p-4 border border-neutral-100"
        >
          <View className="mb-3">
            <SkeletonBox width="60%" height={20} className="mb-2" />
            <SkeletonBox width="90%" height={16} className="mb-1" />
            <SkeletonBox width="85%" height={16} className="mb-2" />
            <SkeletonBox width="30%" height={24} />
          </View>
          <View className="bg-dark-100 rounded-xl h-12 items-center justify-center">
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  const TAB_BAR_HEIGHT = 65;
  const TAB_BAR_MARGIN = 16;
  const bottomPad = TAB_BAR_HEIGHT + TAB_BAR_MARGIN + insets.bottom;

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
      const orders = await getMyOrders();
      const active = orders.filter(
        (order) =>
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

  const handleAction = async (actionType: "request" | "track" | "sos") => {
    if (!isAuthenticated) {
      await navigationHelper.setPendingAction(actionType);
      router.push(Routes.standalone.auth);
    } else {
      if (actionType === "request") router.push(Routes.standalone.newOrder);
      else if (actionType === "track") router.push(Routes.tabs.track);
      else if (actionType === "sos") router.push(Routes.standalone.sos);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-primary"
      contentContainerStyle={{ paddingBottom: bottomPad, flexGrow: 1 }}
    >
      <View className="flex-1">
        <View className="pt-20 px-6 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Image
                source={images.logo}
                style={{ width: 60, height: 60 }}
                contentFit="contain"
                className="mb-2"
              />
              <Text className="text-light-200 text-lg">
                Modern Delivery • Safe • Fast
              </Text>
            </View>
            {isAuthenticated ? (
              <View className="flex-row items-center ml-2">
                <NotificationBell />
                <TouchableOpacity
                  onPress={() => router.push(Routes.tabs.profile)}
                  className="ml-2"
                >
                  {user?.profilePicture ? (
                    <Image
                      source={{
                        uri: String(toAbsoluteUrl(String(user.profilePicture))),
                      }}
                      style={{ width: 32, height: 32, borderRadius: 16 }}
                      contentFit="cover"
                    />
                  ) : (
                    <Icons.user
                      name={IconNames.personCircle as any}
                      size={32}
                      color="#FFFFFF"
                    />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => router.push(Routes.standalone.auth)}
                className="ml-4"
              >
                <Icons.user
                  name={IconNames.personOutline as any}
                  size={32}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Active Orders with Map - For Customers and Admin */}
        {isAuthenticated &&
          (user?.role === "customer" || user?.role === "admin") && (
            <View className="mx-6 mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-light-200 text-base font-semibold">
                  Active Deliveries
                </Text>
                {!loadingOrders && (
                  <Text className="text-light-400 text-xs">
                    {activeOrders.length} active
                  </Text>
                )}
              </View>

              {loadingOrders ? (
                <OrderSkeletonLoader />
              ) : activeOrders.length > 0 ? (
                activeOrders.map((order) => (
                  <View
                    key={order._id}
                    className="bg-secondary rounded-2xl p-4 mb-3 border border-neutral-100"
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
                        <View className="flex-row items-center gap-2 mt-2">
                          <View
                            className={`px-2 py-1 rounded-lg ${
                              order.status === "delivering"
                                ? "bg-accent/20"
                                : order.status === "picked_up"
                                ? "bg-info/20"
                                : "bg-warning/20"
                            }`}
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                order.status === "delivering"
                                  ? "text-accent"
                                  : order.status === "picked_up"
                                  ? "text-info"
                                  : "text-warning"
                              }`}
                            >
                              {order.status.replace("_", " ").toUpperCase()}
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
                      className="bg-accent rounded-xl px-4 py-3 flex-row items-center justify-center"
                    >
                      <Icons.map
                        name={IconNames.mapOutline as any}
                        size={20}
                        color="#030014"
                        style={{ marginRight: 8 }}
                      />
                      <Text className="text-primary font-bold">
                        View Live Map
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : null}
            </View>
          )}

        <View className="mx-6 mb-6 bg-secondary rounded-2xl p-5 border border-neutral-100">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-light-100 text-lg font-semibold">
              Service Status
            </Text>
            {isAuthenticated && (
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-active mr-2" />
                <Text className="text-active font-medium">Active</Text>
              </View>
            )}
          </View>
          <Text className="text-light-300 text-sm">
            Daily Service • Open until 10:00 PM
          </Text>
        </View>

        <View className="mx-6 mb-6">
          <Text className="text-light-200 text-base font-semibold mb-4">
            Quick Actions
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <TouchableOpacity
              onPress={() => handleAction("request")}
              className="bg-accent px-6 py-4 rounded-xl flex-1 min-w-[45%]"
            >
              <Text className="text-primary font-bold text-center text-base">
                Request Delivery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAction("track")}
              className="bg-accentWarm px-6 py-4 rounded-xl flex-1 min-w-[45%]"
            >
              <Text className="text-primary font-bold text-center text-base">
                Track Order
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SOS Button - Only for Riders */}
        {isAuthenticated && user?.role === "rider" && (
          <View className="mx-6 mb-6">
            <TouchableOpacity
              onPress={() => handleAction("sos")}
              className="bg-danger rounded-xl p-5 flex-row items-center justify-center shadow-lg"
            >
              <Text className="text-light-100 font-bold text-lg mr-2">🆘</Text>
              <Text className="text-light-100 font-bold text-lg">
                Emergency SOS
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="mx-6 mb-6">
          <Text className="text-light-200 text-base font-semibold mb-4">
            Features
          </Text>
          <View className="gap-3">
            <View className="bg-dark-100 rounded-xl p-4 border border-neutral-100">
              <Text className="text-accent font-semibold text-base mb-1">
                AI Safe Routes
              </Text>
              <Text className="text-light-300 text-sm">
                Intelligent routing for maximum safety
              </Text>
            </View>
            <View className="bg-dark-200 rounded-xl p-4 border border-neutral-100">
              <Text className="text-info font-semibold text-base mb-1">
                Real-Time Tracking
              </Text>
              <Text className="text-light-300 text-sm">
                Follow your delivery live on the map
              </Text>
            </View>
            <View className="bg-dark-300 rounded-xl p-4 border border-neutral-100">
              <Text className="text-success font-semibold text-base mb-1">
                Night Assurance
              </Text>
              <Text className="text-light-300 text-sm">
                Verified riders, secure deliveries
              </Text>
            </View>
          </View>
        </View>

        {/* CTA for guests */}
        {!isAuthenticated && (
          <View className="mx-6 mt-6 mb-4">
            <TouchableOpacity
              onPress={async () => {
                await navigationHelper.setPendingAction("request");
                router.push(Routes.standalone.auth);
              }}
              className="bg-accent rounded-xl py-4 px-6 flex-row items-center justify-center"
            >
              <Icons.action
                name={IconNames.addCircle as any}
                size={20}
                color="#030014"
                style={{ marginRight: 8 }}
              />
              <Text className="text-primary font-bold text-base">
                Get Started - Request Your First Delivery
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="mx-6 mt-4 mb-4">
          <Text className="text-light-400 text-xs text-center">
            Serving Lagos, Nigeria • Daily until 10 PM
          </Text>
        </View>
      </View>

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
    </ScrollView>
  );
}
