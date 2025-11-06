import { useAuth } from "@/contexts/AuthContext";
import {
  getOrder,
  requestPriceChange,
  respondToPriceRequest,
} from "@/services/orderApi";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

  useEffect(() => {
    load();
  }, [id]);

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

        <View className="bg-secondary border border-neutral-100 rounded-2xl p-5">
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
    </ScrollView>
  );
}
