/**
 * Routing service to calculate actual road distance between two points
 * Uses Mapbox Directions API (primary) with OpenRouteService fallback
 * Falls back to Haversine distance if routing APIs fail
 */

import { calculateMapboxDistance } from "./mapboxService.js";

/**
 * Calculate road distance between two coordinates using routing API
 * @param {number} lat1 - Pickup latitude
 * @param {number} lng1 - Pickup longitude
 * @param {number} lat2 - Dropoff latitude
 * @param {number} lng2 - Dropoff longitude
 * @returns {Promise<number>} - Road distance in kilometers
 */
const calculateRoadDistance = async (lat1, lng1, lat2, lng2) => {
  // Try Mapbox first (better accuracy)
  console.log("[ROUTING] 🚀 Starting distance calculation:", {
    from: `(${lat1.toFixed(6)}, ${lng1.toFixed(6)})`,
    to: `(${lat2.toFixed(6)}, ${lng2.toFixed(6)})`,
  });

  try {
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    if (mapboxToken) {
      console.log("[ROUTING] ✅ Mapbox token found, using Mapbox API");
      const result = await calculateMapboxDistance([lng1, lat1], [lng2, lat2]);
      if (result) {
        console.log(
          "[ROUTING] ✅ Mapbox distance result:",
          result.distanceKm.toFixed(2),
          "km",
          `(${result.durationMinutes.toFixed(1)} min)`
        );
        return result.distanceKm;
      } else {
        console.warn("[ROUTING] ⚠️ Mapbox returned null, trying fallback");
      }
    } else {
      console.warn("[ROUTING] ⚠️ No Mapbox token found, using fallback");
    }
  } catch (error) {
    console.error(
      "[ROUTING] ❌ Mapbox error:",
      error.message,
      "- trying OpenRouteService"
    );
  }

  // Fallback to OpenRouteService
  const apiKey = process.env.OPENROUTESERVICE_API_KEY?.trim();

  if (!apiKey) {
    console.warn(
      "[ROUTING] ⚠️ No routing API keys found, using Haversine fallback"
    );
    const haversineDistance = calculateHaversineDistance(
      lat1,
      lng1,
      lat2,
      lng2
    );
    console.log(
      "[ROUTING] Haversine distance (fallback):",
      haversineDistance,
      "km"
    );
    return haversineDistance;
  }

  console.log(
    "[ROUTING] 🚀 Using OpenRouteService API for road distance calculation"
  );
  console.log("[ROUTING] Route:", {
    from: `(${lat1.toFixed(6)}, ${lng1.toFixed(6)})`,
    to: `(${lat2.toFixed(6)}, ${lng2.toFixed(6)})`,
  });

  try {
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${lng1},${lat1}&end=${lng2},${lat2}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("[ROUTING] ❌ OpenRouteService API error:", {
        error: data.error,
        message: data.error.message || "Unknown error",
      });
      const haversineDistance = calculateHaversineDistance(
        lat1,
        lng1,
        lat2,
        lng2
      );
      console.log(
        "[ROUTING] Falling back to Haversine:",
        haversineDistance,
        "km"
      );
      return haversineDistance;
    }

    if (data.features && data.features.length > 0) {
      const route = data.features[0];
      const distanceMeters = route.properties.segments[0].distance;
      const distanceKm = distanceMeters / 1000;
      const haversineDistance = calculateHaversineDistance(
        lat1,
        lng1,
        lat2,
        lng2
      );

      console.log("[ROUTING] ✅ Road distance calculated successfully!");
      console.log("[ROUTING] 📊 Distance comparison:", {
        roadDistance: `${distanceKm.toFixed(2)} km (from routing API)`,
        haversineDistance: `${haversineDistance.toFixed(
          2
        )} km (straight-line × 1.35)`,
        difference: `${(distanceKm - haversineDistance).toFixed(2)} km`,
      });

      return Math.round(distanceKm * 10) / 10;
    }

    // Fallback if no route found
    console.warn(
      "[ROUTING] ⚠️ No route found in API response, using Haversine fallback"
    );
    const haversineDistance = calculateHaversineDistance(
      lat1,
      lng1,
      lat2,
      lng2
    );
    console.log(
      "[ROUTING] Haversine distance (fallback):",
      haversineDistance,
      "km"
    );
    return haversineDistance;
  } catch (error) {
    console.error("[ROUTING] ❌ Error calculating road distance:", {
      message: error.message,
      stack: error.stack,
    });
    const haversineDistance = calculateHaversineDistance(
      lat1,
      lng1,
      lat2,
      lng2
    );
    console.log(
      "[ROUTING] Falling back to Haversine:",
      haversineDistance,
      "km"
    );
    return haversineDistance;
  }
};

/**
 * Calculate straight-line distance using Haversine formula (fallback)
 * @param {number} lat1 - Pickup latitude
 * @param {number} lng1 - Pickup longitude
 * @param {number} lat2 - Dropoff latitude
 * @param {number} lng2 - Dropoff longitude
 * @returns {number} - Straight-line distance in kilometers (with multiplier applied)
 */
const calculateHaversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineDistance = R * c;

  // Apply multiplier to approximate road distance
  const DISTANCE_MULTIPLIER =
    Number(process.env.PRICE_DISTANCE_MULTIPLIER) || 1.35;
  const adjustedDistance = straightLineDistance * DISTANCE_MULTIPLIER;

  return Math.round(adjustedDistance * 10) / 10;
};

export { calculateHaversineDistance, calculateRoadDistance };
