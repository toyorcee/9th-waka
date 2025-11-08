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

  const tabBarHeight = 65;

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
      <ScrollView
        className="flex-1 bg-primary"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: tabBarHeight + insets.bottom + 40,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {/* Enhanced Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Image
              source={images.logo}
              style={{ width: 56, height: 56 }}
              contentFit="contain"
            />
            {isAuthenticated ? (
              <View className="flex-row items-center">
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
                        borderColor: "#AB8BFF",
                      }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="bg-accent/20 rounded-full p-2 border-2 border-accent/30">
                      <Icons.user
                        name={IconNames.personCircle as any}
                        size={24}
                        color="#AB8BFF"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => router.push(Routes.standalone.auth)}
                className="bg-accent/20 rounded-xl p-2.5 border border-accent/30"
                style={{
                  shadowColor: "#AB8BFF",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Icons.user
                  name={IconNames.personOutline as any}
                  size={24}
                  color="#AB8BFF"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Welcome Section */}
          <View className="mb-6">
            <Text className="text-light-100 text-2xl font-bold mb-1">
              {isAuthenticated && user?.fullName
                ? `Welcome, ${user.fullName.split(" ")[0]}!`
                : "Welcome to 9thWaka"}
            </Text>
            <Text className="text-light-400 text-sm">
              Modern Delivery • Safe • Fast
            </Text>
          </View>

          {/* Active Orders Section - For Customers and Admin */}
          {isAuthenticated &&
            (user?.role === "customer" || user?.role === "admin") && (
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <View className="bg-accent/20 rounded-lg p-1.5 mr-2">
                      <Icons.package
                        name={IconNames.packageOutline as any}
                        size={18}
                        color="#AB8BFF"
                      />
                    </View>
                    <Text className="text-light-100 text-lg font-bold">
                      Active Deliveries
                    </Text>
                  </View>
                  {!loadingOrders && activeOrders.length > 0 && (
                    <View className="bg-accent/20 rounded-full px-3 py-1 border border-accent/30">
                      <Text className="text-accent text-xs font-bold">
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
                      className="bg-secondary rounded-3xl p-5 mb-4 border border-neutral-100"
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
                          <View className="mb-3">
                            <View className="flex-row items-start mb-2">
                              <Icons.location
                                name={IconNames.locationOutline as any}
                                size={14}
                                color="#5AC8FA"
                                style={{ marginRight: 6, marginTop: 2 }}
                              />
                              <Text className="text-light-300 text-sm flex-1">
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
                              <Text className="text-light-300 text-sm flex-1">
                                {order.dropoff.address}
                              </Text>
                            </View>
                          </View>
                          <View className="flex-row items-center gap-2">
                            <View
                              className={`px-3 py-1.5 rounded-lg border ${
                                order.status === "delivering"
                                  ? "bg-accent/20 border-accent/30"
                                  : order.status === "picked_up"
                                  ? "bg-info/20 border-info/30"
                                  : "bg-warning/20 border-warning/30"
                              }`}
                            >
                              <Text
                                className={`text-xs font-bold capitalize ${
                                  order.status === "delivering"
                                    ? "text-accent"
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
                        className="bg-accent rounded-xl px-4 py-3.5 flex-row items-center justify-center"
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
                          size={20}
                          color="#030014"
                          style={{ marginRight: 8 }}
                        />
                        <Text className="text-primary font-bold text-base">
                          View Live Map
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <View className="bg-secondary rounded-3xl p-8 border border-neutral-100 items-center">
                    <Icons.package
                      name={IconNames.packageOutline as any}
                      size={48}
                      color="#9CA4AB"
                    />
                    <Text className="text-light-400 text-sm mt-3 text-center">
                      No active deliveries at the moment
                    </Text>
                  </View>
                )}
              </View>
            )}

          {/* Service Status Card */}
          <View
            className="bg-secondary rounded-3xl p-5 mb-6 border border-neutral-100"
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
                <Text className="text-light-100 text-lg font-bold">
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
              <Text className="text-light-300 text-sm">
                Daily Service • Open until 10:00 PM
              </Text>
            </View>
          </View>

          {/* Quick Actions - Role Based */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <View className="bg-accent/20 rounded-lg p-1.5 mr-2">
                <Icons.action
                  name={IconNames.starOutline as any}
                  size={18}
                  color="#AB8BFF"
                />
              </View>
              <Text className="text-light-100 text-lg font-bold">
                Quick Actions
              </Text>
            </View>

            {isAuthenticated && user?.role === "rider" ? (
              /* Rider Quick Actions */
              <View className="flex-row flex-wrap gap-2.5">
                <TouchableOpacity
                  onPress={() => handleAction("deliveries")}
                  className="bg-accent px-4 py-3.5 flex-1 min-w-[30%]"
                  style={{
                    borderRadius: 20,
                    shadowColor: "#AB8BFF",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 5,
                  }}
                >
                  <Icons.package
                    name={IconNames.packageOutline as any}
                    size={20}
                    color="#030014"
                    style={{ marginBottom: 6, alignSelf: "center" }}
                  />
                  <Text className="text-primary font-bold text-center text-xs">
                    Available Orders
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAction("track")}
                  className="bg-accentWarm px-4 py-3.5 flex-1 min-w-[30%]"
                  style={{
                    borderRadius: 20,
                    shadowColor: "#FF9500",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 5,
                  }}
                >
                  <Icons.map
                    name={IconNames.mapOutline as any}
                    size={20}
                    color="#030014"
                    style={{ marginBottom: 6, alignSelf: "center" }}
                  />
                  <Text className="text-primary font-bold text-center text-xs">
                    My Deliveries
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAction("earnings")}
                  className="bg-secondary border-2 border-accent/30 px-4 py-3.5 flex-1 min-w-[30%]"
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
                    color="#AB8BFF"
                    style={{ marginBottom: 6, alignSelf: "center" }}
                  />
                  <Text className="text-accent font-bold text-center text-xs">
                    Earnings
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Customer/Admin Quick Actions */
              <View className="flex-row flex-wrap gap-2.5">
                <TouchableOpacity
                  onPress={() => handleAction("request")}
                  className="bg-accent px-4 py-3.5 flex-1 min-w-[30%]"
                  style={{
                    borderRadius: 20,
                    shadowColor: "#AB8BFF",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 5,
                  }}
                >
                  <Icons.action
                    name={IconNames.addCircle as any}
                    size={20}
                    color="#030014"
                    style={{ marginBottom: 6, alignSelf: "center" }}
                  />
                  <Text className="text-primary font-bold text-center text-xs">
                    Request Delivery
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAction("track")}
                  className="bg-accentWarm px-4 py-3.5 flex-1 min-w-[30%]"
                  style={{
                    borderRadius: 20,
                    shadowColor: "#FF9500",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 5,
                  }}
                >
                  <Icons.map
                    name={IconNames.mapOutline as any}
                    size={20}
                    color="#030014"
                    style={{ marginBottom: 6, alignSelf: "center" }}
                  />
                  <Text className="text-primary font-bold text-center text-xs">
                    Track Order
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAction("orders")}
                  className="bg-secondary border-2 border-accent/30 px-4 py-3.5 flex-1 min-w-[30%]"
                  style={{
                    borderRadius: 20,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Icons.package
                    name={IconNames.packageOutline as any}
                    size={20}
                    color="#AB8BFF"
                    style={{ marginBottom: 6, alignSelf: "center" }}
                  />
                  <Text className="text-accent font-bold text-center text-xs">
                    My Orders
                  </Text>
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
                <Text className="text-light-100 font-bold text-lg">
                  Emergency SOS
                </Text>
              </TouchableOpacity>
            </View>
          )}

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
              <Text className="text-light-100 text-lg font-bold">Features</Text>
            </View>
            <View className="gap-3">
              <View
                className="bg-secondary rounded-2xl p-4 border border-neutral-100"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center mb-2">
                  <View className="bg-accent/20 rounded-lg p-1.5 mr-2">
                    <Icons.action
                      name={IconNames.shieldOutline as any}
                      size={16}
                      color="#AB8BFF"
                    />
                  </View>
                  <Text className="text-accent font-bold text-base">
                    AI Safe Routes
                  </Text>
                </View>
                <Text className="text-light-300 text-sm">
                  Intelligent routing for maximum safety
                </Text>
              </View>
              <View
                className="bg-secondary rounded-2xl p-4 border border-neutral-100"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center mb-2">
                  <View className="bg-info/20 rounded-lg p-1.5 mr-2">
                    <Icons.map
                      name={IconNames.locationOutline as any}
                      size={16}
                      color="#5AC8FA"
                    />
                  </View>
                  <Text className="text-info font-bold text-base">
                    Real-Time Tracking
                  </Text>
                </View>
                <Text className="text-light-300 text-sm">
                  Follow your delivery live on the map
                </Text>
              </View>
              <View
                className="bg-secondary rounded-2xl p-4 border border-neutral-100"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center mb-2">
                  <View className="bg-success/20 rounded-lg p-1.5 mr-2">
                    <Icons.status
                      name={IconNames.checkmarkCircle as any}
                      size={16}
                      color="#30D158"
                    />
                  </View>
                  <Text className="text-success font-bold text-base">
                    Night Assurance
                  </Text>
                </View>
                <Text className="text-light-300 text-sm">
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
                className="bg-accent rounded-2xl py-4 px-6 flex-row items-center justify-center"
                style={{
                  shadowColor: "#AB8BFF",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
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
