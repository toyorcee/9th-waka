import { SocketEvents } from "@/constants/socketEvents";
import { useAuth } from "@/contexts/AuthContext";
import {
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
import Toast from "react-native-toast-message";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
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

    // Listen for WebSocket events
    socket.on(SocketEvents.RIDER_LOCATION_UPDATED, handleLocationUpdate);

    // Also listen for custom events (for web compatibility)
    const handleCustomEvent = (event: any) => {
      if (event.detail?.orderId === id) {
        handleLocationUpdate(event.detail);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("rider-location-updated", handleCustomEvent);
    }

    return () => {
      socket.off(SocketEvents.RIDER_LOCATION_UPDATED, handleLocationUpdate);
      if (typeof window !== "undefined") {
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

  return (
    <ScrollView className="flex-1 bg-primary">
      <View className="pt-20 px-6 pb-10">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-light-100 text-2xl font-bold">
            Order #{String(order._id || order.id).slice(-6)}
          </Text>
          <TouchableOpacity
            onPress={load}
            className="bg-secondary border border-neutral-100 rounded-xl px-3 py-2"
          >
            <Text className="text-light-200">Refresh</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-secondary border border-neutral-100 rounded-2xl p-5 mb-4">
          <Text className="text-light-300 text-sm mb-1">Pickup</Text>
          <Text className="text-light-100">{order.pickup?.address}</Text>
          <Text className="text-light-300 text-sm mt-3 mb-1">Dropoff</Text>
          <Text className="text-light-100">{order.dropoff?.address}</Text>
          <Text className="text-light-300 text-sm mt-3 mb-1">Items</Text>
          <Text className="text-light-100">{order.items}</Text>

          {/* Price Section */}
          <View className="mt-4 pt-4 border-t border-neutral-100">
            <Text className="text-light-300 text-sm mb-2">Pricing</Text>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-light-400 text-xs">Original Price</Text>
              <Text className="text-light-300 text-sm">
                ₦
                {Number(
                  order.originalPrice || order.price || 0
                ).toLocaleString()}
              </Text>
            </View>
            {order.priceNegotiation?.status === "accepted" &&
              order.price !== order.originalPrice && (
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-light-400 text-xs">
                    Negotiated Price
                  </Text>
                  <Text className="text-accent font-bold">
                    ₦{Number(order.price || 0).toLocaleString()}
                  </Text>
                </View>
              )}
            <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-neutral-100">
              <Text className="text-light-200 font-semibold">Final Price</Text>
              <Text className="text-light-100 text-lg font-bold">
                ₦{Number(order.price || 0).toLocaleString()}
              </Text>
            </View>

            {/* Price Negotiation UI */}
            {user?.role === "rider" &&
              String(order.riderId) === String(user.id) &&
              ["assigned", "picked_up", "delivering"].includes(order.status) &&
              order.priceNegotiation?.status !== "requested" &&
              order.priceNegotiation?.status !== "accepted" && (
                <TouchableOpacity
                  onPress={() => setShowPriceModal(true)}
                  className="bg-accent rounded-xl px-4 py-3 mt-3"
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
          </View>

          <Text className="text-light-300 text-sm mt-4 mb-1">Status</Text>
          <Text className="text-light-100 capitalize">
            {String(order.status).replace("_", " ")}
          </Text>
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

              {/* Generate OTP Button - When assigned, picked_up, or delivering */}
              {["assigned", "picked_up", "delivering"].includes(order.status) &&
                !order.delivery?.otpCode && (
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

        <View className="bg-secondary border border-neutral-100 rounded-2xl p-5 mb-4">
          <Text className="text-light-100 text-lg font-semibold mb-3">
            Timeline
          </Text>
          {timeline.length === 0 ? (
            <Text className="text-light-400">No timeline yet</Text>
          ) : (
            timeline.map((t: any, idx: number) => (
              <View key={idx} className="mb-3">
                <Text className="text-light-200 capitalize">
                  {String(t.status).replace("_", " ")}
                </Text>
                <Text className="text-light-400 text-xs">
                  {new Date(t.at).toLocaleString()}
                </Text>
                {t.note ? (
                  <Text className="text-light-300 text-xs mt-1">{t.note}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>

        <View className="bg-secondary border border-neutral-100 rounded-2xl p-5 mb-4">
          <Text className="text-light-100 text-lg font-semibold mb-3">
            Delivery Proof
          </Text>
          {delivery.photoUrl ? (
            <Image
              source={{ uri: delivery.photoUrl }}
              style={{ width: "100%", height: 200, borderRadius: 12 }}
            />
          ) : (
            <Text className="text-light-400">No photo uploaded</Text>
          )}
          <View className="mt-3">
            <Text className="text-light-300 text-sm">Recipient</Text>
            <Text className="text-light-100">
              {delivery.recipientName || "—"}
            </Text>
          </View>
        </View>

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
                    {new Date(realTimeLocation.timestamp).toLocaleTimeString()}
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
              <Text className="text-light-300 mb-2">Requested Price (NGN)</Text>
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
                Upload a photo and recipient details to complete delivery proof
              </Text>

              {/* Photo Upload */}
              <View className="mb-4">
                <Text className="text-light-300 mb-2">Delivery Photo</Text>
                {proofPhoto ? (
                  <View>
                    <Image
                      source={{ uri: proofPhoto }}
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
    </ScrollView>
  );
}
