/**
 * Geocoding service using Mapbox API (primary) with OpenCage fallback
 * Mapbox is faster and more accurate for Lagos addresses
 */

import { geocodeMapboxAddress, getMapboxSuggestions } from "./mapboxService.js";

/**
 * Geocode a single address (for final address confirmation)
 * Tries Mapbox first, falls back to OpenCage
 */
const geocodeAddress = async (address) => {
  // Try Mapbox first (better for Lagos)
  try {
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    if (mapboxToken) {
      const result = await geocodeMapboxAddress(address);
      if (result) {
        console.log("[GEOCODING] ✅ Used Mapbox for geocoding");
        return result;
      }
    }
  } catch (error) {
    console.warn("[GEOCODING] Mapbox failed, trying OpenCage:", error.message);
  }

  // Fallback to OpenCage
  const apiKey = process.env.OPENCAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Neither MAPBOX_ACCESS_TOKEN nor OPENCAGE_API_KEY configured"
    );
  }

  // Enhanced parameters for Nigeria
  const countrycode = process.env.OPENCAGE_COUNTRY_CODE || "ng";
  const limit = 1; // Just get the first result

  // Enhance query with Lagos if not already included (same as suggestions)
  let enhancedAddress = address.trim();
  if (
    !enhancedAddress.toLowerCase().includes("lagos") &&
    !enhancedAddress.toLowerCase().includes("nigeria")
  ) {
    enhancedAddress = `${enhancedAddress}, Lagos, Nigeria`;
  }

  const encodedAddress = encodeURIComponent(enhancedAddress);
  // Remove bounds - let OpenCage find it with countrycode and "Lagos, Nigeria" in query
  // Bounds were too restrictive and causing 0 results
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodedAddress}&key=${apiKey}&countrycode=${countrycode}&limit=${limit}&no_annotations=1&no_dedupe=1`;

  console.log("[GEOCODING] Geocoding address:", {
    original: address.substring(0, 30),
    enhanced: enhancedAddress.substring(0, 50),
  });

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log("[GEOCODING] Geocode response:", {
      statusCode: data.status?.code,
      statusMessage: data.status?.message,
      resultsCount: data.results?.length || 0,
    });

    if (data.status.code !== 200) {
      console.error("[GEOCODING] OpenCage API error:", data.status.message);
      throw new Error(
        `OpenCage API error: ${data.status.message || "Unknown error"}`
      );
    }

    if (!data.results || data.results.length === 0) {
      console.warn(
        "[GEOCODING] No results found for:",
        address.substring(0, 30)
      );
      return null;
    }

    // Just use the first result - bounds already ensure it's in Lagos
    const result = data.results[0];
    const { lat, lng } = result.geometry;

    console.log("[GEOCODING] Geocoded successfully:", {
      address: address.substring(0, 30),
      lat,
      lng,
      formatted: result.formatted,
    });

    return {
      lat: Number(lat),
      lng: Number(lng),
      formatted: result.formatted,
      confidence: result.confidence || 0,
      components: result.components || {},
    };
  } catch (error) {
    console.error("[GEOCODING] Error geocoding address:", {
      message: error.message,
      address: address.substring(0, 30),
    });
    throw error;
  }
};

/**
 * Get address suggestions/autocomplete
 * Returns multiple suggestions for user to choose from
 * Tries Mapbox first, falls back to OpenCage
 */
const getAddressSuggestions = async (query, limit = 5) => {
  if (!query || query.trim().length < 3) {
    return [];
  }

  // Try Mapbox first (better for Lagos)
  console.log("[GEOCODING] 🔍 Fetching address suggestions:", {
    query: query.substring(0, 30),
    limit,
  });

  try {
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    if (mapboxToken) {
      const suggestions = await getMapboxSuggestions(query, limit);
      if (suggestions.length > 0) {
        console.log(
          "[GEOCODING] ✅ Used Mapbox for suggestions:",
          suggestions.length,
          "results"
        );
        return suggestions;
      } else {
        console.log(
          "[GEOCODING] ⚠️ Mapbox returned 0 results, trying OpenCage"
        );
      }
    } else {
      console.log("[GEOCODING] ⚠️ No Mapbox token, using OpenCage");
    }
  } catch (error) {
    console.warn("[GEOCODING] Mapbox failed, trying OpenCage:", error.message);
  }

  // Fallback to OpenCage
  const apiKey = process.env.OPENCAGE_API_KEY;
  if (!apiKey) {
    console.warn("[GEOCODING] No API keys configured, returning empty");
    return [];
  }

  const countrycode = process.env.OPENCAGE_COUNTRY_CODE || "ng";
  // Lagos bounds: South-West (6.3930, 2.6917) to North-East (6.6730, 4.3510)
  const bounds = "6.3930,2.6917,6.6730,4.3510";

  // Enhance query with Lagos if not already included (helps with matching)
  let enhancedQuery = query.trim();
  if (
    !enhancedQuery.toLowerCase().includes("lagos") &&
    !enhancedQuery.toLowerCase().includes("nigeria")
  ) {
    enhancedQuery = `${enhancedQuery}, Lagos, Nigeria`;
  }

  const encodedQuery = encodeURIComponent(enhancedQuery);

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodedQuery}&key=${apiKey}&countrycode=${countrycode}&bounds=${bounds}&limit=${limit}&no_annotations=1&no_dedupe=1`;

  console.log("[GEOCODING] Fetching suggestions:", {
    query: query.substring(0, 30),
    url: url.replace(apiKey, "***"),
  });

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log("[GEOCODING] OpenCage response:", {
      statusCode: data.status?.code,
      statusMessage: data.status?.message,
      resultsCount: data.results?.length || 0,
      rateLimit: data.rate,
    });

    if (data.status.code !== 200) {
      console.warn(
        `[GEOCODING] Autocomplete API error: ${
          data.status.message || "Unknown error"
        }`
      );
      return [];
    }

    if (!data.results || data.results.length === 0) {
      console.warn(
        "[GEOCODING] No results returned for query:",
        query.substring(0, 30)
      );
      return [];
    }

    // Map results to suggestions
    return data.results.map((result) => {
      const { lat, lng } = result.geometry;
      const components = result.components || {};

      // Build a readable address
      const parts = [];
      if (components.road) parts.push(components.road);
      if (components.suburb || components.neighbourhood) {
        parts.push(components.suburb || components.neighbourhood);
      }
      if (components.city || components.town) {
        parts.push(components.city || components.town);
      }
      if (components.state) parts.push(components.state);

      const displayAddress =
        parts.length > 0 ? parts.join(", ") : result.formatted;

      return {
        address: result.formatted,
        displayAddress: displayAddress,
        lat: Number(lat),
        lng: Number(lng),
        confidence: result.confidence || 0,
        components: components,
      };
    });
  } catch (error) {
    console.error("[GEOCODING] Error getting suggestions:", error.message);
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
