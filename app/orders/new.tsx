import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/apiClient";
import { Routes } from "@/services/navigationHelper";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function NewOrderScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [items, setItems] = useState("");
  const [useDefaultAddress, setUseDefaultAddress] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [bikePrice, setBikePrice] = useState<number | null>(null);
  const [carPrice, setCarPrice] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [preferredVehicleType, setPreferredVehicleType] = useState<
    "motorcycle" | "car" | null
  >(null);
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-fill pickup address when checkbox is checked
  React.useEffect(() => {
    if (useDefaultAddress && user?.defaultAddress) {
      setPickupAddress(user.defaultAddress);
    } else if (!useDefaultAddress && pickupAddress === user?.defaultAddress) {
      setPickupAddress("");
    }
  }, [useDefaultAddress, user?.defaultAddress]);

  const canSubmit =
    pickupAddress.trim().length > 3 &&
    dropoffAddress.trim().length > 3 &&
    items.trim().length > 0 &&
    preferredVehicleType !== null;

  React.useEffect(() => {
    const estimate = async () => {
      if (pickupAddress.trim().length > 3 && dropoffAddress.trim().length > 3) {
        setEstimating(true);
        try {
          const resp = await apiClient.post("/orders/estimate", {
            pickup: { address: pickupAddress },
            dropoff: { address: dropoffAddress },
          });
          setEstimatedPrice(resp.data?.estimatedPrice || null);
          setBikePrice(resp.data?.bikePrice || null);
          setCarPrice(resp.data?.carPrice || null);
          setDistanceKm(resp.data?.distanceKm || null);
        } catch (e) {
          // Silently fail - price will be calculated on server
          setEstimatedPrice(null);
          setBikePrice(null);
          setCarPrice(null);
          setDistanceKm(null);
        } finally {
          setEstimating(false);
        }
      } else {
        setEstimatedPrice(null);
        setBikePrice(null);
        setCarPrice(null);
        setDistanceKm(null);
      }
    };

    const timeoutId = setTimeout(estimate, 1000); // Debounce 1 second
    return () => clearTimeout(timeoutId);
  }, [pickupAddress, dropoffAddress]);

  const createOrder = async () => {
    if (!canSubmit) {
      Toast.show({ type: "error", text1: "Fill all fields" });
      return;
    }
    setSubmitting(true);
    try {
      const resp = await apiClient.post("/orders", {
        pickup: { address: pickupAddress },
        dropoff: { address: dropoffAddress },
        items,
        preferredVehicleType,
        // Price will be auto-calculated on server based on vehicle type
      });
      const orderId = resp.data?.order?._id || resp.data?.order?.id;
      Toast.show({ type: "success", text1: "Order created" });
      if (orderId) {
        router.replace({
          pathname: "/orders/[id]",
          params: { id: String(orderId) },
        });
      } else {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(tabs)/orders");
        }
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.error || e?.message || "Failed to create order";
      Toast.show({ type: "error", text1: "Error", text2: String(msg) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-primary"
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <View className="pt-4 px-6 pb-10">
        {/* Header with Back Button */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(Routes.tabs.home);
              }
            }}
            className="w-10 h-10 rounded-full bg-dark-200 items-center justify-center"
          >
            <Icons.navigation
              name={IconNames.arrowBack as any}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text className="text-light-100 text-3xl font-bold flex-1 text-center -ml-10">
            New Delivery
          </Text>
          <View className="w-10" />
        </View>

        {/* Use Default Address Checkbox */}
        {user?.defaultAddress ? (
          <View className="bg-accent/10 border-2 border-accent/30 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-1">
                  <Text className="text-accent font-bold text-base mr-2">
                    ✓
                  </Text>
                  <Text className="text-light-100 font-bold text-base">
                    Use my saved address
                  </Text>
                </View>
                <Text className="text-light-300 text-sm ml-6">
                  Auto-fill pickup address from your profile
                </Text>
                <Text className="text-light-400 text-xs mt-1 ml-6 italic">
                  {user.defaultAddress.length > 50
                    ? `${user.defaultAddress.substring(0, 50)}...`
                    : user.defaultAddress}
                </Text>
              </View>
              <Switch
                value={useDefaultAddress}
                onValueChange={setUseDefaultAddress}
                trackColor={{ false: "#3A3A3A", true: "#AB8BFF" }}
                thumbColor={useDefaultAddress ? "#030014" : "#9CA4AB"}
              />
            </View>
          </View>
        ) : (
          <View className="bg-secondary/50 border border-neutral-100 rounded-2xl p-4 mb-4">
            <View className="flex-row items-start">
              <Text className="text-light-400 text-lg mr-2">💡</Text>
              <View className="flex-1">
                <Text className="text-light-200 font-semibold mb-1">
                  Save time on future orders
                </Text>
                <Text className="text-light-400 text-xs mb-2">
                  Add your default address in your profile to quickly fill it
                  here with one tap
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/profile/edit" as any)}
                  className="bg-accent/20 border border-accent rounded-xl py-2 px-3 self-start"
                >
                  <Text className="text-accent font-semibold text-xs">
                    Add Address to Profile
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View className="bg-secondary border border-neutral-100 rounded-2xl p-5 mb-4">
          <Text className="text-light-300 mb-2">Pickup address</Text>
          <TextInput
            value={pickupAddress}
            onChangeText={setPickupAddress}
            placeholder="Lekki Phase 1, Lagos"
            placeholderTextColor="#9CA4AB"
            editable={!useDefaultAddress}
            className={`text-light-100 bg-dark-100 rounded-xl px-4 py-3 ${
              useDefaultAddress ? "opacity-60" : ""
            }`}
          />
          {!user?.defaultAddress && (
            <Text className="text-light-400 text-xs mt-1">
              💡 Tip: Save your address in your profile to quickly fill it here
            </Text>
          )}
        </View>

        <View className="bg-secondary border border-neutral-100 rounded-2xl p-5 mb-4">
          <Text className="text-light-300 mb-2">Dropoff address</Text>
          <TextInput
            value={dropoffAddress}
            onChangeText={setDropoffAddress}
            placeholder="Yaba, University of Lagos"
            placeholderTextColor="#9CA4AB"
            className="text-light-100 bg-dark-100 rounded-xl px-4 py-3"
          />
        </View>

        <View className="bg-secondary border border-neutral-100 rounded-2xl p-5 mb-4">
          <Text className="text-light-300 mb-2">Items</Text>
          <TextInput
            value={items}
            onChangeText={setItems}
            placeholder="Laptop + charger"
            placeholderTextColor="#9CA4AB"
            className="text-light-100 bg-dark-100 rounded-xl px-4 py-3"
          />
        </View>

        {/* Vehicle Type Selection */}
        {estimatedPrice && (
          <View className="bg-secondary border border-neutral-100 rounded-2xl p-5 mb-4">
            <Text className="text-light-300 mb-3 font-semibold">
              Choose Vehicle Type
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setPreferredVehicleType("motorcycle")}
                className={`flex-1 rounded-xl p-4 border-2 ${
                  preferredVehicleType === "motorcycle"
                    ? "border-accent bg-accent/20"
                    : "border-neutral-100 bg-dark-100"
                }`}
              >
                <Text
                  className={`text-center font-bold text-lg mb-1 ${
                    preferredVehicleType === "motorcycle"
                      ? "text-accent"
                      : "text-light-300"
                  }`}
                >
                  🏍️ Motorcycle
                </Text>
                <Text
                  className={`text-center font-semibold ${
                    preferredVehicleType === "motorcycle"
                      ? "text-accent"
                      : "text-light-100"
                  }`}
                >
                  ₦
                  {bikePrice?.toLocaleString() ||
                    estimatedPrice.toLocaleString()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPreferredVehicleType("car")}
                className={`flex-1 rounded-xl p-4 border-2 ${
                  preferredVehicleType === "car"
                    ? "border-accent bg-accent/20"
                    : "border-neutral-100 bg-dark-100"
                }`}
              >
                <Text
                  className={`text-center font-bold text-lg mb-1 ${
                    preferredVehicleType === "car"
                      ? "text-accent"
                      : "text-light-300"
                  }`}
                >
                  🚗
                </Text>
                <Text
                  className={`text-center font-bold text-lg mb-1 ${
                    preferredVehicleType === "car"
                      ? "text-accent"
                      : "text-light-300"
                  }`}
                >
                  Car/Van
                </Text>
                <Text
                  className={`text-center font-semibold ${
                    preferredVehicleType === "car"
                      ? "text-accent"
                      : "text-light-100"
                  }`}
                >
                  ₦
                  {carPrice?.toLocaleString() ||
                    Math.round(estimatedPrice * 1.25).toLocaleString()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View className="bg-secondary border border-neutral-100 rounded-2xl p-5 mb-6">
          <Text className="text-light-300 mb-2">Estimated Price</Text>
          {estimating ? (
            <View className="bg-dark-100 rounded-xl px-4 py-3 items-center">
              <ActivityIndicator size="small" color="#9CA4AB" />
              <Text className="text-light-400 text-xs mt-2">
                Calculating...
              </Text>
            </View>
          ) : estimatedPrice ? (
            <>
              <View className="bg-dark-100 rounded-xl px-4 py-3 mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-light-400 text-sm">Motorcycle</Text>
                  <Text className="text-light-100 text-lg font-bold">
                    ₦
                    {bikePrice?.toLocaleString() ||
                      estimatedPrice.toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between pt-2 border-t border-neutral-100">
                  <Text className="text-light-400 text-sm">Car/Van</Text>
                  <Text className="text-light-100 text-lg font-bold">
                    ₦
                    {carPrice?.toLocaleString() ||
                      Math.round(estimatedPrice * 1.25).toLocaleString()}
                  </Text>
                </View>
              </View>
              {distanceKm && (
                <Text className="text-light-400 text-xs text-center">
                  Distance: {distanceKm} km • Tiered pricing applied
                </Text>
              )}
              <Text className="text-light-400 text-xs mt-2 text-center">
                Competitive rates • Fast delivery • Secure handling
              </Text>
            </>
          ) : (
            <View className="bg-dark-100 rounded-xl px-4 py-3">
              <Text className="text-light-400 text-center">
                Enter addresses to see estimated price
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          disabled={!canSubmit || submitting}
          onPress={createOrder}
          className="bg-accent rounded-2xl items-center justify-center h-12"
        >
          {submitting ? (
            <ActivityIndicator color="#030014" />
          ) : (
            <Text className="text-primary font-bold">Create Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
