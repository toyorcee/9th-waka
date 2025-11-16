import { SocketEvents } from "@/constants/socketEvents";
import { useTheme } from "@/contexts/ThemeContext";
import { calculateAddressDistance } from "@/services/geocodingApi";
import { getOrder } from "@/services/orderApi";
import { socketClient } from "@/services/socketClient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

let WebView: any;
try {
  WebView = require("react-native-webview").WebView;
} catch (e) {
  console.warn("react-native-webview not installed");
}

interface OrderTrackingMapProps {
  orderId: string;
  onClose?: () => void;
}

export default function OrderTrackingMap({
  orderId,
  onClose,
}: OrderTrackingMapProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [riderLocation, setRiderLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
  } | null>(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (!order || !order.riderId) return;

    const handleLocationUpdate = (data: any) => {
      if (data.orderId === orderId) {
        setRiderLocation({ lat: data.lat, lng: data.lng });
        // Recalculate route when rider moves
        if (order?.pickup?.lat && order?.dropoff?.lat) {
          fetchRoute();
        }
      }
    };

    const socket = socketClient.socketInstance;
    if (!socket) return;

    socket.on(SocketEvents.RIDER_LOCATION_UPDATED, handleLocationUpdate);

    const handleCustomEvent = (event: any) => {
      if (event.detail?.orderId === orderId) {
        handleLocationUpdate(event.detail);
      }
    };
    if (
      typeof window !== "undefined" &&
      typeof window.addEventListener === "function"
    ) {
      window.addEventListener("rider-location-updated", handleCustomEvent);
    }

    if (order.riderLocation) {
      setRiderLocation({
        lat: order.riderLocation.lat,
        lng: order.riderLocation.lng,
      });
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
  }, [order, orderId]);

  useEffect(() => {
    if (order?.pickup?.lat && order?.dropoff?.lat) {
      fetchRoute();
    }
  }, [order, riderLocation]);

  const loadOrder = async () => {
    try {
      const orderData = await getOrder(orderId);
      setOrder(orderData);
      if (orderData.riderLocation) {
        setRiderLocation({
          lat: orderData.riderLocation.lat,
          lng: orderData.riderLocation.lng,
        });
      }
    } catch (e) {
      console.error("Error loading order:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoute = async () => {
    if (!order?.pickup?.lat || !order?.dropoff?.lat) return;

    try {
      // Use backend API for distance calculation (secure - uses Mapbox on server)
      const result = await calculateAddressDistance({
        lat1: order.pickup.lat,
        lng1: order.pickup.lng,
        lat2: order.dropoff.lat,
        lng2: order.dropoff.lng,
      });

      if (result) {
        // Use duration from Mapbox if available, otherwise estimate
        const durationMinutes =
          result.durationMinutes || (result.distanceKm / 30) * 60; // Estimate: 30 km/h average in Lagos

        setRouteInfo({
          distance: result.distanceKm,
          duration: durationMinutes,
        });
      }
    } catch (error) {
      console.error("[ROUTING] Error fetching route:", error);
    }
  };

  const openInMapsApp = () => {
    if (!order?.pickup?.lat || !order?.dropoff?.lat) return;

    const waypoints = riderLocation
      ? `${order.pickup.lat},${order.pickup.lng}/${riderLocation.lat},${riderLocation.lng}/${order.dropoff.lat},${order.dropoff.lng}`
      : `${order.pickup.lat},${order.pickup.lng}/${order.dropoff.lat},${order.dropoff.lng}`;
    const url = `https://www.google.com/maps/dir/${waypoints}`;
    Linking.openURL(url).catch((err) =>
      console.error("Failed to open maps", err)
    );
  };

  if (loading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-primary" : "bg-white"
        }`}
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator size="large" color="#AB8BFF" />
        <Text className={`mt-4 ${isDark ? "text-light-300" : "text-gray-600"}`}>
          Loading map...
        </Text>
      </View>
    );
  }

  if (!order || !order.pickup?.lat || !order.dropoff?.lat) {
    return (
      <View
        className={`flex-1 items-center justify-center px-6 ${
          isDark ? "bg-primary" : "bg-white"
        }`}
        style={{ paddingTop: insets.top }}
      >
        <Text
          className={`text-center mb-4 ${
            isDark ? "text-light-300" : "text-gray-600"
          }`}
        >
          Map data not available
        </Text>
        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            className="bg-accent rounded-xl px-6 py-3"
          >
            <Text className="text-primary font-bold">Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Generate Google Maps URL for WebView
  const generateMapUrl = () => {
    if (!order?.pickup?.lat || !order?.dropoff?.lat) return "";

    const waypoints = riderLocation
      ? `${order.pickup.lat},${order.pickup.lng}/${riderLocation.lat},${riderLocation.lng}/${order.dropoff.lat},${order.dropoff.lng}`
      : `${order.pickup.lat},${order.pickup.lng}/${order.dropoff.lat},${order.dropoff.lng}`;

    return `https://www.google.com/maps/dir/${waypoints}`;
  };

  return (
    <View
      className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View
        className={`border-b px-4 py-3 flex-row items-center justify-between ${
          isDark
            ? "bg-secondary border-neutral-100"
            : "bg-white border-gray-200"
        }`}
      >
        <View className="flex-1">
          <Text
            className={`font-semibold text-base ${
              isDark ? "text-light-100" : "text-black"
            }`}
          >
            Live Order Tracking
          </Text>
          <Text
            className={`text-xs ${isDark ? "text-light-400" : "text-gray-500"}`}
          >
            {order.items} • {order.status}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={openInMapsApp}
            className="bg-accent rounded-lg px-3 py-2"
          >
            <Text className="text-primary font-bold text-xs">
              Open in Maps App
            </Text>
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity
              onPress={onClose}
              className={`rounded-lg px-3 py-2 ${
                isDark ? "bg-dark-100" : "bg-gray-100"
              }`}
            >
              <Text
                className={`font-semibold text-xs ${
                  isDark ? "text-light-200" : "text-black"
                }`}
              >
                Close
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Route Info Card */}
      {routeInfo && (
        <View
          className={`mx-4 mt-4 rounded-xl p-4 border ${
            isDark
              ? "bg-secondary border-neutral-100"
              : "bg-white border-gray-200"
          }`}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text
                className={`text-sm ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                Distance
              </Text>
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                {routeInfo.distance.toFixed(1)} km
              </Text>
            </View>
            <View>
              <Text
                className={`text-sm ${
                  isDark ? "text-light-400" : "text-gray-500"
                }`}
              >
                Est. Time
              </Text>
              <Text
                className={`text-lg font-bold ${
                  isDark ? "text-light-100" : "text-black"
                }`}
              >
                {Math.round(routeInfo.duration)} min
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Google Maps WebView */}
      {WebView && order?.pickup?.lat && order?.dropoff?.lat ? (
        <WebView
          source={{ uri: generateMapUrl() }}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      ) : (
        <View
          className="flex-1 items-center justify-center"
          style={{ paddingBottom: insets.bottom }}
        >
          <Text
            className={`text-center px-6 ${
              isDark ? "text-light-300" : "text-gray-600"
            }`}
          >
            {!order?.pickup?.lat || !order?.dropoff?.lat
              ? "Map data not available"
              : "Tap 'Open in Maps App' to view route"}
          </Text>
        </View>
      )}

      {/* Rider Location Status */}
      {riderLocation && (
        <View
          className={`absolute left-4 right-4 rounded-xl p-3 border ${
            isDark
              ? "bg-secondary/95 border-neutral-100"
              : "bg-white/95 border-gray-200"
          }`}
          style={{ bottom: insets.bottom + 16 }}
        >
          <View className="flex-row items-center gap-2">
            <View className="w-3 h-3 rounded-full bg-green-500" />
            <Text
              className={`text-sm flex-1 ${
                isDark ? "text-light-200" : "text-black"
              }`}
            >
              Rider location updated
            </Text>
            <Text
              className={`text-xs ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              {new Date().toLocaleTimeString()}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
