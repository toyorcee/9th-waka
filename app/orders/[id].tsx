import OrderChat from "@/components/OrderChat";
import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { SocketEvents } from "@/constants/socketEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  cancelOrder,
  generateDeliveryOtp,
  getOrder,
  requestPriceChange,
  respondToPriceRequest,
  updateDeliveryProof,
  updateOrderStatus,
  uploadDeliveryProofPhoto,
  verifyDeliveryOtp,
} from "@/services/orderApi";
import {
  getOrderLocationHistory,
  LocationHistoryEntry,
} from "@/services/riderApi";
import { socketClient } from "@/services/socketClient";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [requestedPrice, setRequestedPrice] = useState("");
  const [priceReason, setPriceReason] = useState("");
  const [submittingPrice, setSubmittingPrice] = useState(false);
  const [respondingPrice, setRespondingPrice] = useState(false);
  const [locationHistory, setLocationHistory] = useState<
    LocationHistoryEntry[]
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [realTimeLocation, setRealTimeLocation] = useState<{
    lat: number;
    lng: number;
    timestamp: string;
  } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpData, setOtpData] = useState<{
    otp: string;
    expiresAt: string | Date;
  } | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const orderData = await getOrder(id);
      setOrder(orderData);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error || e?.message || "Failed to load order";
      Toast.show({ type: "error", text1: "Error", text2: String(msg) });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPriceChange = async () => {
    const price = Number(requestedPrice);
    if (!price || price <= 0) {
      Toast.show({ type: "error", text1: "Enter valid price" });
      return;
    }
    if (price <= (order?.originalPrice || order?.price || 0)) {
      Toast.show({
        type: "error",
        text1: "Requested price must be higher than original",
      });
      return;
    }

    setSubmittingPrice(true);
    try {
      await requestPriceChange(id, price, priceReason || undefined);
      Toast.show({ type: "success", text1: "Price change requested" });
      setShowPriceModal(false);
      setRequestedPrice("");
      setPriceReason("");
      await load();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Failed",
        text2: e?.response?.data?.error || e?.message,
      });
    } finally {
      setSubmittingPrice(false);
    }
  };

  const handleRespondToPrice = async (accept: boolean) => {
    setRespondingPrice(true);
    try {
      await respondToPriceRequest(id, accept);
      Toast.show({
        type: "success",
        text1: accept ? "Price change accepted" : "Price change rejected",
      });
      await load();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Failed",
        text2: e?.response?.data?.error || e?.message,
      });
    } finally {
      setRespondingPrice(false);
    }
  };

  const handleUpdateStatus = async (action: "pickup" | "start" | "deliver") => {
    setUpdatingStatus(true);
    try {
      const updatedOrder = await updateOrderStatus(id, action);
      if (updatedOrder) {
        setOrder(updatedOrder);
      }
      Toast.show({
        type: "success",
        text1: "Status updated",
        text2: `Order marked as ${
          action === "pickup"
            ? "picked up"
            : action === "start"
            ? "delivering"
            : "delivered"
        }`,
      });
      // Also refresh to get any additional updates (non-blocking)
      load().catch(() => {});
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Failed",
        text2: e?.response?.data?.error || e?.message,
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleGenerateOtp = async () => {
    try {
      const result = await generateDeliveryOtp(id);
      setOtpData(result);
      Toast.show({
        type: "success",
        text1: "OTP Generated",
        text2: `Code: ${result.otp} - Valid for 15 minutes`,
      });
      // Show OTP to rider (they'll share with customer)
      Alert.alert(
        "Delivery OTP Generated",
        `Your delivery code is: ${result.otp}\n\nShare this code with the customer. It expires in 15 minutes.`,
        [{ text: "OK" }]
      );
      await load();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Failed to generate OTP",
        text2: e?.response?.data?.error || e?.message,
      });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 4) {
      Toast.show({ type: "error", text1: "Enter 4-digit OTP code" });
      return;
    }
    setVerifyingOtp(true);
    try {
      await verifyDeliveryOtp(id, otpCode);
      Toast.show({
        type: "success",
        text1: "Delivery Verified",
        text2: "Order marked as delivered",
      });
      setShowOtpModal(false);
      setOtpCode("");
      // After OTP verification, show proof upload modal
      setShowProofModal(true);
      await load();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Invalid OTP",
        text2: e?.response?.data?.error || e?.message,
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handlePickPhoto = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: "Permission needed",
          text2: "Please grant camera roll access",
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setProofPhoto(result.assets[0].uri);
      }
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Failed to pick image",
        text2: e?.message,
      });
    }
  };

  const handleUploadProof = async () => {
    if (!proofPhoto) {
      Toast.show({ type: "error", text1: "Please upload a photo" });
      return;
    }
    setUploadingProof(true);
    try {
      const { photoUrl } = await uploadDeliveryProofPhoto(id, proofPhoto);

      await updateDeliveryProof(id, {
        photoUrl,
        recipientName: recipientName || undefined,
        recipientPhone: recipientPhone || undefined,
        note: proofNote || undefined,
      });
      Toast.show({
        type: "success",
        text1: "Proof uploaded",
        text2: "Delivery proof has been saved",
      });
      setShowProofModal(false);
      setProofPhoto(null);
      setRecipientName("");
      setRecipientPhone("");
      setProofNote("");
      await load();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Failed to upload proof",
        text2: e?.response?.data?.error || e?.message,
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      await cancelOrder(id, cancelReason || undefined);
      Toast.show({
        type: "success",
        text1: "Order Cancelled",
        text2: "The order has been cancelled successfully",
      });
      setShowCancelModal(false);
      setCancelReason("");
      await load();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Failed to cancel order",
        text2: e?.response?.data?.error || e?.message,
      });
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    load();
    if (id && order?.status === "delivered") {
      loadLocationHistory();
    }
  }, [id]);

  useEffect(() => {
    if (order?.status === "delivered") {
      loadLocationHistory();
    }
  }, [order?.status]);

  useEffect(() => {
    if (!id || !order) return;

    const handleLocationUpdate = (data: any) => {
      if (data.orderId === id) {
        setRealTimeLocation({
          lat: data.lat,
          lng: data.lng,
          timestamp: data.timestamp,
        });
        setOrder((prev: any) => ({
          ...prev,
          riderLocation: {
            lat: data.lat,
            lng: data.lng,
            lastSeen: data.timestamp,
            online: true,
          },
        }));
      }
    };

    const handleStatusUpdate = (data: any) => {
      if (data.id === id || data.orderId === id) {
        setOrder((prev: any) => ({
          ...prev,
          status: data.status,
        }));
        load().catch(() => {});
      }
    };

    const socket = socketClient.socketInstance;
    if (!socket) return;

    socket.on(SocketEvents.RIDER_LOCATION_UPDATED, handleLocationUpdate);
    socket.on(SocketEvents.ORDER_STATUS_UPDATED, handleStatusUpdate);

    const handleCustomEvent = (event: any) => {
      if (event.detail?.orderId === id) {
        handleLocationUpdate(event.detail);
      }
    };
    if (
      typeof window !== "undefined" &&
      typeof window.addEventListener === "function"
    ) {
      window.addEventListener("rider-location-updated", handleCustomEvent);
    }

    return () => {
      socket.off(SocketEvents.RIDER_LOCATION_UPDATED, handleLocationUpdate);
      socket.off(SocketEvents.ORDER_STATUS_UPDATED, handleStatusUpdate);
      if (
        typeof window !== "undefined" &&
        typeof window.removeEventListener === "function"
      ) {
        window.removeEventListener("rider-location-updated", handleCustomEvent);
      }
    };
  }, [id, order]);

  const loadLocationHistory = async () => {
    if (!id) return;
    setLoadingHistory(true);
    try {
      const history = await getOrderLocationHistory(id);
      setLocationHistory(history.history || []);
    } catch (e: any) {
      console.error("Error loading location history:", e);
      // Don't show error toast, just fail silently
    } finally {
      setLoadingHistory(false);
    }
  };

  if (loading) {
    return (
      <View
        className={`flex-1 ${
          isDark ? "bg-primary" : "bg-white"
        } items-center justify-center`}
      >
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  if (!order) {
    return (
      <View
        className={`flex-1 ${
          isDark ? "bg-primary" : "bg-white"
        } items-center justify-center`}
      >
        <Text className={isDark ? "text-light-300" : "text-gray-600"}>
          Order not found
        </Text>
      </View>
    );
  }

  const timeline = order.timeline || [];
  const delivery = order.delivery || {};

  const openMaps = (lat: number, lng: number) => {
    const url = `https://maps.google.com/maps?q=${lat},${lng}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          const geoUrl = `geo:${lat},${lng}`;
          return Linking.openURL(geoUrl);
        }
      })
      .catch((err: any) => {
        console.error("Failed to open maps", err);
        Toast.show({
          type: "error",
          text1: "Unable to open maps",
          text2: "Please install a maps app",
        });
      });
  };

  // Helper functions
  const formatDate = (date: string | Date) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return {
          bg: "bg-warning/20",
          text: "text-warning",
          border: "border-warning/30",
        };
      case "assigned":
        return {
          bg: "bg-info/20",
          text: "text-info",
          border: "border-info/30",
        };
      case "picked_up":
      case "delivering":
        return {
          bg: "bg-accent/20",
          text: "text-accent",
          border: "border-accent/30",
        };
      case "delivered":
        return {
          bg: "bg-active/20",
          text: "text-active",
          border: "border-active/30",
        };
      case "cancelled":
        return {
          bg: "bg-danger/20",
          text: "text-danger",
          border: "border-danger/30",
        };
      default:
        return {
          bg: "bg-neutral-100/20",
          text: "text-light-300",
          border: "border-neutral-100/30",
        };
    }
  };

  const statusInfo = getStatusColor(order.status);

  return (
    <>
      <ScrollView
        className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-6 px-6 pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-1">
              <View className="flex-row items-center mb-2">
                <View className="bg-accent/20 rounded-xl p-2 mr-3">
                  <Icons.package
                    name={MCIconNames.packageVariant as any}
                    size={22}
                    color="#AB8BFF"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-xl font-bold ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    Order #
                    {String(order._id || order.id)
                      .slice(-6)
                      .toUpperCase()}
                  </Text>
                  <Text
                    className={`text-xs mt-0.5 ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Created {formatDate(order.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              {(order.riderId || user?.role === "rider") && (
                <TouchableOpacity
                  onPress={() => setShowChat(true)}
                  className="bg-accent rounded-xl px-4 py-2.5"
                  style={{
                    shadowColor: "#AB8BFF",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  <Icons.communication
                    name={IconNames.chatbubbleOutline as any}
                    size={18}
                    color="#030014"
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={load}
                className={`border rounded-xl px-4 py-2.5 ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.1 : 0.05,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Icons.action
                  name={IconNames.refreshCircle as any}
                  size={18}
                  color="#AB8BFF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Order Summary Section */}
          <View
            className={`rounded-3xl p-5 mb-4 border ${
              isDark
                ? "bg-secondary border-neutral-100"
                : "bg-white border-gray-200"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.1 : 0.05,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View className="bg-accent/20 rounded-lg p-1.5 mr-2">
                <Icons.status
                  name={IconNames.informationOutline as any}
                  size={16}
                  color="#AB8BFF"
                />
              </View>
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Order Summary
              </Text>
            </View>

            <View className="flex-row gap-3 mb-3">
              <View
                className={`flex-1 rounded-2xl p-3 ${
                  isDark ? "bg-dark-100" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-xs mb-1 ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Status
                </Text>
                <View
                  className={`${statusInfo.bg} ${statusInfo.border} border px-2 py-1 rounded-lg`}
                >
                  <Text
                    className={`${statusInfo.text} text-xs font-bold capitalize`}
                  >
                    {String(order.status).replace("_", " ")}
                  </Text>
                </View>
              </View>
              {order.meta?.distanceKm && (
                <View
                  className={`flex-1 rounded-2xl p-3 ${
                    isDark ? "bg-dark-100" : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-xs mb-1 ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Distance
                  </Text>
                  <View className="flex-row items-center">
                    <Icons.map
                      name={IconNames.navigateOutline as any}
                      size={14}
                      color="#5AC8FA"
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      className={`text-sm font-semibold ${
                        isDark ? "text-light-100" : "text-black"
                      }`}
                    >
                      {order.meta.distanceKm.toFixed(1)} km
                    </Text>
                  </View>
                </View>
              )}
              {order.preferredVehicleType && (
                <View
                  className={`flex-1 rounded-2xl p-3 ${
                    isDark ? "bg-dark-100" : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-xs mb-1 ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Vehicle
                  </Text>
                  <Text
                    className={`text-sm font-semibold capitalize ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    {order.preferredVehicleType}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Route Information Section */}
          <View
            className={`rounded-3xl p-5 mb-4 border ${
              isDark
                ? "bg-secondary border-neutral-100"
                : "bg-white border-gray-200"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.1 : 0.05,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View className="bg-info/20 rounded-lg p-1.5 mr-2">
                <Icons.location
                  name={IconNames.locationOutline as any}
                  size={16}
                  color="#5AC8FA"
                />
              </View>
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Route Details
              </Text>
            </View>

            <View className="mb-4">
              <View className="flex-row items-start mb-3">
                <View className="bg-info/20 rounded-xl p-2 mr-3">
                  <Icons.location
                    name={IconNames.locationOutline as any}
                    size={14}
                    color="#5AC8FA"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-xs mb-1 font-medium ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Pickup Location
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    {order.pickup?.address || "N/A"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start mb-3">
                <View className="bg-warning/20 rounded-xl p-2 mr-3">
                  <Icons.location
                    name={IconNames.locationOutline as any}
                    size={14}
                    color="#FF9500"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-xs mb-1 font-medium ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Dropoff Location
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    {order.dropoff?.address || "N/A"}
                  </Text>
                </View>
              </View>

              <View
                className={`flex-row items-start pt-3 border-t ${
                  isDark ? "border-neutral-100/50" : "border-gray-200"
                }`}
              >
                <View className="bg-accent/20 rounded-xl p-2 mr-3">
                  <Icons.package
                    name={IconNames.boxOutline as any}
                    size={14}
                    color="#AB8BFF"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-xs mb-1 font-medium ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Items
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    {order.items || "No items specified"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Financial Breakdown Section */}
          {order.financial && (
            <View
              className={`rounded-3xl p-5 mb-4 border ${
                isDark
                  ? "bg-secondary border-neutral-100"
                  : "bg-white border-gray-200"
              }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.1 : 0.05,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center mb-4">
                <View className="bg-active/20 rounded-lg p-1.5 mr-2">
                  <Icons.money
                    name={MCIconNames.cash as any}
                    size={16}
                    color="#30D158"
                  />
                </View>
                <Text
                  className={`text-lg font-bold ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Financial Breakdown
                </Text>
              </View>

              <View className="space-y-3">
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Gross Amount
                  </Text>
                  <Text
                    className={`font-semibold ${
                      isDark ? "text-light-200" : "text-black"
                    }`}
                  >
                    ₦{Number(order.financial.grossAmount || 0).toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`text-sm ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    Commission ({order.financial.commissionRatePct || 0}%)
                  </Text>
                  <Text className={isDark ? "text-light-300" : "text-gray-600"}>
                    ₦
                    {Number(
                      order.financial.commissionAmount || 0
                    ).toLocaleString()}
                  </Text>
                </View>
                <View
                  className={`pt-3 border-t flex-row items-center justify-between ${
                    isDark ? "border-neutral-100/50" : "border-gray-200"
                  }`}
                >
                  <Text
                    className={`font-bold ${
                      isDark ? "text-light-200" : "text-black"
                    }`}
                  >
                    Rider Earnings
                  </Text>
                  <Text className="text-active text-lg font-bold">
                    ₦
                    {Number(
                      order.financial.riderNetAmount || 0
                    ).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Pricing Section */}
          <View
            className={`rounded-3xl p-5 mb-4 border ${
              isDark
                ? "bg-secondary border-neutral-100"
                : "bg-white border-gray-200"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.1 : 0.05,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View className="bg-accent/20 rounded-lg p-1.5 mr-2">
                <Icons.money
                  name={MCIconNames.cash as any}
                  size={16}
                  color="#AB8BFF"
                />
              </View>
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Pricing
              </Text>
            </View>

            <View className="space-y-3">
              <View className="flex-row items-center justify-between">
                <Text
                  className={`text-sm ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Original Price
                </Text>
                <Text
                  className={`text-sm ${
                    isDark ? "text-light-300" : "text-gray-600"
                  }`}
                >
                  ₦
                  {Number(
                    order.originalPrice || order.price || 0
                  ).toLocaleString()}
                </Text>
              </View>
              {order.priceNegotiation?.status === "accepted" &&
                order.price !== order.originalPrice && (
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-sm ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
                      Negotiated Price
                    </Text>
                    <Text className="text-accent font-bold">
                      ₦{Number(order.price || 0).toLocaleString()}
                    </Text>
                  </View>
                )}
              <View
                className={`pt-3 border-t flex-row items-center justify-between ${
                  isDark ? "border-neutral-100/50" : "border-gray-200"
                }`}
              >
                <Text
                  className={`font-bold text-base ${
                    isDark ? "text-light-200" : "text-black"
                  }`}
                >
                  Final Price
                </Text>
                <Text className="text-accent text-xl font-bold">
                  ₦{Number(order.price || 0).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Price Negotiation UI */}
            {user?.role === "rider" &&
              order.status === "pending" &&
              order.priceNegotiation?.status !== "requested" &&
              order.priceNegotiation?.status !== "accepted" && (
                <TouchableOpacity
                  onPress={() => setShowPriceModal(true)}
                  className="bg-accent rounded-xl px-4 py-3 mt-4"
                >
                  <Text className="text-primary font-bold text-center">
                    Request Price Change
                  </Text>
                </TouchableOpacity>
              )}

            {user?.role === "customer" &&
              String(order.customerId) === String(user.id) &&
              order.priceNegotiation?.status === "requested" && (
                <View
                  className={`mt-4 p-3 rounded-xl ${
                    isDark ? "bg-dark-100" : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-sm mb-2 ${
                      isDark ? "text-light-200" : "text-black"
                    }`}
                  >
                    Rider requested: ₦
                    {Number(order.riderRequestedPrice || 0).toLocaleString()}
                  </Text>
                  {order.priceNegotiation?.reason && (
                    <Text
                      className={`text-xs mb-3 ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
                      Reason: {order.priceNegotiation.reason}
                    </Text>
                  )}
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleRespondToPrice(true)}
                      disabled={respondingPrice}
                      className="flex-1 bg-green-500 rounded-xl px-4 py-2"
                    >
                      {respondingPrice ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white font-bold text-center">
                          Accept
                        </Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRespondToPrice(false)}
                      disabled={respondingPrice}
                      className="flex-1 bg-red-500 rounded-xl px-4 py-2"
                    >
                      {respondingPrice ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white font-bold text-center">
                          Reject
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

            {/* Cancel Order Button */}
            {(() => {
              const cancellableStatuses = ["pending", "assigned"];
              const isCancellable = cancellableStatuses.includes(order.status);

              const isCustomer =
                user?.role === "customer" &&
                String(order.customerId) === String(user.id);
              const isRider =
                user?.role === "rider" &&
                order.riderId &&
                String(order.riderId) === String(user.id);
              const isAdmin = user?.role === "admin";
              const hasPermission = isCustomer || isRider || isAdmin;

              return isCancellable && hasPermission;
            })() && (
              <TouchableOpacity
                onPress={() => setShowCancelModal(true)}
                className="bg-danger/20 border border-danger/30 rounded-xl px-4 py-3 mt-4 items-center flex-row justify-center"
              >
                <Text className="text-danger font-bold text-center text-base">
                  Cancel Order
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Rider Actions - Status Updates */}
          {user?.role === "rider" &&
            String(order.riderId) === String(user.id) && (
              <View
                className={`border rounded-2xl p-5 mb-4 ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-lg font-semibold mb-4 ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Order Actions
                </Text>

                {/* Pick Up Button - When assigned */}
                {order.status === "assigned" && (
                  <TouchableOpacity
                    onPress={() => handleUpdateStatus("pickup")}
                    disabled={updatingStatus}
                    className="bg-accent rounded-xl px-4 py-4 mb-3"
                  >
                    {updatingStatus ? (
                      <ActivityIndicator color="#030014" />
                    ) : (
                      <Text className="text-primary font-bold text-center text-base">
                        ✓ Mark as Picked Up
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* Start Delivery Button - When picked up */}
                {order.status === "picked_up" && (
                  <TouchableOpacity
                    onPress={() => handleUpdateStatus("start")}
                    disabled={updatingStatus}
                    className="bg-accent rounded-xl px-4 py-4 mb-3"
                  >
                    {updatingStatus ? (
                      <ActivityIndicator color="#030014" />
                    ) : (
                      <Text className="text-primary font-bold text-center text-base">
                        🚀 Start Delivery
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {order.status === "delivering" && !order.delivery?.otpCode && (
                  <TouchableOpacity
                    onPress={handleGenerateOtp}
                    className="bg-info rounded-xl px-4 py-4 mb-3"
                  >
                    <Text className="text-primary font-bold text-center text-base">
                      🔐 Generate Delivery OTP
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Show OTP if generated */}
                {order.delivery?.otpCode && (
                  <View
                    className={`rounded-xl p-4 mb-3 ${
                      isDark ? "bg-dark-100" : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-sm mb-2 ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      Delivery OTP Code
                    </Text>
                    <Text className="text-accent text-2xl font-bold text-center mb-2">
                      {order.delivery.otpCode}
                    </Text>
                    <Text
                      className={`text-xs text-center ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
                      Share this code with the customer
                    </Text>
                    {order.delivery.otpExpiresAt && (
                      <Text
                        className={`text-xs text-center mt-1 ${
                          isDark ? "text-light-400" : "text-gray-500"
                        }`}
                      >
                        Expires:{" "}
                        {new Date(
                          order.delivery.otpExpiresAt
                        ).toLocaleTimeString()}
                      </Text>
                    )}
                  </View>
                )}

                {/* Verify OTP Button - When delivering and OTP exists */}
                {order.status === "delivering" &&
                  order.delivery?.otpCode &&
                  !order.delivery?.otpVerifiedAt && (
                    <TouchableOpacity
                      onPress={() => setShowOtpModal(true)}
                      className="bg-success rounded-xl px-4 py-4 mb-3"
                    >
                      <Text className="text-primary font-bold text-center text-base">
                        ✓ Verify Delivery OTP
                      </Text>
                    </TouchableOpacity>
                  )}

                {/* Upload Proof Button - After OTP verified */}
                {order.status === "delivered" &&
                  order.delivery?.otpVerifiedAt &&
                  !order.delivery?.photoUrl && (
                    <TouchableOpacity
                      onPress={() => setShowProofModal(true)}
                      className="bg-accent rounded-xl px-4 py-4"
                    >
                      <Text className="text-primary font-bold text-center text-base">
                        📸 Upload Delivery Proof
                      </Text>
                    </TouchableOpacity>
                  )}
              </View>
            )}

          {/* Enhanced Timeline Section */}
          <View
            className={`rounded-3xl p-5 mb-4 border ${
              isDark
                ? "bg-secondary border-neutral-100"
                : "bg-white border-gray-200"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.1 : 0.05,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View className="bg-info/20 rounded-lg p-1.5 mr-2">
                <Icons.time
                  name={IconNames.timeOutline as any}
                  size={16}
                  color="#5AC8FA"
                />
              </View>
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Order Timeline
              </Text>
            </View>

            {timeline.length === 0 ? (
              <View
                className={`rounded-2xl p-6 items-center ${
                  isDark ? "bg-dark-100" : "bg-gray-100"
                }`}
              >
                <Icons.time
                  name={IconNames.timeOutline as any}
                  size={32}
                  color={isDark ? "#9CA4AB" : "#6E6E73"}
                />
                <Text
                  className={`text-sm mt-2 ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  No timeline events yet
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {timeline.map((t: any, idx: number) => {
                  const timelineStatusInfo = getStatusColor(t.status);
                  const isLast = idx === timeline.length - 1;
                  const statusColor =
                    timelineStatusInfo.text === "text-warning"
                      ? "#FF9500"
                      : timelineStatusInfo.text === "text-info"
                      ? "#5AC8FA"
                      : timelineStatusInfo.text === "text-accent"
                      ? "#AB8BFF"
                      : timelineStatusInfo.text === "text-active"
                      ? "#30D158"
                      : timelineStatusInfo.text === "text-danger"
                      ? "#FF3B30"
                      : "#9CA4AB";
                  return (
                    <View key={idx} className="flex-row">
                      <View className="items-center mr-3">
                        <View
                          className={`${timelineStatusInfo.bg} ${timelineStatusInfo.border} border-2 w-10 h-10 rounded-full items-center justify-center`}
                        >
                          <Icons.status
                            name={IconNames.checkmarkCircle as any}
                            size={16}
                            color={statusColor}
                          />
                        </View>
                        {!isLast && (
                          <View className="w-0.5 h-full bg-neutral-100/30 mt-1" />
                        )}
                      </View>
                      <View className="flex-1 pb-4">
                        <Text
                          className={`${timelineStatusInfo.text} text-sm font-bold capitalize mb-1`}
                        >
                          {String(t.status).replace("_", " ")}
                        </Text>
                        <Text
                          className={`text-xs mb-1 ${
                            isDark ? "text-light-400" : "text-gray-500"
                          }`}
                        >
                          {formatDate(t.at)}
                        </Text>
                        {t.note && (
                          <View
                            className={`rounded-lg p-2 mt-1 ${
                              isDark ? "bg-dark-100" : "bg-gray-100"
                            }`}
                          >
                            <Text
                              className={`text-xs ${
                                isDark ? "text-light-300" : "text-gray-600"
                              }`}
                            >
                              {t.note}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {order.status === "delivered" && (
            <View
              className={`border rounded-2xl p-5 mb-4 ${
                isDark
                  ? "bg-secondary border-neutral-100"
                  : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`text-lg font-semibold mb-3 ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Delivery Proof
              </Text>
              {delivery.photoUrl ? (
                <Image
                  source={{ uri: delivery.photoUrl }}
                  style={{ width: "100%", height: 200, borderRadius: 12 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  className={`rounded-xl p-8 items-center ${
                    isDark ? "bg-dark-100" : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-center ${
                      isDark ? "text-light-400" : "text-gray-500"
                    }`}
                  >
                    No photo uploaded
                  </Text>
                </View>
              )}
              <View className="mt-4 space-y-3">
                {delivery.recipientName && (
                  <View>
                    <Text
                      className={`text-sm mb-1 ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      Recipient Name
                    </Text>
                    <Text
                      className={`font-semibold ${
                        isDark ? "text-light-100" : "text-black"
                      }`}
                    >
                      {delivery.recipientName}
                    </Text>
                  </View>
                )}
                {delivery.recipientPhone && (
                  <View>
                    <Text
                      className={`text-sm mb-1 ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      Recipient Phone
                    </Text>
                    <Text className={isDark ? "text-light-100" : "text-black"}>
                      {delivery.recipientPhone}
                    </Text>
                  </View>
                )}
                {delivery.note && (
                  <View>
                    <Text
                      className={`text-sm mb-1 ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      Note
                    </Text>
                    <Text className={isDark ? "text-light-100" : "text-black"}>
                      {delivery.note}
                    </Text>
                  </View>
                )}
                {delivery.deliveredAt && (
                  <View>
                    <Text
                      className={`text-sm mb-1 ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      Delivered At
                    </Text>
                    <Text className={isDark ? "text-light-100" : "text-black"}>
                      {new Date(delivery.deliveredAt).toLocaleString()}
                    </Text>
                  </View>
                )}
                {delivery.otpVerifiedAt && (
                  <View>
                    <Text
                      className={`text-sm mb-1 ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      OTP Verified At
                    </Text>
                    <Text className={isDark ? "text-light-100" : "text-black"}>
                      {new Date(delivery.otpVerifiedAt).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Rider Location Section - Show for customers and admin when order is active */}
          {order.riderLocation &&
            (user?.role === "customer" || user?.role === "admin") &&
            ["assigned", "picked_up", "delivering"].includes(order.status) && (
              <View
                className={`border rounded-2xl p-5 mb-4 ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-lg font-semibold mb-3 ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Rider Location
                </Text>
                <View className="mb-3">
                  <Text
                    className={`text-sm mb-1 ${
                      isDark ? "text-light-300" : "text-gray-600"
                    }`}
                  >
                    Status
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <View
                      className={`w-3 h-3 rounded-full ${
                        order.riderLocation.online
                          ? "bg-green-500"
                          : "bg-gray-500"
                      }`}
                    />
                    <Text className={isDark ? "text-light-100" : "text-black"}>
                      {order.riderLocation.online
                        ? "Online"
                        : "Last seen: " +
                          new Date(
                            order.riderLocation.lastSeen
                          ).toLocaleTimeString()}
                    </Text>
                  </View>
                  {realTimeLocation && (
                    <Text
                      className={`text-xs mt-1 ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
                      Last updated:{" "}
                      {new Date(
                        realTimeLocation.timestamp
                      ).toLocaleTimeString()}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const location = realTimeLocation || order.riderLocation;
                    if (location?.lat && location?.lng) {
                      openMaps(location.lat, location.lng);
                    }
                  }}
                  className="bg-accent rounded-xl px-4 py-3 mt-2"
                >
                  <Text className="text-primary font-bold text-center">
                    View on Google Maps
                  </Text>
                </TouchableOpacity>
                <Text
                  className={`text-xs mt-2 text-center ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  {realTimeLocation
                    ? "Location updates in real-time"
                    : "Tap to open rider's current location in Google Maps"}
                </Text>
              </View>
            )}

          {/* Location History Section - Show for completed orders (customers and admin only) */}
          {(user?.role === "customer" || user?.role === "admin") &&
            order.status === "delivered" &&
            locationHistory.length > 0 && (
              <View
                className={`border rounded-2xl p-5 mb-4 ${
                  isDark
                    ? "bg-secondary border-neutral-100"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-lg font-semibold mb-3 ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Delivery Route History
                </Text>
                {loadingHistory ? (
                  <ActivityIndicator size="small" color="#AB8BFF" />
                ) : (
                  <>
                    <Text
                      className={`text-sm mb-3 ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
                      {locationHistory.length} location points recorded during
                      delivery
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="mb-3"
                    >
                      <View className="flex-row gap-2">
                        {locationHistory
                          .filter((_, idx) => idx % 5 === 0)
                          .slice(0, 10)
                          .map((entry, idx) => (
                            <TouchableOpacity
                              key={idx}
                              onPress={() => {
                                openMaps(entry.lat, entry.lng);
                              }}
                              className={`border rounded-lg px-3 py-2 ${
                                isDark
                                  ? "bg-dark-100 border-neutral-100"
                                  : "bg-gray-100 border-gray-200"
                              }`}
                            >
                              <Text
                                className={`text-xs ${
                                  isDark ? "text-light-300" : "text-gray-600"
                                }`}
                              >
                                {new Date(entry.timestamp).toLocaleTimeString()}
                              </Text>
                              {entry.speed && (
                                <Text
                                  className={`text-xs ${
                                    isDark ? "text-light-400" : "text-gray-500"
                                  }`}
                                >
                                  {Math.round(entry.speed)} km/h
                                </Text>
                              )}
                            </TouchableOpacity>
                          ))}
                      </View>
                    </ScrollView>
                    <Text
                      className={`text-xs text-center ${
                        isDark ? "text-light-400" : "text-gray-500"
                      }`}
                    >
                      Tap any point to view on Google Maps
                    </Text>
                  </>
                )}
              </View>
            )}
        </View>

        {/* Price Request Modal */}
        <Modal
          visible={showPriceModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPriceModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View
              className={`rounded-t-3xl p-6 pb-10 ${
                isDark ? "bg-secondary" : "bg-white"
              }`}
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text
                  className={`text-xl font-bold ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Request Price Change
                </Text>
                <TouchableOpacity onPress={() => setShowPriceModal(false)}>
                  <Text className={isDark ? "text-light-400" : "text-gray-500"}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                className={`text-sm mb-2 ${
                  isDark ? "text-light-300" : "text-gray-600"
                }`}
              >
                Original Price: ₦
                {Number(
                  order?.originalPrice || order?.price || 0
                ).toLocaleString()}
              </Text>

              <View className="mb-4">
                <Text
                  className={`mb-2 ${
                    isDark ? "text-light-300" : "text-gray-600"
                  }`}
                >
                  Requested Price (NGN)
                </Text>
                <TextInput
                  value={requestedPrice}
                  onChangeText={setRequestedPrice}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  placeholderTextColor="#9CA4AB"
                  className={`rounded-xl px-4 py-3 ${
                    isDark
                      ? "text-light-100 bg-dark-100"
                      : "text-black bg-gray-100"
                  }`}
                />
              </View>

              <View className="mb-6">
                <Text
                  className={`mb-2 ${
                    isDark ? "text-light-300" : "text-gray-600"
                  }`}
                >
                  Reason (Optional)
                </Text>
                <TextInput
                  value={priceReason}
                  onChangeText={setPriceReason}
                  placeholder="e.g., Heavy traffic, Long distance"
                  placeholderTextColor="#9CA4AB"
                  multiline
                  numberOfLines={3}
                  className={`rounded-xl px-4 py-3 ${
                    isDark
                      ? "text-light-100 bg-dark-100"
                      : "text-black bg-gray-100"
                  }`}
                  style={{ textAlignVertical: "top" }}
                />
              </View>

              <TouchableOpacity
                onPress={handleRequestPriceChange}
                disabled={submittingPrice || !requestedPrice}
                className="bg-accent rounded-xl px-4 py-3"
              >
                {submittingPrice ? (
                  <ActivityIndicator color="#030014" />
                ) : (
                  <Text className="text-primary font-bold text-center">
                    Submit Request
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* OTP Verification Modal */}
        <Modal
          visible={showOtpModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowOtpModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View
              className={`rounded-t-3xl p-6 pb-10 ${
                isDark ? "bg-secondary" : "bg-white"
              }`}
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text
                  className={`text-xl font-bold ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Verify Delivery OTP
                </Text>
                <TouchableOpacity onPress={() => setShowOtpModal(false)}>
                  <Text className={isDark ? "text-light-400" : "text-gray-500"}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                className={`text-sm mb-4 ${
                  isDark ? "text-light-300" : "text-gray-600"
                }`}
              >
                Enter the 4-digit OTP code provided by the recipient
              </Text>

              <View className="mb-6">
                <Text
                  className={`mb-2 ${
                    isDark ? "text-light-300" : "text-gray-600"
                  }`}
                >
                  OTP Code
                </Text>
                <TextInput
                  value={otpCode}
                  onChangeText={(text) => {
                    // Only allow numbers, max 4 digits
                    const numeric = text.replace(/[^0-9]/g, "").slice(0, 4);
                    setOtpCode(numeric);
                  }}
                  placeholder="0000"
                  keyboardType="numeric"
                  maxLength={4}
                  placeholderTextColor="#9CA4AB"
                  className={`rounded-xl px-4 py-4 text-center text-2xl font-bold tracking-widest ${
                    isDark
                      ? "text-light-100 bg-dark-100"
                      : "text-black bg-gray-100"
                  }`}
                />
              </View>

              <TouchableOpacity
                onPress={handleVerifyOtp}
                disabled={verifyingOtp || otpCode.length !== 4}
                className={`bg-accent rounded-xl px-4 py-4 ${
                  otpCode.length !== 4 ? "opacity-50" : ""
                }`}
              >
                {verifyingOtp ? (
                  <ActivityIndicator color="#030014" />
                ) : (
                  <Text className="text-primary font-bold text-center text-base">
                    Verify & Complete Delivery
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Delivery Proof Upload Modal */}
        <Modal
          visible={showProofModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowProofModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <ScrollView
              className={`rounded-t-3xl ${
                isDark ? "bg-secondary" : "bg-white"
              }`}
            >
              <View className="p-6 pb-10">
                <View className="flex-row items-center justify-between mb-4">
                  <Text
                    className={`text-xl font-bold ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    Upload Delivery Proof
                  </Text>
                  <TouchableOpacity onPress={() => setShowProofModal(false)}>
                    <Text
                      className={isDark ? "text-light-400" : "text-gray-500"}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text
                  className={`text-sm mb-4 ${
                    isDark ? "text-light-300" : "text-gray-600"
                  }`}
                >
                  Upload a photo and recipient details to complete delivery
                  proof
                </Text>

                {/* Photo Upload */}
                <View className="mb-4">
                  <Text className="text-light-300 mb-2">Delivery Photo</Text>
                  {proofPhoto ? (
                    <View>
                      <Image
                        source={{ uri: proofPhoto || "" }}
                        style={{
                          width: "100%",
                          height: 200,
                          borderRadius: 12,
                          marginBottom: 12,
                        }}
                      />
                      <TouchableOpacity
                        onPress={handlePickPhoto}
                        className="bg-dark-100 rounded-xl px-4 py-3"
                      >
                        <Text className="text-light-200 font-semibold text-center">
                          Change Photo
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handlePickPhoto}
                      className="bg-dark-100 border-2 border-dashed border-neutral-100 rounded-xl px-4 py-8 items-center"
                    >
                      <Text className="text-light-400 text-center mb-2">
                        📸 Tap to upload photo
                      </Text>
                      <Text className="text-light-500 text-xs text-center">
                        Handoff photo with recipient
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Recipient Name */}
                <View className="mb-4">
                  <Text className="text-light-300 mb-2">Recipient Name</Text>
                  <TextInput
                    value={recipientName}
                    onChangeText={setRecipientName}
                    placeholder="e.g., Tolu A."
                    placeholderTextColor="#9CA4AB"
                    className="text-light-100 bg-dark-100 rounded-xl px-4 py-3"
                  />
                </View>

                {/* Recipient Phone (Optional) */}
                <View className="mb-4">
                  <Text className="text-light-300 mb-2">
                    Recipient Phone (Optional)
                  </Text>
                  <TextInput
                    value={recipientPhone}
                    onChangeText={setRecipientPhone}
                    placeholder="e.g., +234 812 345 6789"
                    keyboardType="phone-pad"
                    placeholderTextColor="#9CA4AB"
                    className="text-light-100 bg-dark-100 rounded-xl px-4 py-3"
                  />
                </View>

                {/* Note (Optional) */}
                <View className="mb-6">
                  <Text className="text-light-300 mb-2">Note (Optional)</Text>
                  <TextInput
                    value={proofNote}
                    onChangeText={setProofNote}
                    placeholder="Any additional notes about the delivery"
                    placeholderTextColor="#9CA4AB"
                    multiline
                    numberOfLines={3}
                    className="text-light-100 bg-dark-100 rounded-xl px-4 py-3"
                    style={{ textAlignVertical: "top" }}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleUploadProof}
                  disabled={uploadingProof || !proofPhoto}
                  className={`bg-accent rounded-xl px-4 py-4 ${
                    !proofPhoto ? "opacity-50" : ""
                  }`}
                >
                  {uploadingProof ? (
                    <ActivityIndicator color="#030014" />
                  ) : (
                    <Text className="text-primary font-bold text-center text-base">
                      Upload Proof
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Cancel Order Modal */}
        <Modal
          visible={showCancelModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCancelModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-secondary rounded-t-3xl p-6 pb-10">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-light-100 text-xl font-bold">
                  Cancel Order
                </Text>
                <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                  <Text className="text-light-400 text-lg">✕</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-light-300 text-sm mb-4">
                Are you sure you want to cancel this order? This action cannot
                be undone. The rider will be notified and can accept other
                orders.
              </Text>

              <View className="mb-6">
                <Text className="text-light-300 mb-2">Reason (Optional)</Text>
                <TextInput
                  value={cancelReason}
                  onChangeText={setCancelReason}
                  placeholder="e.g., Change of plans, Wrong address"
                  placeholderTextColor="#9CA4AB"
                  multiline
                  numberOfLines={3}
                  className="text-light-100 bg-dark-100 rounded-xl px-4 py-3"
                  style={{ textAlignVertical: "top" }}
                />
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowCancelModal(false);
                    setCancelReason("");
                  }}
                  className="flex-1 bg-dark-100 rounded-xl py-4 items-center border border-neutral-100"
                >
                  <Text className="text-light-100 font-semibold text-base">
                    Keep Order
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCancelOrder}
                  disabled={cancelling}
                  className="flex-1 bg-danger rounded-xl py-4 items-center"
                  style={{
                    shadowColor: "#FF3B30",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  {cancelling ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-light-100 font-bold text-base">
                      Cancel Order
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* Chat Modal */}
      {id && (order?.riderId || user?.role === "rider") && (
        <OrderChat
          orderId={id}
          visible={showChat}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
}
