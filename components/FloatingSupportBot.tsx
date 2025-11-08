import OrderChat from "@/components/OrderChat";
import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { getMyOrders } from "@/services/orderApi";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const whatsappNumber =
  Constants.expoConfig?.extra?.ninthwakaWhatsapp ||
  process.env.EXPO_PUBLIC_NINTHWAKA_WHATSAPP ||
  "2348108663443";

export default function FloatingSupportBot() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [showModal, setShowModal] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [loadingActiveOrder, setLoadingActiveOrder] = useState(false);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Hide on auth pages
  const shouldShow =
    !pathname?.includes("/auth") && !pathname?.includes("/verify");

  // Load active order for chat
  useEffect(() => {
    if (isAuthenticated && showModal) {
      loadActiveOrder();
    }
  }, [isAuthenticated, showModal]);

  const loadActiveOrder = async () => {
    if (!isAuthenticated) return;
    setLoadingActiveOrder(true);
    try {
      // Get active orders with assigned rider/customer
      const response = await getMyOrders(1, 10);
      const orders = response.orders || [];

      // Find an active order (assigned, picked_up, delivering) with counterpart
      const activeOrder = orders.find((order: any) => {
        if (user?.role === "customer") {
          return (
            order.riderId &&
            ["assigned", "picked_up", "delivering"].includes(order.status)
          );
        } else {
          // For riders, find orders they're assigned to
          return (
            order.riderId === user?.id &&
            ["assigned", "picked_up", "delivering"].includes(order.status)
          );
        }
      });

      if (activeOrder) {
        const orderId = activeOrder._id || activeOrder.id;
        setActiveOrderId(orderId ? String(orderId) : null);
      } else {
        setActiveOrderId(null);
      }
    } catch (error) {
      console.error("Failed to load active order:", error);
      setActiveOrderId(null);
    } finally {
      setLoadingActiveOrder(false);
    }
  };

  useEffect(() => {
    if (!shouldShow) return;

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    // Float animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    floatAnimation.start();

    return () => {
      pulseAnimation.stop();
      floatAnimation.stop();
    };
  }, [shouldShow, pulseAnim, floatAnim]);

  const handlePress = () => {
    // Scale animation on press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setShowModal(true);
  };

  const handleWhatsApp = async () => {
    setShowModal(false);
    try {
      const message = encodeURIComponent(
        "Hello! I need help with my 9thWaka delivery."
      );
      const url = `https://wa.me/${whatsappNumber}?text=${message}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Cannot open WhatsApp",
          "Please make sure WhatsApp is installed on your device.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open WhatsApp. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const handleViewFAQ = () => {
    setShowModal(false);
    router.push("/support" as any);
  };

  const handleChatWithCounterpart = () => {
    if (activeOrderId) {
      setShowModal(false);
      setShowChat(true);
    }
  };

  const handleViewMessages = () => {
    setShowModal(false);
    router.push("/(tabs)/messages" as any);
  };

  if (!shouldShow) return null;

  return (
    <>
      {/* Floating Bot Button */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: insets.bottom + 80,
          right: 20,
          zIndex: 1000,
          transform: [{ scale: scaleAnim }, { translateY: floatAnim }],
        }}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          className="w-16 h-16 rounded-full bg-accent items-center justify-center"
          style={{
            shadowColor: "#AB8BFF",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 10,
            borderWidth: 3,
            borderColor: "#030014",
          }}
        >
          <Animated.View
            style={{
              position: "absolute",
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#AB8BFF",
              opacity: 0.3,
              transform: [{ scale: pulseAnim }],
            }}
          />
          <Icons.communication
            name={IconNames.chatbubbleOutline as any}
            size={28}
            color="#030014"
            style={{ zIndex: 1 }}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Action Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowModal(false)}
          className="flex-1 bg-black/60 items-center justify-center p-6"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm"
          >
            <View
              className="bg-secondary rounded-3xl p-6 border border-neutral-100"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              {/* Header */}
              <View className="items-center mb-6">
                <View className="bg-accent/20 rounded-full p-4 mb-3">
                  <Icons.communication
                    name={IconNames.chatbubbleOutline as any}
                    size={40}
                    color="#AB8BFF"
                  />
                </View>
                <Text className="text-light-100 text-xl font-bold mb-1">
                  How can we help?
                </Text>
                <Text className="text-light-400 text-sm text-center">
                  Choose an option below
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="gap-3">
                {isAuthenticated && activeOrderId && (
                  <TouchableOpacity
                    onPress={handleChatWithCounterpart}
                    disabled={loadingActiveOrder}
                    className="bg-success rounded-2xl p-5 flex-row items-center justify-between active:opacity-90"
                    style={{
                      shadowColor: "#30D158",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    <View className="flex-row items-center flex-1">
                      {loadingActiveOrder ? (
                        <ActivityIndicator
                          size="small"
                          color="#030014"
                          style={{ marginRight: 12 }}
                        />
                      ) : (
                        <View className="bg-primary/20 rounded-xl p-2.5 mr-4">
                          <Icons.communication
                            name={IconNames.chatbubbleOutline as any}
                            size={22}
                            color="#030014"
                          />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-primary font-bold text-base mb-0.5">
                          Chat with{" "}
                          {user?.role === "customer" ? "Rider" : "Customer"}
                        </Text>
                        <Text className="text-primary/70 text-xs">
                          {user?.role === "customer"
                            ? "Message your delivery rider"
                            : "Message your customer"}
                        </Text>
                      </View>
                    </View>
                    <Icons.navigation
                      name={IconNames.arrowForward as any}
                      size={20}
                      color="#030014"
                    />
                  </TouchableOpacity>
                )}

                {/* View All Messages */}
                {isAuthenticated && (
                  <TouchableOpacity
                    onPress={handleViewMessages}
                    className="bg-accent rounded-2xl p-5 flex-row items-center justify-between active:opacity-90"
                    style={{
                      shadowColor: "#AB8BFF",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    <View className="flex-row items-center flex-1">
                      <View className="bg-primary/20 rounded-xl p-2.5 mr-4">
                        <Icons.communication
                          name={IconNames.chatbubbleOutline as any}
                          size={22}
                          color="#030014"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-primary font-bold text-base mb-0.5">
                          View Messages
                        </Text>
                        <Text className="text-primary/70 text-xs">
                          See all conversations
                        </Text>
                      </View>
                    </View>
                    <Icons.navigation
                      name={IconNames.arrowForward as any}
                      size={20}
                      color="#030014"
                    />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleWhatsApp}
                  className="bg-accent rounded-2xl p-5 flex-row items-center justify-between active:opacity-90"
                  style={{
                    shadowColor: "#AB8BFF",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <View className="flex-row items-center flex-1">
                    <View className="bg-primary/20 rounded-xl p-2.5 mr-4">
                      <Icons.communication
                        name={IconNames.chatbubbleOutline as any}
                        size={22}
                        color="#030014"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-primary font-bold text-base mb-0.5">
                        Chat on WhatsApp
                      </Text>
                      <Text className="text-primary/70 text-xs">
                        Get instant support
                      </Text>
                    </View>
                  </View>
                  <Icons.navigation
                    name={IconNames.arrowForward as any}
                    size={20}
                    color="#030014"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleViewFAQ}
                  className="bg-accent rounded-2xl p-5 flex-row items-center justify-between active:opacity-90"
                  style={{
                    shadowColor: "#AB8BFF",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <View className="flex-row items-center flex-1">
                    <View className="bg-primary/20 rounded-xl p-2.5 mr-4">
                      <Icons.info
                        name={IconNames.informationOutline as any}
                        size={22}
                        color="#030014"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-primary font-bold text-base mb-0.5">
                        View FAQ
                      </Text>
                      <Text className="text-primary/70 text-xs">
                        Find answers to common questions
                      </Text>
                    </View>
                  </View>
                  <Icons.navigation
                    name={IconNames.arrowForward as any}
                    size={20}
                    color="#030014"
                  />
                </TouchableOpacity>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                className="mt-4 pt-4 border-t border-neutral-100"
              >
                <Text className="text-light-400 text-center font-semibold text-sm">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Chat Modal */}
      {activeOrderId && (
        <OrderChat
          orderId={activeOrderId}
          visible={showChat}
          onClose={() => {
            setShowChat(false);
            setActiveOrderId(null);
          }}
        />
      )}
    </>
  );
}
