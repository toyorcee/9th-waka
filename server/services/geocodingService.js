/**
 * Geocoding service using Mapbox API only
 * Mapbox is faster and more accurate for Lagos addresses
 */

import { geocodeMapboxAddress, getMapboxSuggestions } from "./mapboxService.js";

/**
 * Geocode a single address (for final address confirmation)
 * Uses Mapbox API only
 */
const geocodeAddress = async (address) => {
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!mapboxToken) {
    throw new Error("MAPBOX_ACCESS_TOKEN not configured");
  }

  try {
    const result = await geocodeMapboxAddress(address);
    if (result) {
      console.log("[GEOCODING] ✅ Used Mapbox for geocoding");
      return result;
    }
    console.warn(
      "[GEOCODING] Mapbox returned no results for:",
      address.substring(0, 30)
    );
    return null;
  } catch (error) {
    console.error("[GEOCODING] Mapbox geocoding error:", error.message);
    throw error;
  }
};

/**
 * Get address suggestions/autocomplete
 * Returns multiple suggestions for user to choose from
 * Uses Mapbox API only
 */
const getAddressSuggestions = async (query, limit = 5) => {
  if (!query || query.trim().length < 3) {
    return [];
  }

  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!mapboxToken) {
    console.warn("[GEOCODING] MAPBOX_ACCESS_TOKEN not configured");
    return [];
  }

  console.log("[GEOCODING] 🔍 Fetching address suggestions:", {
    query: query.substring(0, 30),
    limit,
  });

  try {
    const suggestions = await getMapboxSuggestions(query, limit);
    if (suggestions.length > 0) {
      console.log(
        "[GEOCODING] ✅ Used Mapbox for suggestions:",
        suggestions.length,
        "results"
      );
      return suggestions;
    } else {
      console.log("[GEOCODING] ⚠️ Mapbox returned 0 results");
      return [];
    }
  } catch (error) {
    console.error("[GEOCODING] Mapbox suggestions error:", error.message);
    return [];
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * More accurate for Nigeria's region
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
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
  const distance = R * c;
  return Math.round(distance * 10) / 10;
};

export { calculateDistance, geocodeAddress, getAddressSuggestions };
