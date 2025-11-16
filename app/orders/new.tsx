import AddressField from "@/components/AddressField";
import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { apiClient } from "@/services/apiClient";
import { AddressSuggestion, geocodeAddress } from "@/services/geocodingApi";
import { Routes } from "@/services/navigationHelper";
import { PriceEstimateRequest, estimatePrice } from "@/services/orderApi";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const insets = useSafeAreaInsets();

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [items, setItems] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [useDefaultAddress, setUseDefaultAddress] = useState(false);
  const [vehiclePrices, setVehiclePrices] = useState<{
    bicycle: number | null;
    motorbike: number | null;
    tricycle: number | null;
    car: number | null;
    van: number | null;
  }>({
    bicycle: null,
    motorbike: null,
    tricycle: null,
    car: null,
    van: null,
  });
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [preferredVehicleType, setPreferredVehicleType] = useState<
    "bicycle" | "motorbike" | "tricycle" | "car" | "van" | null
  >(null);

  // Backward compatibility
  const bikePrice = vehiclePrices.motorbike;
  const carPrice = vehiclePrices.car;
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gettingPickupLocation, setGettingPickupLocation] = useState(false);
  const [geocodingPickup, setGeocodingPickup] = useState(false);
  const [geocodingDropoff, setGeocodingDropoff] = useState(false);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [dropoffError, setDropoffError] = useState<string | null>(null);

  const lastPickup = useRef("");
  const lastDropoff = useRef("");

  // --------------------------------------------------
  // 🔧 Helper: Valid lat/lng
  const validCoords = (coords: { lat: number; lng: number } | null) =>
    coords && !isNaN(coords.lat) && !isNaN(coords.lng);

  // --------------------------------------------------
  // 🔧 Helper: Geocode Handler (shared between pickup/dropoff)
  const runGeocode = (
    address: string,
    setterCoords: (coords: { lat: number; lng: number } | null) => void,
    setterError: (error: string | null) => void,
    lastAddressRef: React.MutableRefObject<string>,
    setLoading: (loading: boolean) => void
  ) => {
    const trimmed = address.trim();

    if (!trimmed || trimmed.length < 10) {
      if (trimmed.length === 0) {
        setterCoords(null);
        lastAddressRef.current = "";
      }
      return () => {};
    }

    // If user typed a different address, remove coords
    if (trimmed.toLowerCase() !== lastAddressRef.current.toLowerCase()) {
      setterCoords(null);
    }

    // Don't geocode if coords already exist for this address
    if (lastAddressRef.current.toLowerCase() === trimmed.toLowerCase()) {
      return () => {};
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setterError(null);
        const result = await geocodeAddress(trimmed);
        if (result?.lat && result?.lng) {
          setterCoords({ lat: result.lat, lng: result.lng });
          lastAddressRef.current = trimmed;
        } else {
          setterCoords(null);
          setterError(trimmed);
        }
      } catch (err: any) {
        setterCoords(null);
        if (
          err?.response?.status === 404 ||
          err?.response?.data?.success === false
        ) {
          setterError(trimmed);
        } else {
          setterError(null);
        }
      } finally {
        setLoading(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  };

  // --------------------------------------------------
  // 📍 Sync default address
  useEffect(() => {
    if (useDefaultAddress && user?.defaultAddress) {
      setPickupAddress(user.defaultAddress);
      geocodeAddress(user.defaultAddress)
        .then((res) =>
          setPickupCoords(res ? { lat: res.lat, lng: res.lng } : null)
        )
        .catch(() => setPickupCoords(null));
    } else if (!useDefaultAddress && pickupAddress === user?.defaultAddress) {
      setPickupAddress("");
      setPickupCoords(null);
    }
  }, [useDefaultAddress, user?.defaultAddress]);

  // --------------------------------------------------
  // 📍 Auto-geocode pickup
  useEffect(() => {
    if (useDefaultAddress) return;
    return runGeocode(
      pickupAddress,
      setPickupCoords,
      setPickupError,
      lastPickup,
      setGeocodingPickup
    );
  }, [pickupAddress, useDefaultAddress]);

  // --------------------------------------------------
  // 📍 Auto-geocode dropoff
  useEffect(() => {
    return runGeocode(
      dropoffAddress,
      setDropoffCoords,
      setDropoffError,
      lastDropoff,
      setGeocodingDropoff
    );
  }, [dropoffAddress]);

  useEffect(() => {
    const doEstimate = async () => {
      if (!validCoords(pickupCoords) || !validCoords(dropoffCoords)) {
        setEstimatedPrice(null);
        setVehiclePrices({
          bicycle: null,
          motorbike: null,
          tricycle: null,
          car: null,
          van: null,
        });
        setDistanceKm(null);
        return;
      }

      setEstimating(true);
      try {
        const payload: PriceEstimateRequest = {
          pickup: {
            address: pickupAddress,
            lat: pickupCoords!.lat,
            lng: pickupCoords!.lng,
          },
          dropoff: {
            address: dropoffAddress,
            lat: dropoffCoords!.lat,
            lng: dropoffCoords!.lng,
          },
        };
        const res = await estimatePrice(payload);
        setDistanceKm(res?.distanceKm || null);
        setEstimatedPrice(res?.estimatedPrice || null);

        // Update all vehicle prices from response
        if (res?.prices) {
          setVehiclePrices({
            bicycle: res.prices.bicycle || null,
            motorbike: res.prices.motorbike || null,
            tricycle: res.prices.tricycle || null,
            car: res.prices.car || null,
            van: res.prices.van || null,
          });
        } else {
          // Backward compatibility with old API response
          setVehiclePrices({
            bicycle: null,
            motorbike: res?.bikePrice || null,
            tricycle: null,
            car: res?.carPrice || null,
            van: null,
          });
        }
      } catch (err) {
        setEstimatedPrice(null);
        setVehiclePrices({
          bicycle: null,
          motorbike: null,
          tricycle: null,
          car: null,
          van: null,
        });
        setDistanceKm(null);
      } finally {
        setEstimating(false);
      }
    };

    const timer = setTimeout(doEstimate, 900);
    return () => clearTimeout(timer);
  }, [pickupCoords, dropoffCoords, pickupAddress, dropoffAddress]);

  const getAddressSuggestions = async (query: string) => {
    try {
      const response = await apiClient.get(
        `/geocoding/suggestions?q=${encodeURIComponent(query)}&limit=8`
      );
      return response.data?.suggestions || [];
    } catch (error) {
      return [];
    }
  };

  // --------------------------------------------------
  // 📍 Get current device location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status === Location.PermissionStatus.GRANTED) {
        setGettingPickupLocation(true);
        return fetchLocation();
      }

      if (status === Location.PermissionStatus.DENIED) {
        return Alert.alert(
          "Location Permission Required",
          "Location access is currently disabled. To use your current location for pickup, please enable it in your device settings.\n\nYou can choose 'While Using the App' or 'Just Once' - we only use location when you tap the location button.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS !== "web") {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }

      Alert.alert(
        "Use Your Current Location?",
        "9thWaka would like to access your location to quickly set your pickup address.\n\n" +
          "• We only use location when you tap this button\n" +
          "• You can choose 'While Using the App' or 'Just Once'\n" +
          "• You can change this anytime in Settings\n" +
          "• Location is only used to set your pickup address",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Allow",
            onPress: async () => {
              setGettingPickupLocation(true);
              try {
                const { status: reqStatus } =
                  await Location.requestForegroundPermissionsAsync();

                if (reqStatus === Location.PermissionStatus.GRANTED) {
                  await fetchLocation();
                } else {
                  Alert.alert(
                    "Permission Denied",
                    "Location permission was not granted. You can enable it later in your device settings.",
                    [{ text: "OK" }]
                  );
                  setGettingPickupLocation(false);
                }
              } catch (error: any) {
                Toast.show({
                  type: "error",
                  text1: "Error",
                  text2: "Failed to request location permission",
                });
                setGettingPickupLocation(false);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Location Error",
        text2: error?.message || "Failed to get your current location",
      });
    }
  };

  const fetchLocation = async () => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const location = reverseGeocode[0];
        const addressParts = [
          location.street,
          location.streetNumber,
          location.district,
          location.subregion,
          location.region,
        ].filter(Boolean);

        const formattedAddress =
          addressParts.length > 0
            ? addressParts.join(", ")
            : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

        setPickupAddress(formattedAddress);
        setPickupCoords({ lat: latitude, lng: longitude });
        lastPickup.current = formattedAddress;

        Toast.show({
          type: "success",
          text1: "Location set",
          text2: "Your current location has been set as pickup address",
        });
      } else {
        const coordAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setPickupAddress(coordAddress);
        setPickupCoords({ lat: latitude, lng: longitude });
        lastPickup.current = coordAddress;
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Location Error",
        text2: error?.message || "Failed to get your current location",
      });
    } finally {
      setGettingPickupLocation(false);
    }
  };

  // --------------------------------------------------
  // 🟣 Submit order
  const canSubmit =
    pickupAddress.trim().length > 3 &&
    dropoffAddress.trim().length > 3 &&
    items.trim().length > 0 &&
    preferredVehicleType !== null &&
    validCoords(pickupCoords) &&
    validCoords(dropoffCoords);

  const createOrder = async () => {
    if (!canSubmit) {
      return Toast.show({ type: "error", text1: "Please fill all fields" });
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post("/orders", {
        pickup: {
          address: pickupAddress,
          lat: pickupCoords!.lat,
          lng: pickupCoords!.lng,
        },
        dropoff: {
          address: dropoffAddress,
          lat: dropoffCoords!.lat,
          lng: dropoffCoords!.lng,
        },
        items,
        preferredVehicleType,
      });

      const orderId = res.data?.order?._id || res.data?.order?.id;
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
    } catch (err: any) {
      const msg =
        err?.response?.data?.error || err?.message || "Failed to create order";
      Toast.show({ type: "error", text1: "Error", text2: String(msg) });
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <ScrollView
      className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View>
        {/* HEADER */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(Routes.tabs.home);
              }
            }}
            className={`w-11 h-11 rounded-full border items-center justify-center ${
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
            <Icons.navigation
              name={IconNames.arrowBack as any}
              size={22}
              color={isDark ? "#FFFFFF" : "#000000"}
            />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <View className="flex-row items-center">
              <View
                className={`rounded-lg p-1.5 mr-2 ${
                  isDark ? "bg-accent/20" : "bg-blue-900/20"
                }`}
              >
                <Icons.action
                  name={IconNames.addCircle as any}
                  size={18}
                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                />
              </View>
              <Text
                className={`text-2xl font-bold ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                New Delivery
              </Text>
            </View>
          </View>
          <View className="w-11" />
        </View>

        {/* DEFAULT ADDRESS SECTION */}
        {user?.defaultAddress ? (
          <View
            className={`rounded-3xl mb-6 border p-5 ${
              isDark
                ? useDefaultAddress
                  ? "bg-accent/10 border-accent/30"
                  : "bg-secondary border-neutral-100"
                : useDefaultAddress
                ? "bg-blue-900/5 border-blue-800/20"
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
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-3">
                  <View
                    className={`rounded-lg p-1.5 mr-2 ${
                      useDefaultAddress
                        ? isDark
                          ? "bg-accent/20"
                          : "bg-blue-900/20"
                        : isDark
                        ? "bg-accent/10"
                        : "bg-blue-900/5"
                    }`}
                  >
                    <Icons.status
                      name={IconNames.checkmarkCircle as any}
                      size={18}
                      color={
                        useDefaultAddress
                          ? isDark
                            ? "#AB8BFF"
                            : "#1E3A8A"
                          : isDark
                          ? "#AB8BFF"
                          : "#6E6E73"
                      }
                    />
                  </View>
                  <Text
                    className={`font-bold text-base ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    Use my saved address
                  </Text>
                </View>
                <Text
                  className={`text-sm ml-10 mb-3 ${
                    isDark ? "text-light-300" : "text-gray-600"
                  }`}
                >
                  Auto-fill pickup address from your profile
                </Text>
                <View className="flex-row items-start ml-10">
                  <Icons.location
                    name={IconNames.locationOutline as any}
                    size={18}
                    color={
                      useDefaultAddress
                        ? isDark
                          ? "#AB8BFF"
                          : "#1E3A8A"
                        : isDark
                        ? "#9CA4AB"
                        : "#6E6E73"
                    }
                    style={{ marginRight: 10, marginTop: 1 }}
                  />
                  <Text
                    className={`text-sm flex-1 leading-5 ${
                      isDark
                        ? useDefaultAddress
                          ? "text-light-100"
                          : "text-light-300"
                        : useDefaultAddress
                        ? "text-black font-semibold"
                        : "text-gray-700"
                    }`}
                  >
                    {user.defaultAddress.length > 50
                      ? `${user.defaultAddress.substring(0, 50)}...`
                      : user.defaultAddress}
                  </Text>
                </View>
              </View>
              <Switch
                value={useDefaultAddress}
                onValueChange={setUseDefaultAddress}
                trackColor={{
                  false: isDark ? "#3A3A3A" : "#E5E5EA",
                  true: isDark ? "#AB8BFF" : "#1E3A8A",
                }}
                thumbColor={
                  useDefaultAddress
                    ? isDark
                      ? "#030014"
                      : "#FFFFFF"
                    : isDark
                    ? "#9CA4AB"
                    : "#FFFFFF"
                }
              />
            </View>
          </View>
        ) : (
          <View
            className={`border rounded-3xl p-5 mb-6 ${
              isDark
                ? "bg-secondary/50 border-neutral-100"
                : "bg-white border-gray-200"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.05 : 0.03,
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
                <Text
                  className={`font-bold text-base mb-1 ${
                    isDark ? "text-light-100" : "text-black"
                  }`}
                >
                  Save time on future orders
                </Text>
                <Text
                  className={`text-xs mb-3 ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Add your default address in your profile to quickly fill it
                  here with one tap
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/profile/edit" as any)}
                  className={`border rounded-xl py-2.5 px-4 self-start ${
                    isDark
                      ? "bg-accent/20 border-accent/30"
                      : "bg-blue-900/20 border-blue-800/30"
                  }`}
                  style={{
                    shadowColor: isDark ? "#AB8BFF" : "#1E3A8A",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text
                    className={`font-bold text-xs ${
                      isDark ? "text-accent" : "text-blue-900"
                    }`}
                  >
                    Add Address to Profile
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* PICKUP FIELD */}
        <View
          className={`border rounded-3xl p-5 mb-4 ${
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
            zIndex: 10,
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
            <Text
              className={`font-bold text-base ${
                isDark ? "text-light-100" : "text-black"
              }`}
            >
              Pickup address
            </Text>
          </View>
          <View className="flex-row items-center gap-2 mb-2">
            {useDefaultAddress ? (
              <View className="flex-1">
                <TextInput
                  value={pickupAddress}
                  onChangeText={setPickupAddress}
                  placeholder="Lekki Phase 1, Lagos"
                  placeholderTextColor="#9CA4AB"
                  editable={false}
                  className={`rounded-xl px-4 py-3.5 border opacity-60 ${
                    isDark
                      ? "text-light-100 bg-dark-100 border-neutral-100"
                      : "text-black bg-gray-100 border-gray-200"
                  }`}
                />
              </View>
            ) : (
              <View className="flex-1">
                {geocodingPickup ? (
                  <View
                    className={`rounded-xl px-4 py-3.5 border items-center flex-row ${
                      isDark
                        ? "bg-dark-100 border-neutral-100"
                        : "bg-gray-100 border-gray-200"
                    }`}
                  >
                    <ActivityIndicator size="small" color="#5AC8FA" />
                  </View>
                ) : (
                  <AddressField
                    value={pickupAddress}
                    onChange={(text: string) => {
                      setPickupAddress(text);
                      setPickupError(null);
                    }}
                    onSelect={(suggestion: AddressSuggestion) => {
                      const selectedAddress =
                        suggestion.displayAddress || suggestion.address;
                      setPickupAddress(selectedAddress);
                      setPickupCoords({
                        lat: suggestion.lat,
                        lng: suggestion.lng,
                      });
                      lastPickup.current = selectedAddress;
                      setPickupError(null);
                    }}
                    placeholder="Lekki Phase 1, Lagos"
                    editable={true}
                    fetchSuggestions={getAddressSuggestions}
                  />
                )}
              </View>
            )}
            <TouchableOpacity
              onPress={getCurrentLocation}
              disabled={gettingPickupLocation || useDefaultAddress}
              className={`rounded-xl px-4 py-3.5 border items-center justify-center ${
                useDefaultAddress
                  ? isDark
                    ? "bg-dark-100 border-neutral-100 opacity-50"
                    : "bg-gray-100 border-gray-200 opacity-50"
                  : isDark
                  ? "bg-info/20 border-info/30"
                  : "bg-info/10 border-info/20"
              }`}
              style={{ minWidth: 50 }}
            >
              {gettingPickupLocation ? (
                <ActivityIndicator size="small" color="#5AC8FA" />
              ) : (
                <Icons.location
                  name={IconNames.location as any}
                  size={20}
                  color="#5AC8FA"
                />
              )}
            </TouchableOpacity>
          </View>
          {pickupError && !geocodingPickup && (
            <View className="mt-2">
              <Text className="text-red-500 text-xs">
                ❌ No results found for "{pickupError}". Please be more specific
                (e.g., "Lekki Phase 1, Lagos" instead of just "Lekki").
              </Text>
            </View>
          )}
          <View className="mt-3">
            <View
              className={`rounded-xl px-3 py-2.5 border ${
                isDark
                  ? "bg-info/5 border-info/20"
                  : "bg-blue-50 border-blue-100"
              }`}
            >
              <View className="flex-row items-start">
                <Icons.info
                  name={IconNames.informationOutline as any}
                  size={14}
                  color={isDark ? "#5AC8FA" : "#007AFF"}
                  style={{ marginRight: 8, marginTop: 2 }}
                />
                <View className="flex-1">
                  <Text
                    className={`text-xs font-semibold mb-1 ${
                      isDark ? "text-info" : "text-blue-600"
                    }`}
                  >
                    💡 Address Format Tips
                  </Text>
                  <Text
                    className={`text-xs leading-4 ${
                      isDark ? "text-light-400" : "text-gray-600"
                    }`}
                  >
                    Be specific! Include area, landmark, or street name.
                    Examples:{" "}
                    <Text
                      className={`font-semibold ${
                        isDark ? "text-light-300" : "text-gray-700"
                      }`}
                    >
                      "Lekki Phase 1, Lagos"{" "}
                    </Text>
                    or{" "}
                    <Text
                      className={`font-semibold ${
                        isDark ? "text-light-300" : "text-gray-700"
                      }`}
                    >
                      "Allen Avenue, Ikeja"
                    </Text>
                    . Avoid just "Lekki" or "Ikeja" - be more specific!
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <View className="flex-row items-center justify-between mt-2">
            {!user?.defaultAddress && (
              <View className="flex-row items-center flex-1">
                <Icons.info
                  name={IconNames.informationOutline as any}
                  size={12}
                  color={isDark ? "#9CA4AB" : "#6E6E73"}
                  style={{ marginRight: 6 }}
                />
                <Text
                  className={`text-xs ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Tip: Save your address in your profile to quickly fill it here
                </Text>
              </View>
            )}
            {!useDefaultAddress && (
              <Text
                className={`text-xs ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                Tap 📍 to use current location
              </Text>
            )}
          </View>
        </View>

        {/* DROPOFF FIELD */}
        <View
          className={`border rounded-3xl p-5 mb-4 ${
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
            zIndex: 5,
            overflow: "visible",
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
            <Text
              className={`font-bold text-base ${
                isDark ? "text-light-100" : "text-black"
              }`}
            >
              Dropoff address
            </Text>
          </View>
          {geocodingDropoff ? (
            <View
              className={`rounded-xl px-4 py-3.5 border items-center flex-row ${
                isDark
                  ? "bg-dark-100 border-neutral-100"
                  : "bg-gray-100 border-gray-200"
              }`}
            >
              <ActivityIndicator size="small" color="#FF9500" />
            </View>
          ) : (
            <AddressField
              value={dropoffAddress}
              onChange={(text: string) => {
                setDropoffAddress(text);
                setDropoffError(null);
              }}
              onSelect={(suggestion: AddressSuggestion) => {
                const selectedAddress =
                  suggestion.displayAddress || suggestion.address;
                setDropoffAddress(selectedAddress);
                setDropoffCoords({
                  lat: suggestion.lat,
                  lng: suggestion.lng,
                });
                lastDropoff.current = selectedAddress;
                setDropoffError(null);
              }}
              placeholder="Yaba, University of Lagos"
              editable={true}
              fetchSuggestions={getAddressSuggestions}
            />
          )}
          {dropoffError && !geocodingDropoff && (
            <View className="mt-2">
              <Text className="text-red-500 text-xs">
                ❌ No results found for "{dropoffError}". Please be more
                specific (e.g., "Lekki Phase 1, Lagos" instead of just "Lekki").
              </Text>
            </View>
          )}
          <View className="mt-3">
            <View
              className={`rounded-xl px-3 py-2.5 border ${
                isDark
                  ? "bg-accentWarm/5 border-accentWarm/20"
                  : "bg-orange-50 border-orange-100"
              }`}
            >
              <View className="flex-row items-start">
                <Icons.info
                  name={IconNames.informationOutline as any}
                  size={14}
                  color={isDark ? "#FF9500" : "#FF9500"}
                  style={{ marginRight: 8, marginTop: 2 }}
                />
                <View className="flex-1">
                  <Text
                    className={`text-xs font-semibold mb-1 ${
                      isDark ? "text-accentWarm" : "text-orange-600"
                    }`}
                  >
                    📍 Better Address = Accurate Pricing
                  </Text>
                  <Text
                    className={`text-xs leading-4 ${
                      isDark ? "text-light-400" : "text-gray-600"
                    }`}
                  >
                    Include specific details:{" "}
                    <Text
                      className={`font-semibold ${
                        isDark ? "text-light-300" : "text-gray-700"
                      }`}
                    >
                      "Lekki Phase 1"
                    </Text>
                    ,{" "}
                    <Text
                      className={`font-semibold ${
                        isDark ? "text-light-300" : "text-gray-700"
                      }`}
                    >
                      "Victoria Island"
                    </Text>
                    ,{" "}
                    <Text
                      className={`font-semibold ${
                        isDark ? "text-light-300" : "text-gray-700"
                      }`}
                    >
                      "Yaba, University of Lagos"
                    </Text>
                    . Add landmarks or street names for best results!
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ITEMS */}
        <View
          className={`border rounded-3xl p-5 mb-4 ${
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
          <View className="flex-row items-center mb-3">
            <View
              className={`rounded-lg p-1.5 mr-2 ${
                isDark ? "bg-accent/20" : "bg-blue-900/20"
              }`}
            >
              <Icons.package
                name={IconNames.packageOutline as any}
                size={16}
                color={isDark ? "#AB8BFF" : "#1E3A8A"}
              />
            </View>
            <Text
              className={`font-bold text-base ${
                isDark ? "text-light-100" : "text-black"
              }`}
            >
              Items
            </Text>
          </View>
          <TextInput
            value={items}
            onChangeText={setItems}
            placeholder="Laptop + charger"
            placeholderTextColor="#9CA4AB"
            className={`rounded-xl px-4 py-3.5 border ${
              isDark
                ? "text-light-100 bg-dark-100 border-neutral-100"
                : "text-black bg-gray-100 border-gray-200"
            }`}
          />
        </View>

        {/* VEHICLE SELECTION */}
        {estimatedPrice && (
          <View
            className={`border rounded-3xl p-5 mb-4 ${
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
              <View
                className={`rounded-lg p-1.5 mr-2 ${
                  isDark ? "bg-accent/20" : "bg-blue-900/20"
                }`}
              >
                <Icons.delivery
                  name={IconNames.carOutline as any}
                  size={16}
                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                />
              </View>
              <Text
                className={`font-bold text-base ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                Choose Vehicle Type
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-2"
            >
              <View className="flex-row gap-3">
                {[
                  {
                    type: "bicycle" as const,
                    label: "Bicycle",
                    icon: "bicycle",
                    price: vehiclePrices.bicycle,
                  },
                  {
                    type: "motorbike" as const,
                    label: "Motorbike",
                    icon: "motorbike",
                    price: vehiclePrices.motorbike,
                  },
                  {
                    type: "tricycle" as const,
                    label: "Tricycle",
                    icon: "rickshaw",
                    price: vehiclePrices.tricycle,
                  },
                  {
                    type: "car" as const,
                    label: "Car",
                    icon: "car-outline",
                    price: vehiclePrices.car,
                  },
                  {
                    type: "van" as const,
                    label: "Van",
                    icon: "van-utility",
                    price: vehiclePrices.van,
                  },
                ].map((vehicle) => (
                  <TouchableOpacity
                    key={vehicle.type}
                    onPress={() => setPreferredVehicleType(vehicle.type)}
                    className={`rounded-2xl p-4 border-2 ${
                      preferredVehicleType === vehicle.type
                        ? isDark
                          ? "border-accent bg-accent/20"
                          : "border-blue-800"
                        : isDark
                        ? "border-neutral-100 bg-dark-100"
                        : "border-gray-200 bg-gray-100"
                    }`}
                    style={[
                      {
                        width: 120,
                        shadowColor:
                          preferredVehicleType === vehicle.type
                            ? isDark
                              ? "#AB8BFF"
                              : "#1E3A8A"
                            : "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity:
                          preferredVehicleType === vehicle.type ? 0.2 : 0.05,
                        shadowRadius: 4,
                        elevation:
                          preferredVehicleType === vehicle.type ? 4 : 2,
                      },
                      preferredVehicleType === vehicle.type && !isDark
                        ? { backgroundColor: "#1E3A8A" }
                        : undefined,
                    ]}
                  >
                    <View className="items-center mb-2">
                      <Icons.motorcycle
                        name={vehicle.icon as any}
                        size={32}
                        color={
                          preferredVehicleType === vehicle.type
                            ? isDark
                              ? "#AB8BFF"
                              : "#FFFFFF"
                            : "#9CA4AB"
                        }
                      />
                    </View>
                    <Text
                      className={`text-center font-bold text-sm mb-1 ${
                        preferredVehicleType === vehicle.type
                          ? isDark
                            ? "text-accent"
                            : "text-white"
                          : isDark
                          ? "text-light-300"
                          : "text-gray-600"
                      }`}
                    >
                      {vehicle.label}
                    </Text>
                    <Text
                      className={`text-center font-bold text-base ${
                        preferredVehicleType === vehicle.type
                          ? isDark
                            ? "text-accent"
                            : "text-white"
                          : isDark
                          ? "text-light-100"
                          : "text-black"
                      }`}
                    >
                      ₦
                      {vehicle.price?.toLocaleString() ||
                        estimatedPrice?.toLocaleString() ||
                        "---"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* PRICE & ESTIMATE */}
        <View
          className={`border rounded-3xl p-5 mb-6 ${
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
            <View className="bg-success/20 rounded-lg p-1.5 mr-2">
              <Icons.money
                name={IconNames.cash as any}
                size={16}
                color="#30D158"
              />
            </View>
            <Text
              className={`font-bold text-base ${
                isDark ? "text-light-100" : "text-black"
              }`}
            >
              Estimated Price
            </Text>
          </View>
          {estimating ? (
            <View
              className={`rounded-xl px-4 py-4 items-center border ${
                isDark
                  ? "bg-dark-100 border-neutral-100"
                  : "bg-gray-100 border-gray-200"
              }`}
            >
              <ActivityIndicator
                size="small"
                color={isDark ? "#AB8BFF" : "#1E3A8A"}
              />
              <Text
                className={`text-xs mt-2 ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                Calculating...
              </Text>
            </View>
          ) : estimatedPrice ? (
            <>
              <View
                className={`rounded-xl px-4 py-4 mb-3 border ${
                  isDark
                    ? "bg-dark-100 border-neutral-100"
                    : "bg-gray-100 border-gray-200"
                }`}
              >
                {preferredVehicleType &&
                  vehiclePrices[preferredVehicleType] && (
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Icons.motorcycle
                          name={
                            preferredVehicleType === "bicycle"
                              ? "bicycle"
                              : preferredVehicleType === "motorbike"
                              ? "motorbike"
                              : preferredVehicleType === "tricycle"
                              ? "rickshaw"
                              : preferredVehicleType === "car"
                              ? "car-outline"
                              : "van-utility"
                          }
                          size={16}
                          color={isDark ? "#9CA4AB" : "#6E6E73"}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          className={`text-sm font-semibold ${
                            isDark ? "text-light-300" : "text-gray-600"
                          }`}
                        >
                          {preferredVehicleType.charAt(0).toUpperCase() +
                            preferredVehicleType.slice(1)}
                        </Text>
                      </View>
                      <Text
                        className={`text-lg font-bold ${
                          isDark ? "text-light-100" : "text-black"
                        }`}
                      >
                        ₦
                        {vehiclePrices[
                          preferredVehicleType
                        ]?.toLocaleString() || estimatedPrice?.toLocaleString()}
                      </Text>
                    </View>
                  )}
              </View>
              <View className="flex-row items-center justify-center">
                <Icons.status
                  name={IconNames.checkmarkCircle as any}
                  size={12}
                  color={isDark ? "#9CA4AB" : "#6E6E73"}
                  style={{ marginRight: 4 }}
                />
                <Text
                  className={`text-xs text-center ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Best rates • Fast delivery • Secure handling
                </Text>
              </View>
            </>
          ) : (
            <View
              className={`rounded-xl px-4 py-4 border ${
                isDark
                  ? "bg-dark-100 border-neutral-100"
                  : "bg-gray-100 border-gray-200"
              }`}
            >
              <View className="flex-row items-center justify-center">
                <Icons.info
                  name={IconNames.informationOutline as any}
                  size={14}
                  color={isDark ? "#9CA4AB" : "#6E6E73"}
                  style={{ marginRight: 6 }}
                />
                <Text
                  className={`text-sm text-center ${
                    isDark ? "text-light-400" : "text-gray-500"
                  }`}
                >
                  Enter addresses to see estimated price
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* SUBMIT */}
        <TouchableOpacity
          disabled={!canSubmit || submitting}
          onPress={createOrder}
          className={`rounded-2xl items-center justify-center h-14 flex-row ${
            canSubmit && !submitting
              ? ""
              : isDark
              ? "bg-dark-100 border border-neutral-100"
              : "bg-gray-100 border border-gray-200"
          }`}
          style={{
            backgroundColor:
              canSubmit && !submitting
                ? isDark
                  ? "#AB8BFF"
                  : "#1E3A8A"
                : undefined,
            shadowColor:
              canSubmit && !submitting
                ? isDark
                  ? "#AB8BFF"
                  : "#1E3A8A"
                : "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: canSubmit && !submitting ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: canSubmit && !submitting ? 6 : 2,
          }}
        >
          {submitting ? (
            <>
              <ActivityIndicator
                color={isDark ? "#030014" : "#FFFFFF"}
                size="small"
              />
              <Text
                className={`font-bold ml-2 ${
                  isDark ? "text-primary" : "text-white"
                }`}
              >
                Creating...
              </Text>
            </>
          ) : (
            <>
              <Icons.action
                name={IconNames.addCircle as any}
                size={20}
                color={
                  canSubmit
                    ? isDark
                      ? "#030014"
                      : "#FFFFFF"
                    : "#9CA4AB"
                }
                style={{ marginRight: 8 }}
              />
              <Text
                className={`font-bold text-base ${
                  canSubmit
                    ? isDark
                      ? "text-primary"
                      : "text-white"
                    : isDark
                    ? "text-light-400"
                    : "text-gray-500"
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
