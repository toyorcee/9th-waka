import { SocketEvents } from "@/constants/socketEvents";
import { useTheme } from "@/contexts/ThemeContext";
import { getOrder } from "@/services/orderApi";
import { socketClient } from "@/services/socketClient";
import React, { useEffect, useRef, useState } from "react";
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
  console.warn("react-native-webview not installed, using fallback");
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
  const webViewRef = useRef<any>(null);
  const mapUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  useEffect(() => {
    loadOrder();
    return () => {
      if (mapUpdateIntervalRef.current) {
        clearInterval(mapUpdateIntervalRef.current);
      }
    };
  }, [orderId]);

  useEffect(() => {
    if (!order || !order.riderId) return;

    const handleLocationUpdate = (data: any) => {
      if (data.orderId === orderId) {
        setRiderLocation({ lat: data.lat, lng: data.lng });
        updateMapWithLocation(data.lat, data.lng);
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

  const updateMapWithLocation = (lat: number, lng: number) => {
    if (!webViewRef.current || !order || !WebView) return;

    const pickup = order.pickup;
    const dropoff = order.dropoff;

    // Update map with new location
    const mapHtml = generateMapHTML(pickup, dropoff, { lat, lng });
    webViewRef.current.injectJavaScript(`
      document.body.innerHTML = \`${mapHtml
        .replace(/`/g, "\\`")
        .replace(/\$/g, "\\$")}\`;
    `);
  };

  const generateMapHTML = (
    pickup: any,
    dropoff: any,
    riderLoc: { lat: number; lng: number } | null
  ) => {
    if (!pickup?.lat || !dropoff?.lat) {
      return `
        <html>
          <body style="margin:0;padding:20px;background:#030014;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;">
            <p>Loading map...</p>
          </body>
        </html>
      `;
    }

    // Use Google Maps JavaScript API with a simple approach
    // Note: This requires a Google Maps API key - you'll need to add it to your environment
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

    // If no API key, use a simple iframe with directions URL
    if (!apiKey) {
      const waypoints = riderLoc
        ? `${pickup.lat},${pickup.lng}|${riderLoc.lat},${riderLoc.lng}|${dropoff.lat},${dropoff.lng}`
        : `${pickup.lat},${pickup.lng}|${dropoff.lat},${dropoff.lng}`;

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { margin: 0; padding: 0; overflow: hidden; }
              iframe { width: 100%; height: 100vh; border: 0; }
            </style>
          </head>
          <body>
            <iframe
              src="https://www.google.com/maps/dir/${waypoints}"
              allowfullscreen
            ></iframe>
          </body>
        </html>
      `;
    }

    // With API key, use embed API for better control
    const waypointsStr = riderLoc
      ? `&waypoints=${pickup.lat},${pickup.lng}|${riderLoc.lat},${riderLoc.lng}|${dropoff.lat},${dropoff.lng}`
      : "";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; overflow: hidden; }
            iframe { width: 100%; height: 100vh; border: 0; }
          </style>
        </head>
        <body>
          <iframe
            id="map"
            src="https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${
      pickup.lat
    },${pickup.lng}&destination=${dropoff.lat},${
      dropoff.lng
    }${waypointsStr}&zoom=13&maptype=roadmap"
            allowfullscreen
          ></iframe>
          <script>
            // Auto-refresh every 30 seconds to update rider location
            setInterval(() => {
              const iframe = document.getElementById('map');
              if (iframe && ${
                riderLoc ? `"${riderLoc.lat},${riderLoc.lng}"` : "null"
              }) {
                const waypoints = "${pickup.lat},${pickup.lng}|${
      riderLoc ? `${riderLoc.lat},${riderLoc.lng}` : ""
    }|${dropoff.lat},${dropoff.lng}".split("|").filter(Boolean);
                const waypointsStr = waypoints.length > 0 ? "&waypoints=" + waypoints.join("|") : "";
                iframe.src = "https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${
      pickup.lat
    },${pickup.lng}&destination=${dropoff.lat},${
      dropoff.lng
    }" + waypointsStr + "&zoom=13&maptype=roadmap";
              }
            }, 30000);
          </script>
        </body>
      </html>
    `;
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

  const mapHtml = generateMapHTML(order.pickup, order.dropoff, riderLocation);

  // If WebView is not available, show a fallback with link to open in browser
  if (!WebView) {
    return (
      <View
        className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
        style={{ paddingTop: insets.top }}
      >
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
              className={`text-xs ${
                isDark ? "text-light-400" : "text-gray-500"
              }`}
            >
              {order.items} • {order.status}
            </Text>
          </View>
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
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ paddingBottom: insets.bottom }}
        >
          <Text
            className={`text-lg font-semibold mb-4 text-center ${
              isDark ? "text-light-200" : "text-black"
            }`}
          >
            Open in Google Maps
          </Text>
          <Text
            className={`text-sm text-center mb-6 ${
              isDark ? "text-light-400" : "text-gray-500"
            }`}
          >
            Install react-native-webview for in-app map viewing, or open in your
            browser
          </Text>
          <TouchableOpacity
            onPress={() => {
              const waypoints = riderLocation
                ? `${order.pickup.lat},${order.pickup.lng}/${riderLocation.lat},${riderLocation.lng}/${order.dropoff.lat},${order.dropoff.lng}`
                : `${order.pickup.lat},${order.pickup.lng}/${order.dropoff.lat},${order.dropoff.lng}`;
              const url = `https://www.google.com/maps/dir/${waypoints}`;
              Linking.openURL(url).catch((err) =>
                console.error("Failed to open maps", err)
              );
            }}
            className="bg-accent rounded-xl px-6 py-4"
          >
            <Text className="text-primary font-bold text-base">
              Open Google Maps
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      className={`flex-1 ${isDark ? "bg-primary" : "bg-white"}`}
      style={{ paddingTop: insets.top }}
    >
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
            onPress={() => {
              const waypoints = riderLocation
                ? `${order.pickup.lat},${order.pickup.lng}/${riderLocation.lat},${riderLocation.lng}/${order.dropoff.lat},${order.dropoff.lng}`
                : `${order.pickup.lat},${order.pickup.lng}/${order.dropoff.lat},${order.dropoff.lng}`;
              const url = `https://www.google.com/maps/dir/${waypoints}`;
              Linking.openURL(url).catch((err) =>
                console.error("Failed to open maps", err)
              );
            }}
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
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View
            className={`absolute inset-0 items-center justify-center ${
              isDark ? "bg-primary" : "bg-white"
            }`}
          >
            <ActivityIndicator size="large" color="#AB8BFF" />
          </View>
        )}
      />
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
