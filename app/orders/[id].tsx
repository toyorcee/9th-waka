import OrderChat from "@/components/OrderChat";
import { IconNames, Icons, MCIconNames } from "@/constants/icons";
import { SocketEvents } from "@/constants/socketEvents";
import { useAuth } from "@/contexts/AuthContext";
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
  const insets = useSafeAreaInsets();
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
      await updateOrderStatus(id, action);
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
      await load();
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
      // Upload photo first
      const { photoUrl } = await uploadDeliveryProofPhoto(id, proofPhoto);

      // Then update delivery proof with recipient details
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
        // Also update the order's riderLocation
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

    const socket = socketClient.socketInstance;
    if (!socket) return;

    socket.on(SocketEvents.RIDER_LOCATION_UPDATED, handleLocationUpdate);

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
      <View className="flex-1 bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 bg-primary items-center justify-center">
        <Text className="text-light-300">Order not found</Text>
      </View>
    );
  }

  const timeline = order.timeline || [];
  const delivery = order.delivery || {};

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
        className="flex-1 bg-primary"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
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
                  <Text className="text-light-100 text-xl font-bold">
                    Order #
                    {String(order._id || order.id)
                      .slice(-6)
                      .toUpperCase()}
                  </Text>
                  <Text className="text-light-400 text-xs mt-0.5">
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
                className="bg-secondary border border-neutral-100 rounded-xl px-4 py-2.5"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
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
            className="bg-secondary rounded-3xl p-5 mb-4 border border-neutral-100"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
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
              <Text className="text-light-100 text-lg font-bold">
                Order Summary
              </Text>
            </View>

            <View className="flex-row gap-3 mb-3">
              <View className="flex-1 bg-dark-100 rounded-2xl p-3">
                <Text className="text-light-400 text-xs mb-1">Status</Text>
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
                <View className="flex-1 bg-dark-100 rounded-2xl p-3">
                  <Text className="text-light-400 text-xs mb-1">Distance</Text>
                  <View className="flex-row items-center">
                    <Icons.map
                      name={IconNames.navigateOutline as any}
                      size={14}
                      color="#5AC8FA"
                      style={{ marginRight: 4 }}
                    />
                    <Text className="text-light-100 text-sm font-semibold">
                      {order.meta.distanceKm.toFixed(1)} km
                    </Text>
                  </View>
                </View>
              )}
              {order.preferredVehicleType && (
                <View className="flex-1 bg-dark-100 rounded-2xl p-3">
                  <Text className="text-light-400 text-xs mb-1">Vehicle</Text>
                  <Text className="text-light-100 text-sm font-semibold capitalize">
                    {order.preferredVehicleType}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Route Information Section */}
          <View
            className="bg-secondary rounded-3xl p-5 mb-4 border border-neutral-100"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
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
              <Text className="text-light-100 text-lg font-bold">
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
                  <Text className="text-light-400 text-xs mb-1 font-medium">
                    Pickup Location
                  </Text>
                  <Text className="text-light-100 text-sm">
                    {order.pickup?.address || "N/A"}
                  </Text>
                  {order.pickup?.lat && order.pickup?.lng && (
                    <TouchableOpacity
                      onPress={() => {
                        const url = `https://www.google.com/maps?q=${order.pickup.lat},${order.pickup.lng}`;
                        Linking.openURL(url).catch((err: any) =>
                          console.error("Failed to open maps", err)
                        );
                      }}
                      className="mt-1"
                    >
                      <Text className="text-info text-xs">View on Map</Text>
                    </TouchableOpacity>
                  )}
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
                  <Text className="text-light-400 text-xs mb-1 font-medium">
                    Dropoff Location
                  </Text>
                  <Text className="text-light-100 text-sm">
                    {order.dropoff?.address || "N/A"}
                  </Text>
                  {order.dropoff?.lat && order.dropoff?.lng && (
                    <TouchableOpacity
                      onPress={() => {
                        const url = `https://www.google.com/maps?q=${order.dropoff.lat},${order.dropoff.lng}`;
                        Linking.openURL(url).catch((err: any) =>
                          console.error("Failed to open maps", err)
                        );
                      }}
                      className="mt-1"
                    >
                      <Text className="text-warning text-xs">View on Map</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View className="flex-row items-start pt-3 border-t border-neutral-100/50">
                <View className="bg-accent/20 rounded-xl p-2 mr-3">
                  <Icons.package
                    name={IconNames.boxOutline as any}
                    size={14}
                    color="#AB8BFF"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-light-400 text-xs mb-1 font-medium">
                    Items
                  </Text>
                  <Text className="text-light-100 text-sm">
                    {order.items || "No items specified"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Financial Breakdown Section */}
          {order.financial && (
            <View
              className="bg-secondary rounded-3xl p-5 mb-4 border border-neutral-100"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
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
                <Text className="text-light-100 text-lg font-bold">
                  Financial Breakdown
                </Text>
              </View>

              <View className="space-y-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-light-400 text-sm">Gross Amount</Text>
                  <Text className="text-light-200 font-semibold">
                    ₦{Number(order.financial.grossAmount || 0).toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-light-400 text-sm">
                    Commission ({order.financial.commissionRatePct || 0}%)
                  </Text>
                  <Text className="text-light-300">
                    ₦
                    {Number(
                      order.financial.commissionAmount || 0
                    ).toLocaleString()}
                  </Text>
                </View>
                <View className="pt-3 border-t border-neutral-100/50 flex-row items-center justify-between">
                  <Text className="text-light-200 font-bold">
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
            className="bg-secondary rounded-3xl p-5 mb-4 border border-neutral-100"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
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
              <Text className="text-light-100 text-lg font-bold">Pricing</Text>
            </View>

            <View className="space-y-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-light-400 text-sm">Original Price</Text>
                <Text className="text-light-300 text-sm">
                  ₦
                  {Number(
                    order.originalPrice || order.price || 0
                  ).toLocaleString()}
                </Text>
              </View>
              {order.priceNegotiation?.status === "accepted" &&
                order.price !== order.originalPrice && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-light-400 text-sm">
                      Negotiated Price
                    </Text>
                    <Text className="text-accent font-bold">
                      ₦{Number(order.price || 0).toLocaleString()}
                    </Text>
                  </View>
                )}
              <View className="pt-3 border-t border-neutral-100/50 flex-row items-center justify-between">
                <Text className="text-light-200 font-bold text-base">
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
                <View className="mt-4 p-3 bg-dark-100 rounded-xl">
                  <Text className="text-light-200 text-sm mb-2">
                    Rider requested: ₦
                    {Number(order.riderRequestedPrice || 0).toLocaleString()}
                  </Text>
                  {order.priceNegotiation?.reason && (
                    <Text className="text-light-400 text-xs mb-3">
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
            {order.status !== "cancelled" &&
              order.status !== "delivered" &&
              !["picked_up", "delivering"].includes(order.status) &&
              (user?.role === "customer" ||
                user?.role === "rider" ||
                user?.role === "admin") &&
              (user?.role === "customer"
                ? String(order.customerId) === String(user.id)
                : user?.role === "rider"
                ? String(order.riderId) === String(user.id)
                : true) && (
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
              <View className="bg-secondary border border-neutral-100 rounded-2xl p-5 mb-4">
                <Text className="text-light-100 text-lg font-semibold mb-4">
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
                  <View className="bg-dark-100 rounded-xl p-4 mb-3">
                    <Text className="text-light-300 text-sm mb-2">
                      Delivery OTP Code
                    </Text>
                    <Text className="text-accent text-2xl font-bold text-center mb-2">
                      {order.delivery.otpCode}
                    </Text>
                    <Text className="text-light-400 text-xs text-center">
                      Share this code with the customer
                    </Text>
                    {order.delivery.otpExpiresAt && (
                      <Text className="text-light-400 text-xs text-center mt-1">
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
            className="bg-secondary rounded-3xl p-5 mb-4 border border-neutral-100"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
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
              <Text className="text-light-100 text-lg font-bold">
                Order Timeline
              </Text>
            </View>

            {timeline.length === 0 ? (
              <View className="bg-dark-100 rounded-2xl p-6 items-center">
                <Icons.time
                  name={IconNames.timeOutline as any}
                  size={32}
                  color="#9CA4AB"
                />
                <Text className="text-light-400 text-sm mt-2">
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
                        <Text className="text-light-400 text-xs mb-1">
                          {formatDate(t.at)}
                        </Text>
                        {t.note && (
                          <View className="bg-dark-100 rounded-lg p-2 mt-1">
                            <Text className="text-light-300 text-xs">
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
            <View className="bg-secondary border border-neutral-100 rounded-2xl p-5 mb-4">
              <Text className="text-light-100 text-lg font-semibold mb-3">
                Delivery Proof
              </Text>
              {delivery.photoUrl ? (
                <Image
                  source={{ uri: delivery.photoUrl }}
                  style={{ width: "100%", height: 200, borderRadius: 12 }}
                  resizeMode="cover"
                />
              ) : (
                <View className="bg-dark-100 rounded-xl p-8 items-center">
                  <Text className="text-light-400 text-center">
                    No photo uploaded
                  </Text>
                </View>
              )}
              <View className="mt-4 space-y-3">
                {delivery.recipientName && (
                  <View>
                    <Text className="text-light-300 text-sm mb-1">
                      Recipient Name
                    </Text>
                    <Text className="text-light-100 font-semibold">
                      {delivery.recipientName}
                    </Text>
                  </View>
                )}
                {delivery.recipientPhone && (
                  <View>
                    <Text className="text-light-300 text-sm mb-1">
                      Recipient Phone
                    </Text>
                    <Text className="text-light-100">
                      {delivery.recipientPhone}
                    </Text>
                  </View>
                )}
                {delivery.note && (
                  <View>
                    <Text className="text-light-300 text-sm mb-1">Note</Text>
                    <Text className="text-light-100">{delivery.note}</Text>
                  </View>
                )}
                {delivery.deliveredAt && (
                  <View>
                    <Text className="text-light-300 text-sm mb-1">
                      Delivered At
                    </Text>
                    <Text className="text-light-100">
                      {new Date(delivery.deliveredAt).toLocaleString()}
                    </Text>
                  </View>
                )}
                {delivery.otpVerifiedAt && (
                  <View>
                    <Text className="text-light-300 text-sm mb-1">
                      OTP Verified At
                    </Text>
                    <Text className="text-light-100">
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
              <View className="bg-secondary border border-neutral-100 rounded-2xl p-5 mb-4">
                <Text className="text-light-100 text-lg font-semibold mb-3">
                  Rider Location
                </Text>
                <View className="mb-3">
                  <Text className="text-light-300 text-sm mb-1">Status</Text>
                  <View className="flex-row items-center gap-2">
                    <View
                      className={`w-3 h-3 rounded-full ${
                        order.riderLocation.online
                          ? "bg-green-500"
                          : "bg-gray-500"
                      }`}
                    />
                    <Text className="text-light-100">
                      {order.riderLocation.online
                        ? "Online"
                        : "Last seen: " +
                          new Date(
                            order.riderLocation.lastSeen
                          ).toLocaleTimeString()}
                    </Text>
                  </View>
                  {realTimeLocation && (
                    <Text className="text-light-400 text-xs mt-1">
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
                    const url = `https://www.google.com/maps?q=${location?.lat},${location?.lng}`;
                    Linking.openURL(url).catch((err: any) =>
                      console.error("Failed to open maps", err)
                    );
                  }}
                  className="bg-accent rounded-xl px-4 py-3 mt-2"
                >
                  <Text className="text-primary font-bold text-center">
                    View on Google Maps
                  </Text>
                </TouchableOpacity>
                <Text className="text-light-400 text-xs mt-2 text-center">
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
              <View className="bg-secondary border border-neutral-100 rounded-2xl p-5 mb-4">
                <Text className="text-light-100 text-lg font-semibold mb-3">
                  Delivery Route History
                </Text>
                {loadingHistory ? (
                  <ActivityIndicator size="small" color="#AB8BFF" />
                ) : (
                  <>
                    <Text className="text-light-400 text-sm mb-3">
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
                                const url = `https://www.google.com/maps?q=${entry.lat},${entry.lng}`;
                                Linking.openURL(url).catch((err: any) =>
                                  console.error("Failed to open maps", err)
                                );
                              }}
                              className="bg-dark-100 border border-neutral-100 rounded-lg px-3 py-2"
                            >
                              <Text className="text-light-300 text-xs">
                                {new Date(entry.timestamp).toLocaleTimeString()}
                              </Text>
                              {entry.speed && (
                                <Text className="text-light-400 text-xs">
                                  {Math.round(entry.speed)} km/h
                                </Text>
                              )}
                            </TouchableOpacity>
                          ))}
                      </View>
                    </ScrollView>
                    <Text className="text-light-400 text-xs text-center">
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
            <View className="bg-secondary rounded-t-3xl p-6 pb-10">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-light-100 text-xl font-bold">
                  Request Price Change
                </Text>
                <TouchableOpacity onPress={() => setShowPriceModal(false)}>
                  <Text className="text-light-400 text-lg">✕</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-light-300 text-sm mb-2">
                Original Price: ₦
                {Number(
                  order?.originalPrice || order?.price || 0
                ).toLocaleString()}
              </Text>

              <View className="mb-4">
                <Text className="text-light-300 mb-2">
                  Requested Price (NGN)
                </Text>
                <TextInput
                  value={requestedPrice}
                  onChangeText={setRequestedPrice}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  placeholderTextColor="#9CA4AB"
                  className="text-light-100 bg-dark-100 rounded-xl px-4 py-3"
                />
              </View>

              <View className="mb-6">
                <Text className="text-light-300 mb-2">Reason (Optional)</Text>
                <TextInput
                  value={priceReason}
                  onChangeText={setPriceReason}
                  placeholder="e.g., Heavy traffic, Long distance"
                  placeholderTextColor="#9CA4AB"
                  multiline
                  numberOfLines={3}
                  className="text-light-100 bg-dark-100 rounded-xl px-4 py-3"
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
            <View className="bg-secondary rounded-t-3xl p-6 pb-10">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-light-100 text-xl font-bold">
                  Verify Delivery OTP
                </Text>
                <TouchableOpacity onPress={() => setShowOtpModal(false)}>
                  <Text className="text-light-400 text-lg">✕</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-light-300 text-sm mb-4">
                Enter the 4-digit OTP code provided by the recipient
              </Text>

              <View className="mb-6">
                <Text className="text-light-300 mb-2">OTP Code</Text>
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
                  className="text-light-100 bg-dark-100 rounded-xl px-4 py-4 text-center text-2xl font-bold tracking-widest"
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
            <ScrollView className="bg-secondary rounded-t-3xl">
              <View className="p-6 pb-10">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-light-100 text-xl font-bold">
                    Upload Delivery Proof
                  </Text>
                  <TouchableOpacity onPress={() => setShowProofModal(false)}>
                    <Text className="text-light-400 text-lg">✕</Text>
                  </TouchableOpacity>
                </View>

                <Text className="text-light-300 text-sm mb-4">
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
