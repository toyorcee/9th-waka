import AddressAutocomplete from "@/components/AddressAutocomplete";
import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/apiClient";
import { AddressSuggestion } from "@/services/geocodingApi";
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
  const [pickupCoords, setPickupCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
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
            pickup: {
              address: pickupAddress,
              lat: pickupCoords?.lat,
              lng: pickupCoords?.lng,
            },
            dropoff: {
              address: dropoffAddress,
              lat: dropoffCoords?.lat,
              lng: dropoffCoords?.lng,
            },
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
  }, [pickupAddress, dropoffAddress, pickupCoords, dropoffCoords]);

  const createOrder = async () => {
    if (!canSubmit) {
      Toast.show({ type: "error", text1: "Fill all fields" });
      return;
    }
    setSubmitting(true);
    try {
      const resp = await apiClient.post("/orders", {
        pickup: {
          address: pickupAddress,
          lat: pickupCoords?.lat,
          lng: pickupCoords?.lng,
        },
        dropoff: {
          address: dropoffAddress,
          lat: dropoffCoords?.lat,
          lng: dropoffCoords?.lng,
        },
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
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View>
        {/* Enhanced Header with Back Button */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(Routes.tabs.home);
              }
            }}
            className="w-11 h-11 rounded-full bg-secondary border border-neutral-100 items-center justify-center"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Icons.navigation
              name={IconNames.arrowBack as any}
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <View className="flex-row items-center">
              <View className="bg-accent/20 rounded-lg p-1.5 mr-2">
                <Icons.action
                  name={IconNames.addCircle as any}
                  size={18}
                  color="#AB8BFF"
                />
              </View>
              <Text className="text-light-100 text-2xl font-bold">
                New Delivery
              </Text>
            </View>
          </View>
          <View className="w-11" />
        </View>

        {/* Use Default Address Checkbox */}
        {user?.defaultAddress ? (
          <View
            className="rounded-3xl mb-6 border-2"
            style={{
              padding: 24,
              backgroundColor: useDefaultAddress
                ? "rgba(171, 139, 255, 0.15)"
                : "rgba(171, 139, 255, 0.08)",
              borderColor: useDefaultAddress
                ? "rgba(171, 139, 255, 0.4)"
                : "rgba(171, 139, 255, 0.2)",
              shadowColor: "#AB8BFF",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: useDefaultAddress ? 0.25 : 0.15,
              shadowRadius: 12,
              elevation: useDefaultAddress ? 6 : 4,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-3">
                  <View
                    className="rounded-lg p-1.5 mr-2"
                    style={{
                      backgroundColor: useDefaultAddress
                        ? "rgba(171, 139, 255, 0.3)"
                        : "rgba(171, 139, 255, 0.2)",
                    }}
                  >
                    <Icons.status
                      name={IconNames.checkmarkCircle as any}
                      size={18}
                      color="#AB8BFF"
                    />
                  </View>
                  <Text className="text-light-100 font-bold text-base">
                    Use my saved address
                  </Text>
                </View>
                <Text className="text-light-300 text-sm ml-10 mb-3">
                  Auto-fill pickup address from your profile
                </Text>
                <View
                  className="rounded-xl px-4 py-3 ml-10"
                  style={{
                    backgroundColor: useDefaultAddress
                      ? "rgba(3, 0, 20, 0.4)"
                      : "rgba(3, 0, 20, 0.3)",
                    borderWidth: 1,
                    borderColor: useDefaultAddress
                      ? "rgba(171, 139, 255, 0.3)"
                      : "rgba(171, 139, 255, 0.15)",
                  }}
                >
                  <View className="flex-row items-start">
                    <Icons.location
                      name={IconNames.locationOutline as any}
                      size={14}
                      color="#AB8BFF"
                      style={{ marginRight: 8, marginTop: 2 }}
                    />
                    <Text className="text-light-200 text-xs flex-1">
                      {user.defaultAddress.length > 50
                        ? `${user.defaultAddress.substring(0, 50)}...`
                        : user.defaultAddress}
                    </Text>
                  </View>
                </View>
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
          <View
            className="bg-secondary/50 border border-neutral-100 rounded-3xl p-5 mb-6"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View className="flex-row items-start">
              <View className="bg-info/20 rounded-lg p-1.5 mr-3">
                <Icons.info
                  name={IconNames.informationOutline as any}
                  size={18}
                  color="#5AC8FA"
                />
              </View>
              <View className="flex-1">
                <Text className="text-light-100 font-bold text-base mb-1">
                  Save time on future orders
                </Text>
                <Text className="text-light-400 text-xs mb-3">
                  Add your default address in your profile to quickly fill it
                  here with one tap
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/profile/edit" as any)}
                  className="bg-accent/20 border border-accent/30 rounded-xl py-2.5 px-4 self-start"
                  style={{
                    shadowColor: "#AB8BFF",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text className="text-accent font-bold text-xs">
                    Add Address to Profile
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Pickup Address */}
        <View
          className="bg-secondary border border-neutral-100 rounded-3xl p-5 mb-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center mb-3">
            <View className="bg-info/20 rounded-lg p-1.5 mr-2">
              <Icons.location
                name={IconNames.locationOutline as any}
                size={16}
                color="#5AC8FA"
              />
            </View>
            <Text className="text-light-100 font-bold text-base">
              Pickup address
            </Text>
          </View>
          {useDefaultAddress ? (
            <TextInput
              value={pickupAddress}
              onChangeText={setPickupAddress}
              placeholder="Lekki Phase 1, Lagos"
              placeholderTextColor="#9CA4AB"
              editable={false}
              className="text-light-100 bg-dark-100 rounded-xl px-4 py-3.5 border border-neutral-100 opacity-60"
            />
          ) : (
            <AddressAutocomplete
              value={pickupAddress}
              onChangeText={setPickupAddress}
              onSelect={(suggestion: AddressSuggestion) => {
                setPickupCoords({ lat: suggestion.lat, lng: suggestion.lng });
              }}
              placeholder="Lekki Phase 1, Lagos"
              editable={true}
            />
          )}
          {!user?.defaultAddress && (
            <View className="flex-row items-center mt-2">
              <Icons.info
                name={IconNames.informationOutline as any}
                size={12}
                color="#9CA4AB"
                style={{ marginRight: 6 }}
              />
              <Text className="text-light-400 text-xs">
                Tip: Save your address in your profile to quickly fill it here
              </Text>
            </View>
          )}
        </View>

        {/* Dropoff Address */}
        <View
          className="bg-secondary border border-neutral-100 rounded-3xl p-5 mb-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center mb-3">
            <View className="bg-accentWarm/20 rounded-lg p-1.5 mr-2">
              <Icons.location
                name={IconNames.locationOutline as any}
                size={16}
                color="#FF9500"
              />
            </View>
            <Text className="text-light-100 font-bold text-base">
              Dropoff address
            </Text>
          </View>
          <AddressAutocomplete
            value={dropoffAddress}
            onChangeText={setDropoffAddress}
            onSelect={(suggestion: AddressSuggestion) => {
              setDropoffCoords({ lat: suggestion.lat, lng: suggestion.lng });
            }}
            placeholder="Yaba, University of Lagos"
            editable={true}
          />
        </View>

        {/* Items */}
        <View
          className="bg-secondary border border-neutral-100 rounded-3xl p-5 mb-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center mb-3">
            <View className="bg-accent/20 rounded-lg p-1.5 mr-2">
              <Icons.package
                name={IconNames.packageOutline as any}
                size={16}
                color="#AB8BFF"
              />
            </View>
            <Text className="text-light-100 font-bold text-base">Items</Text>
          </View>
          <TextInput
            value={items}
            onChangeText={setItems}
            placeholder="Laptop + charger"
            placeholderTextColor="#9CA4AB"
            className="text-light-100 bg-dark-100 rounded-xl px-4 py-3.5 border border-neutral-100"
          />
        </View>

        {/* Vehicle Type Selection */}
        {estimatedPrice && (
          <View
            className="bg-secondary border border-neutral-100 rounded-3xl p-5 mb-4"
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
                <Icons.delivery
                  name={IconNames.carOutline as any}
                  size={16}
                  color="#AB8BFF"
                />
              </View>
              <Text className="text-light-100 font-bold text-base">
                Choose Vehicle Type
              </Text>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setPreferredVehicleType("motorcycle")}
                className={`flex-1 rounded-2xl p-4 border-2 ${
                  preferredVehicleType === "motorcycle"
                    ? "border-accent bg-accent/20"
                    : "border-neutral-100 bg-dark-100"
                }`}
                style={{
                  shadowColor:
                    preferredVehicleType === "motorcycle" ? "#AB8BFF" : "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity:
                    preferredVehicleType === "motorcycle" ? 0.2 : 0.05,
                  shadowRadius: 4,
                  elevation: preferredVehicleType === "motorcycle" ? 4 : 2,
                }}
              >
                <View className="items-center mb-2">
                  <Icons.motorcycle
                    name={IconNames.motorcycle as any}
                    size={32}
                    color={
                      preferredVehicleType === "motorcycle"
                        ? "#AB8BFF"
                        : "#9CA4AB"
                    }
                  />
                </View>
                <Text
                  className={`text-center font-bold text-base mb-2 ${
                    preferredVehicleType === "motorcycle"
                      ? "text-accent"
                      : "text-light-300"
                  }`}
                >
                  Motorcycle
                </Text>
                <Text
                  className={`text-center font-bold text-lg ${
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
                className={`flex-1 rounded-2xl p-4 border-2 ${
                  preferredVehicleType === "car"
                    ? "border-accent bg-accent/20"
                    : "border-neutral-100 bg-dark-100"
                }`}
                style={{
                  shadowColor:
                    preferredVehicleType === "car" ? "#AB8BFF" : "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: preferredVehicleType === "car" ? 0.2 : 0.05,
                  shadowRadius: 4,
                  elevation: preferredVehicleType === "car" ? 4 : 2,
                }}
              >
                <View className="items-center mb-2">
                  <Icons.delivery
                    name={IconNames.carOutline as any}
                    size={32}
                    color={
                      preferredVehicleType === "car" ? "#AB8BFF" : "#9CA4AB"
                    }
                  />
                </View>
                <Text
                  className={`text-center font-bold text-base mb-2 ${
                    preferredVehicleType === "car"
                      ? "text-accent"
                      : "text-light-300"
                  }`}
                >
                  Car/Van
                </Text>
                <Text
                  className={`text-center font-bold text-lg ${
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

        {/* Estimated Price */}
        <View
          className="bg-secondary border border-neutral-100 rounded-3xl p-5 mb-6"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center mb-4">
            <View className="bg-success/20 rounded-lg p-1.5 mr-2">
              <Icons.money
                name={IconNames.cash as any}
                size={16}
                color="#30D158"
              />
            </View>
            <Text className="text-light-100 font-bold text-base">
              Estimated Price
            </Text>
          </View>
          {estimating ? (
            <View className="bg-dark-100 rounded-xl px-4 py-4 items-center border border-neutral-100">
              <ActivityIndicator size="small" color="#AB8BFF" />
              <Text className="text-light-400 text-xs mt-2">
                Calculating...
              </Text>
            </View>
          ) : estimatedPrice ? (
            <>
              <View className="bg-dark-100 rounded-xl px-4 py-4 mb-3 border border-neutral-100">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Icons.motorcycle
                      name={IconNames.motorcycle as any}
                      size={16}
                      color="#9CA4AB"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-light-300 text-sm font-semibold">
                      Motorcycle
                    </Text>
                  </View>
                  <Text className="text-light-100 text-lg font-bold">
                    ₦
                    {bikePrice?.toLocaleString() ||
                      estimatedPrice.toLocaleString()}
                  </Text>
                </View>
                <View className="h-px bg-neutral-100 mb-3" />
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Icons.delivery
                      name={IconNames.carOutline as any}
                      size={16}
                      color="#9CA4AB"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-light-300 text-sm font-semibold">
                      Car/Van
                    </Text>
                  </View>
                  <Text className="text-light-100 text-lg font-bold">
                    ₦
                    {carPrice?.toLocaleString() ||
                      Math.round(estimatedPrice * 1.25).toLocaleString()}
                  </Text>
                </View>
              </View>
              {distanceKm && (
                <View className="bg-info/10 rounded-xl px-3 py-2 mb-2 border border-info/20">
                  <View className="flex-row items-center justify-center">
                    <Icons.map
                      name={IconNames.mapOutline as any}
                      size={12}
                      color="#5AC8FA"
                      style={{ marginRight: 6 }}
                    />
                    <Text className="text-info text-xs text-center">
                      Distance: {distanceKm} km • Tiered pricing applied
                    </Text>
                  </View>
                </View>
              )}
              <View className="flex-row items-center justify-center">
                <Icons.status
                  name={IconNames.checkmarkCircle as any}
                  size={12}
                  color="#9CA4AB"
                  style={{ marginRight: 4 }}
                />
                <Text className="text-light-400 text-xs text-center">
                  Competitive rates • Fast delivery • Secure handling
                </Text>
              </View>
            </>
          ) : (
            <View className="bg-dark-100 rounded-xl px-4 py-4 border border-neutral-100">
              <View className="flex-row items-center justify-center">
                <Icons.info
                  name={IconNames.informationOutline as any}
                  size={14}
                  color="#9CA4AB"
                  style={{ marginRight: 6 }}
                />
                <Text className="text-light-400 text-sm text-center">
                  Enter addresses to see estimated price
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Create Order Button */}
        <TouchableOpacity
          disabled={!canSubmit || submitting}
          onPress={createOrder}
          className={`rounded-2xl items-center justify-center h-14 flex-row ${
            canSubmit && !submitting
              ? "bg-accent"
              : "bg-dark-100 border border-neutral-100"
          }`}
          style={{
            shadowColor: canSubmit && !submitting ? "#AB8BFF" : "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: canSubmit && !submitting ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: canSubmit && !submitting ? 6 : 2,
          }}
        >
          {submitting ? (
            <>
              <ActivityIndicator color="#030014" size="small" />
              <Text className="text-primary font-bold ml-2">Creating...</Text>
            </>
          ) : (
            <>
              <Icons.action
                name={IconNames.addCircle as any}
                size={20}
                color={canSubmit ? "#030014" : "#9CA4AB"}
                style={{ marginRight: 8 }}
              />
              <Text
                className={`font-bold text-base ${
                  canSubmit ? "text-primary" : "text-light-400"
                }`}
              >
                Create Order
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
