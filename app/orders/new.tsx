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
  Animated,
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, { FadeInDown, SlideInUp } from "react-native-reanimated";
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

  // Animation refs for page slide-in from bottom
  const screenHeight = Dimensions.get("window").height;
  const pageSlideAnim = useRef(new Animated.Value(screenHeight)).current;
  const pageOpacityAnim = useRef(new Animated.Value(0)).current;
  const hasPageAnimatedRef = useRef(false);

  // Icon animations (animate after 3 seconds)
  const icon1Anim = useRef(new Animated.Value(1)).current;
  const icon2Anim = useRef(new Animated.Value(1)).current;
  const icon3Anim = useRef(new Animated.Value(1)).current;
  const icon4Anim = useRef(new Animated.Value(1)).current;

  // Carousel auto-scroll refs
  const vehicleCarouselRef = useRef<ScrollView>(null);
  const carouselScrollX = useRef(0);
  const carouselAutoScrollInterval = useRef<number | null>(null);

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

  // Page slide-in animation from bottom
  useEffect(() => {
    if (!hasPageAnimatedRef.current) {
      hasPageAnimatedRef.current = true;
      Animated.parallel([
        Animated.timing(pageSlideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pageOpacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      pageSlideAnim.setValue(0);
      pageOpacityAnim.setValue(1);
    }
  }, []);

  // Icon animations after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      const createPulseAnimation = (
        animValue: Animated.Value,
        delay: number
      ) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1.2,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const anim1 = createPulseAnimation(icon1Anim, 0);
      const anim2 = createPulseAnimation(icon2Anim, 150);
      const anim3 = createPulseAnimation(icon3Anim, 300);
      const anim4 = createPulseAnimation(icon4Anim, 450);

      anim1.start();
      anim2.start();
      anim3.start();
      anim4.start();

      return () => {
        anim1.stop();
        anim2.stop();
        anim3.stop();
        anim4.stop();
      };
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll vehicle carousel continuously
  useEffect(() => {
    if (!estimatedPrice || !vehicleCarouselRef.current) return;

    const startAutoScroll = () => {
      carouselAutoScrollInterval.current = setInterval(() => {
        if (vehicleCarouselRef.current) {
          carouselScrollX.current += 142; // Width of each item + gap

          // Reset to start if we've scrolled past all items (5 items * 142 = 710)
          if (carouselScrollX.current >= 710) {
            carouselScrollX.current = 0;
          }

          vehicleCarouselRef.current.scrollTo({
            x: carouselScrollX.current,
            animated: true,
          });
        }
      }, 2000); // Scroll every 2 seconds
    };

    startAutoScroll();

    return () => {
      if (carouselAutoScrollInterval.current) {
        clearInterval(carouselAutoScrollInterval.current);
      }
    };
  }, [estimatedPrice]);

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
      Toast.show({
        type: "success",
        text1: "Order created successfully",
        text2: "Your order has been placed and is being processed",
      });

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
    <Animated.View
      style={{
        flex: 1,
        transform: [{ translateY: pageSlideAnim }],
        opacity: pageOpacityAnim,
      }}
    >
      {/* Fixed Header */}
      <View
        className={`absolute top-0 left-0 right-0 z-50 ${
          isDark ? "bg-primary" : "bg-white"
        }`}
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 16,
        paddingHorizontal: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.15 : 0.08,
          shadowRadius: 8,
          elevation: 8,
      }}
    >
        <View className="flex-row items-center justify-between">
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
              <Animated.View
                style={{
                  transform: [{ scale: icon1Anim }],
                }}
              >
              <View
                  className={`rounded-2xl p-2.5 mr-3 ${
                    isDark
                      ? "bg-accent/30 border border-accent/40"
                      : "bg-blue-50 border border-blue-100"
                }`}
              >
                <Icons.action
                  name={IconNames.addCircle as any}
                    size={24}
                  color={isDark ? "#AB8BFF" : "#1E3A8A"}
                />
              </View>
              </Animated.View>
              <Text
                className={`text-2xl font-bold ${
                  isDark ? "text-light-100" : "text-gray-900"
                }`}
              >
                New Delivery
              </Text>
            </View>
          </View>
          <View className="w-11" />
        </View>
        </View>

      <ScrollView
        className={`flex-1 ${isDark ? "bg-primary" : "bg-gray-50"}`}
        contentContainerStyle={{
          paddingTop: insets.top + 90,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {/* DEFAULT ADDRESS SECTION - OPay Style with Parent Background */}
        {user?.defaultAddress ? (
            <Reanimated.View
              entering={FadeInDown.delay(100).duration(400)}
              className="mb-6"
            >
          <View
                className={`rounded-3xl p-5 ${
                  isDark ? "bg-secondary" : "bg-white"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.1 : 0.05,
              shadowRadius: 8,
                  elevation: 3,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-3">
                  <View
                        className={`rounded-xl p-2 mr-3 ${
                      useDefaultAddress
                        ? isDark
                          ? "bg-accent/20"
                              : "bg-blue-50"
                        : isDark
                        ? "bg-accent/10"
                            : "bg-gray-100"
                    }`}
                  >
                    <Icons.status
                      name={IconNames.checkmarkCircle as any}
                          size={20}
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
                      className={`text-sm ml-14 mb-3 ${
                    isDark ? "text-light-300" : "text-gray-600"
                  }`}
                >
                  Auto-fill pickup address from your profile
                </Text>
                    <View className="flex-row items-start ml-14">
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
            </Reanimated.View>
        ) : (
            <Reanimated.View
              entering={FadeInDown.delay(100).duration(400)}
              className="mb-6"
            >
          <View
                className={`rounded-3xl p-5 ${
                  isDark ? "bg-secondary" : "bg-white"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.1 : 0.05,
                  shadowRadius: 8,
                  elevation: 3,
            }}
          >
            <View className="flex-row items-start">
                  <View
                    className={`rounded-xl p-2 mr-3 ${
                      isDark ? "bg-info/20" : "bg-blue-50"
                    }`}
                  >
                <Icons.info
                  name={IconNames.informationOutline as any}
                      size={20}
                      color={isDark ? "#5AC8FA" : "#1E3A8A"}
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
                      Add your default address in your profile to quickly fill
                      it here with one tap
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
            </Reanimated.View>
        )}

        {/* PICKUP FIELD */}
          <Reanimated.View
            entering={FadeInDown.delay(200).duration(400)}
            className="mb-4"
          >
        <View
              className={`border rounded-3xl p-5 ${
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
                <Animated.View
                  style={{
                    transform: [{ scale: icon2Anim }],
                  }}
                >
                  <View
                    className={`rounded-xl p-2 mr-3 ${
                      isDark ? "bg-info/20" : "bg-blue-50"
                    }`}
                  >
              <Icons.location
                name={IconNames.locationOutline as any}
                      size={20}
                      color={isDark ? "#5AC8FA" : "#1E3A8A"}
              />
            </View>
                </Animated.View>
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
                    ❌ No results found for "{pickupError}". Please be more
                    specific (e.g., "Lekki Phase 1, Lagos" instead of just
                    "Lekki").
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
                      Tip: Save your address in your profile to quickly fill it
                      here
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
          </Reanimated.View>

        {/* DROPOFF FIELD */}
          <Reanimated.View
            entering={FadeInDown.delay(300).duration(400)}
            className="mb-4"
          >
        <View
              className={`border rounded-3xl p-5 ${
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
                <Animated.View
                  style={{
                    transform: [{ scale: icon3Anim }],
                  }}
                >
                  <View
                    className={`rounded-xl p-2 mr-3 ${
                      isDark ? "bg-accentWarm/20" : "bg-orange-50"
                    }`}
                  >
              <Icons.location
                name={IconNames.locationOutline as any}
                      size={20}
                      color={isDark ? "#FF9500" : "#EA580C"}
              />
            </View>
                </Animated.View>
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
                    specific (e.g., "Lekki Phase 1, Lagos" instead of just
                    "Lekki").
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
          </Reanimated.View>

        {/* ITEMS */}
          <Reanimated.View
            entering={FadeInDown.delay(400).duration(400)}
            className="mb-4"
          >
        <View
              className={`border rounded-3xl p-5 ${
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
                <Animated.View
                  style={{
                    transform: [{ scale: icon4Anim }],
                  }}
                >
            <View
                    className={`rounded-xl p-2 mr-3 ${
                      isDark ? "bg-accent/20" : "bg-purple-50"
              }`}
            >
              <Icons.package
                name={IconNames.packageOutline as any}
                      size={20}
                      color={isDark ? "#AB8BFF" : "#9333EA"}
              />
            </View>
                </Animated.View>
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
                placeholder="Describe your package (e.g., Laptop + charger, Documents, Food items)"
            placeholderTextColor="#9CA4AB"
            className={`rounded-xl px-4 py-3.5 border ${
              isDark
                ? "text-light-100 bg-dark-100 border-neutral-100"
                : "text-black bg-gray-100 border-gray-200"
            }`}
          />
        </View>
          </Reanimated.View>

        {/* VEHICLE SELECTION */}
        {estimatedPrice && (
            <Reanimated.View
              entering={SlideInUp.delay(500).duration(500).springify()}
              className="mb-4"
            >
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
                  ref={vehicleCarouselRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-2"
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingVertical: 4,
                  }}
                  snapToInterval={142}
                  decelerationRate="fast"
                  snapToAlignment="start"
                  pagingEnabled={false}
                  bounces={true}
                  alwaysBounceHorizontal={true}
                  onScroll={(event) => {
                    carouselScrollX.current = event.nativeEvent.contentOffset.x;
                  }}
                  scrollEventThrottle={16}
            >
                  <View className="flex-row" style={{ gap: 12 }}>
                {[
                  {
                    type: "bicycle" as const,
                    label: "Bicycle",
                    icon: "bicycle",
                    price: vehiclePrices.bicycle,
                        color: "#10B981", // Green
                  },
                  {
                    type: "motorbike" as const,
                    label: "Motorbike",
                    icon: "motorbike",
                    price: vehiclePrices.motorbike,
                        color: "#F59E0B", // Amber/Orange
                  },
                  {
                    type: "tricycle" as const,
                    label: "Tricycle",
                    icon: "rickshaw",
                    price: vehiclePrices.tricycle,
                        color: "#8B5CF6", // Purple
                  },
                  {
                    type: "car" as const,
                    label: "Car",
                    icon: "car-outline",
                    price: vehiclePrices.car,
                        color: "#3B82F6", // Blue
                  },
                  {
                    type: "van" as const,
                    label: "Van",
                    icon: "van-utility",
                    price: vehiclePrices.van,
                        color: "#EF4444", // Red
                  },
                ].map((vehicle) => (
                  <TouchableOpacity
                    key={vehicle.type}
                    onPress={() => setPreferredVehicleType(vehicle.type)}
                        activeOpacity={0.7}
                    className={`rounded-2xl p-4 border-2 ${
                      preferredVehicleType === vehicle.type
                        ? isDark
                          ? "border-accent bg-accent/20"
                              : "border-blue-600 bg-blue-500"
                        : isDark
                        ? "border-neutral-100 bg-dark-100"
                        : "border-gray-200 bg-gray-100"
                    }`}
                    style={[
                      {
                            width: 130,
                        shadowColor:
                          preferredVehicleType === vehicle.type
                            ? isDark
                              ? "#AB8BFF"
                                  : "#3B82F6"
                            : "#000",
                            shadowOffset: { width: 0, height: 4 },
                        shadowOpacity:
                              preferredVehicleType === vehicle.type
                                ? 0.3
                                : 0.05,
                            shadowRadius: 6,
                        elevation:
                              preferredVehicleType === vehicle.type ? 6 : 2,
                      },
                      preferredVehicleType === vehicle.type && !isDark
                            ? { backgroundColor: "#3B82F6" }
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
                                : vehicle.color
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
            </Reanimated.View>
        )}

        {/* PRICE & ESTIMATE */}
          <Reanimated.View
            entering={FadeInDown.delay(550).duration(400)}
            className="mb-6"
          >
        <View
              className={`border rounded-3xl p-5 ${
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
                            ]?.toLocaleString() ||
                              estimatedPrice?.toLocaleString()}
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
          </Reanimated.View>

          {/* SUBMIT - Small Button with Icon and Text */}
          <Reanimated.View
            entering={FadeInDown.delay(600).duration(400)}
            className="mb-6 items-center"
          >
        <TouchableOpacity
          disabled={!canSubmit || submitting}
          onPress={createOrder}
              activeOpacity={0.8}
              className={`rounded-2xl items-center justify-center ${
            canSubmit && !submitting
                  ? isDark
                    ? "bg-accent"
                    : "bg-blue-500"
              : isDark
                  ? "bg-dark-100"
                  : "bg-gray-200"
          }`}
          style={{
                paddingVertical: 12,
                paddingHorizontal: 20,
                minWidth: 100,
            shadowColor:
              canSubmit && !submitting
                ? isDark
                  ? "#AB8BFF"
                      : "#3B82F6"
                : "#000",
                shadowOffset: { width: 0, height: 2 },
            shadowOpacity: canSubmit && !submitting ? 0.3 : 0.1,
                shadowRadius: 4,
                elevation: canSubmit && !submitting ? 4 : 2,
          }}
        >
          {submitting ? (
                <View className="items-center">
              <ActivityIndicator
                color={isDark ? "#030014" : "#FFFFFF"}
                size="small"
              />
              <Text
                    className={`font-semibold text-xs mt-2 ${
                  isDark ? "text-primary" : "text-white"
                }`}
              >
                Creating...
              </Text>
                </View>
          ) : (
                <View className="items-center">
              <Icons.action
                name={IconNames.addCircle as any}
                size={20}
                color={
                      canSubmit ? (isDark ? "#030014" : "#FFFFFF") : "#9CA4AB"
                }
              />
              <Text
                    className={`font-semibold text-xs mt-1.5 ${
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
                </View>
          )}
        </TouchableOpacity>
          </Reanimated.View>
      </View>
    </ScrollView>
    </Animated.View>
  );
}
