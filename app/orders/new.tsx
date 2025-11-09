import AddressAutocomplete from "@/components/AddressAutocomplete";
import { IconNames, Icons } from "@/constants/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { apiClient } from "@/services/apiClient";
import { AddressSuggestion, geocodeAddress } from "@/services/geocodingApi";
import { Routes } from "@/services/navigationHelper";
import { estimatePrice, PriceEstimateRequest } from "@/services/orderApi";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
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
  const [geocodingPickup, setGeocodingPickup] = useState(false);
  const [geocodingDropoff, setGeocodingDropoff] = useState(false);
  const [pickupGeocodeError, setPickupGeocodeError] = useState<string | null>(
    null
  );
  const [dropoffGeocodeError, setDropoffGeocodeError] = useState<string | null>(
    null
  );
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const lastGeocodedPickup = React.useRef<string>("");
  const lastGeocodedDropoff = React.useRef<string>("");
  const [bikePrice, setBikePrice] = useState<number | null>(null);
  const [carPrice, setCarPrice] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [preferredVehicleType, setPreferredVehicleType] = useState<
    "motorcycle" | "car" | null
  >(null);
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gettingPickupLocation, setGettingPickupLocation] = useState(false);
  const [geocodingDefaultAddress, setGeocodingDefaultAddress] = useState(false);

  React.useEffect(() => {
    if (useDefaultAddress && user?.defaultAddress) {
      setPickupAddress(user.defaultAddress);
      setGeocodingDefaultAddress(true);
      geocodeAddress(user.defaultAddress)
        .then((result) => {
          setPickupCoords({ lat: result.lat, lng: result.lng });
        })
        .catch((error) => {
          console.error("Failed to geocode default address:", error);
        })
        .finally(() => {
          setGeocodingDefaultAddress(false);
        });
    } else if (!useDefaultAddress && pickupAddress === user?.defaultAddress) {
      setPickupAddress("");
      setPickupCoords(null);
    }
  }, [useDefaultAddress, user?.defaultAddress]);

  const canSubmit =
    pickupAddress.trim().length > 3 &&
    dropoffAddress.trim().length > 3 &&
    items.trim().length > 0 &&
    preferredVehicleType !== null;

  React.useEffect(() => {
    const estimate = async () => {
      const hasPickupCoords =
        pickupCoords &&
        typeof pickupCoords.lat === "number" &&
        typeof pickupCoords.lng === "number" &&
        !isNaN(pickupCoords.lat) &&
        !isNaN(pickupCoords.lng);
      const hasDropoffCoords =
        dropoffCoords &&
        typeof dropoffCoords.lat === "number" &&
        typeof dropoffCoords.lng === "number" &&
        !isNaN(dropoffCoords.lat) &&
        !isNaN(dropoffCoords.lng);

      if (hasPickupCoords && hasDropoffCoords) {
        setEstimating(true);
        try {
          const requestPayload: PriceEstimateRequest = {
            pickup: {
              address: pickupAddress,
              lat: pickupCoords.lat,
              lng: pickupCoords.lng,
            },
            dropoff: {
              address: dropoffAddress,
              lat: dropoffCoords.lat,
              lng: dropoffCoords.lng,
            },
          };
          const resp = await estimatePrice(requestPayload);
          setEstimatedPrice(resp?.estimatedPrice || null);
          setBikePrice(resp?.bikePrice || null);
          setCarPrice(resp?.carPrice || null);
          setDistanceKm(resp?.distanceKm || null);
        } catch (e: any) {
          console.error("[FRONTEND] Price estimation error:", e?.message);
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

    const timeoutId = setTimeout(estimate, 1000);
    return () => clearTimeout(timeoutId);
  }, [pickupAddress, dropoffAddress, pickupCoords, dropoffCoords]);

  React.useEffect(() => {
    const trimmedAddress = pickupAddress.trim();

    if (!trimmedAddress || trimmedAddress.length < 10) {
      if (pickupCoords && trimmedAddress.length === 0) {
        setPickupCoords(null);
        lastGeocodedPickup.current = "";
      }
      return;
    }

    const addressChanged =
      trimmedAddress.toLowerCase() !== lastGeocodedPickup.current.toLowerCase();
    if (addressChanged && pickupCoords) {
      setPickupCoords(null);
    }

    if (pickupCoords && !addressChanged) {
      return;
    }

    const geocodeTimer = setTimeout(async () => {
      try {
        setGeocodingPickup(true);
        setPickupGeocodeError(null);
        const result = await geocodeAddress(trimmedAddress);
        if (result && result.lat && result.lng) {
          setPickupCoords({
            lat: result.lat,
            lng: result.lng,
          });
          lastGeocodedPickup.current = trimmedAddress;
          setPickupGeocodeError(null);
        } else {
          console.warn(
            "[FRONTEND] Failed to geocode pickup address - no results"
          );
          setPickupCoords(null);
          setPickupGeocodeError(trimmedAddress);
        }
      } catch (error: any) {
        if (
          error?.response?.status === 404 ||
          error?.response?.data?.success === false
        ) {
          console.warn(
            "[FRONTEND] Address not found for pickup:",
            trimmedAddress.substring(0, 30)
          );
          setPickupGeocodeError(trimmedAddress);
        } else {
          console.error(
            "[FRONTEND] Error geocoding pickup:",
            error?.message || error
          );
          setPickupGeocodeError(null);
        }
        setPickupCoords(null);
      } finally {
        setGeocodingPickup(false);
      }
    }, 1500);

    return () => clearTimeout(geocodeTimer);
  }, [pickupAddress, pickupCoords]);

  React.useEffect(() => {
    const trimmedAddress = dropoffAddress.trim();

    if (!trimmedAddress || trimmedAddress.length < 10) {
      if (dropoffCoords && trimmedAddress.length === 0) {
        setDropoffCoords(null);
        lastGeocodedDropoff.current = "";
      }
      return;
    }

    const addressChanged =
      trimmedAddress.toLowerCase() !==
      lastGeocodedDropoff.current.toLowerCase();
    if (addressChanged && dropoffCoords) {
      setDropoffCoords(null);
    }

    if (dropoffCoords && !addressChanged) {
      return;
    }

    const geocodeTimer = setTimeout(async () => {
      try {
        setGeocodingDropoff(true);
        setDropoffGeocodeError(null);
        const result = await geocodeAddress(trimmedAddress);
        if (result && result.lat && result.lng) {
          setDropoffCoords({
            lat: result.lat,
            lng: result.lng,
          });
          lastGeocodedDropoff.current = trimmedAddress;
          setDropoffGeocodeError(null);
        } else {
          console.warn(
            "[FRONTEND] Failed to geocode dropoff address - no results"
          );
          setDropoffCoords(null);
          setDropoffGeocodeError(trimmedAddress);
        }
      } catch (error: any) {
        if (
          error?.response?.status === 404 ||
          error?.response?.data?.success === false
        ) {
          console.warn(
            "[FRONTEND] Address not found for dropoff:",
            trimmedAddress.substring(0, 30)
          );
          setDropoffGeocodeError(trimmedAddress);
        } else {
          console.error(
            "[FRONTEND] Error geocoding dropoff:",
            error?.message || error
          );
          setDropoffGeocodeError(null);
        }
        setDropoffCoords(null);
      } finally {
        setGeocodingDropoff(false);
      }
    }, 1500);

    return () => clearTimeout(geocodeTimer);
  }, [dropoffAddress, dropoffCoords]);

  const getCurrentLocation = async (): Promise<void> => {
    try {
      const { status: currentStatus } =
        await Location.getForegroundPermissionsAsync();

      if (currentStatus === Location.PermissionStatus.GRANTED) {
        setGettingPickupLocation(true);
        await fetchAndSetLocation();
        return;
      }

      if (currentStatus === Location.PermissionStatus.DENIED) {
        Alert.alert(
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
        return;
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
                const { status } =
                  await Location.requestForegroundPermissionsAsync();

                if (status === Location.PermissionStatus.GRANTED) {
                  await fetchAndSetLocation();
                } else {
                  Alert.alert(
                    "Permission Denied",
                    "Location permission was not granted. You can enable it later in your device settings.",
                    [{ text: "OK" }]
                  );
                  setGettingPickupLocation(false);
                }
              } catch (error: any) {
                console.error("Error requesting location:", error);
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
      console.error("Error getting current location:", error);
      Toast.show({
        type: "error",
        text1: "Location Error",
        text2: error?.message || "Failed to get your current location",
      });
    }
  };

  const fetchAndSetLocation = async (): Promise<void> => {
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

        Toast.show({
          type: "success",
          text1: "Location set",
          text2: "Your current location has been set as pickup address",
        });
      } else {
        const coordAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setPickupAddress(coordAddress);
        setPickupCoords({ lat: latitude, lng: longitude });
      }
    } catch (error: any) {
      console.error("Error fetching location:", error);
      Toast.show({
        type: "error",
        text1: "Location Error",
        text2: error?.message || "Failed to get your current location",
      });
    } finally {
      setGettingPickupLocation(false);
    }
  };

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
      className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View>
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
              <View className="bg-accent/20 rounded-lg p-1.5 mr-2">
                <Icons.action
                  name={IconNames.addCircle as any}
                  size={18}
                  color="#AB8BFF"
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

        {user?.defaultAddress ? (
          <View
            className={`rounded-3xl mb-6 border p-5 ${
              isDark
                ? useDefaultAddress
                  ? "bg-accent/10 border-accent/30"
                  : "bg-secondary border-neutral-100"
                : useDefaultAddress
                ? "bg-accent/5 border-accent/20"
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
                        ? "bg-accent/20"
                        : isDark
                        ? "bg-accent/10"
                        : "bg-accent/5"
                    }`}
                  >
                    <Icons.status
                      name={IconNames.checkmarkCircle as any}
                      size={18}
                      color="#AB8BFF"
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
                        ? "#AB8BFF"
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
                  true: "#AB8BFF",
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
                {geocodingDefaultAddress ? (
                  <View
                    className={`rounded-xl px-4 py-3.5 border items-center flex-row ${
                      isDark
                        ? "bg-dark-100 border-neutral-100"
                        : "bg-gray-100 border-gray-200"
                    }`}
                  >
                    <ActivityIndicator size="small" color="#AB8BFF" />
                  </View>
                ) : (
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
                )}
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
                  <AddressAutocomplete
                    value={pickupAddress}
                    onChangeText={(text) => {
                      setPickupAddress(text);
                      setPickupGeocodeError(null);
                    }}
                    onSelect={(suggestion: AddressSuggestion) => {
                      const selectedAddress =
                        suggestion.displayAddress || suggestion.address;
                      setPickupCoords({
                        lat: suggestion.lat,
                        lng: suggestion.lng,
                      });
                      lastGeocodedPickup.current = selectedAddress;
                      setPickupGeocodeError(null);
                    }}
                    placeholder="Lekki Phase 1, Lagos"
                    editable={true}
                  />
                )}
              </View>
            )}
            {pickupGeocodeError && !geocodingPickup && (
              <View className="mt-2">
                <Text className="text-red-500 text-xs">
                  ❌ No results found for "{pickupGeocodeError}". Please be more
                  specific (e.g., "Lekki Phase 1, Lagos" instead of just
                  "Lekki").
                </Text>
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
            <AddressAutocomplete
              value={dropoffAddress}
              onChangeText={(text) => {
                setDropoffAddress(text);
                setDropoffGeocodeError(null);
              }}
              onSelect={(suggestion: AddressSuggestion) => {
                const selectedAddress =
                  suggestion.displayAddress || suggestion.address;
                setDropoffCoords({
                  lat: suggestion.lat,
                  lng: suggestion.lng,
                });
                lastGeocodedDropoff.current = selectedAddress;
                setDropoffGeocodeError(null);
              }}
              placeholder="Yaba, University of Lagos"
              editable={true}
            />
          )}
          {dropoffGeocodeError && !geocodingDropoff && (
            <View className="mt-2">
              <Text className="text-red-500 text-xs">
                ❌ No results found for "{dropoffGeocodeError}". Please be more
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
            <View className="bg-accent/20 rounded-lg p-1.5 mr-2">
              <Icons.package
                name={IconNames.packageOutline as any}
                size={16}
                color="#AB8BFF"
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
              <View className="bg-accent/20 rounded-lg p-1.5 mr-2">
                <Icons.delivery
                  name={IconNames.carOutline as any}
                  size={16}
                  color="#AB8BFF"
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
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setPreferredVehicleType("motorcycle")}
                className={`flex-1 rounded-2xl p-4 border-2 ${
                  preferredVehicleType === "motorcycle"
                    ? "border-accent bg-accent/20"
                    : isDark
                    ? "border-neutral-100 bg-dark-100"
                    : "border-gray-200 bg-gray-100"
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
                      : isDark
                      ? "text-light-300"
                      : "text-gray-600"
                  }`}
                >
                  Motorcycle
                </Text>
                <Text
                  className={`text-center font-bold text-lg ${
                    preferredVehicleType === "motorcycle"
                      ? "text-accent"
                      : isDark
                      ? "text-light-100"
                      : "text-black"
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
                    : isDark
                    ? "border-neutral-100 bg-dark-100"
                    : "border-gray-200 bg-gray-100"
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
                      : isDark
                      ? "text-light-300"
                      : "text-gray-600"
                  }`}
                >
                  Car/Van
                </Text>
                <Text
                  className={`text-center font-bold text-lg ${
                    preferredVehicleType === "car"
                      ? "text-accent"
                      : isDark
                      ? "text-light-100"
                      : "text-black"
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
              <ActivityIndicator size="small" color="#AB8BFF" />
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
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Icons.motorcycle
                      name={IconNames.motorcycle as any}
                      size={16}
                      color={isDark ? "#9CA4AB" : "#6E6E73"}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      className={`text-sm font-semibold ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      Motorcycle
                    </Text>
                  </View>
                  <Text
                    className={`text-lg font-bold ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    ₦
                    {bikePrice?.toLocaleString() ||
                      estimatedPrice.toLocaleString()}
                  </Text>
                </View>
                <View
                  className={`h-px mb-3 ${
                    isDark ? "bg-neutral-100" : "bg-gray-200"
                  }`}
                />
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Icons.delivery
                      name={IconNames.carOutline as any}
                      size={16}
                      color={isDark ? "#9CA4AB" : "#6E6E73"}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      className={`text-sm font-semibold ${
                        isDark ? "text-light-300" : "text-gray-600"
                      }`}
                    >
                      Car/Van
                    </Text>
                  </View>
                  <Text
                    className={`text-lg font-bold ${
                      isDark ? "text-light-100" : "text-black"
                    }`}
                  >
                    ₦
                    {carPrice?.toLocaleString() ||
                      Math.round(estimatedPrice * 1.25).toLocaleString()}
                  </Text>
                </View>
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

        {/* Create Order Button */}
        <TouchableOpacity
          disabled={!canSubmit || submitting}
          onPress={createOrder}
          className={`rounded-2xl items-center justify-center h-14 flex-row ${
            canSubmit && !submitting
              ? "bg-accent"
              : isDark
              ? "bg-dark-100 border border-neutral-100"
              : "bg-gray-100 border border-gray-200"
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
                  canSubmit
                    ? "text-primary"
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
