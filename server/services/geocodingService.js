/**
 * Geocoding service using OpenCage Data API
 * Docs: https://opencagedata.com/api
 * Enhanced for Nigeria with better precision
 */

/**
 * Geocode a single address (for final address confirmation)
 */
const geocodeAddress = async (address) => {
  const apiKey = process.env.OPENCAGE_API_KEY;
  if (!apiKey) {
    throw new Error("OPENCAGE_API_KEY not configured");
  }

  // Enhanced parameters for Nigeria
  const countrycode = process.env.OPENCAGE_COUNTRY_CODE || "ng";
  const limit = 1;
  const minConfidence = 5;

  let enhancedAddress = address.trim();
  if (
    !enhancedAddress.toLowerCase().includes("nigeria") &&
    !enhancedAddress.toLowerCase().includes("lagos")
  ) {
    enhancedAddress = `${address}, Lagos, Nigeria`;
  }

  const encodedAddress = encodeURIComponent(enhancedAddress);
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodedAddress}&key=${apiKey}&countrycode=${countrycode}&limit=${limit}&min_confidence=${minConfidence}&no_annotations=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status.code !== 200) {
      throw new Error(
        `OpenCage API error: ${data.status.message || "Unknown error"}`
      );
    }

    if (!data.results || data.results.length === 0) {
      return null; 
    }

    const result = data.results[0];
    const { lat, lng } = result.geometry;
    const confidence = result.confidence || 0;

    if (confidence < minConfidence) {
      console.warn(
        `[GEOCODING] Low confidence (${confidence}) for address: ${address}`
      );
    }

    return {
      lat: Number(lat),
      lng: Number(lng),
      formatted: result.formatted,
      confidence: confidence,
      components: result.components || {}, 
    };
  } catch (error) {
    console.error("[GEOCODING] Error geocoding address:", error.message);
    throw error;
  }
};

/**
 * Get address suggestions/autocomplete
 * Returns multiple suggestions for user to choose from
 */
const getAddressSuggestions = async (query, limit = 5) => {
  const apiKey = process.env.OPENCAGE_API_KEY;
  if (!apiKey) {
    throw new Error("OPENCAGE_API_KEY not configured");
  }

  if (!query || query.trim().length < 3) {
    return [];
  }

  const countrycode = process.env.OPENCAGE_COUNTRY_CODE || "ng";
  const encodedQuery = encodeURIComponent(query.trim());

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodedQuery}&key=${apiKey}&countrycode=${countrycode}&limit=${limit}&no_annotations=1&no_dedupe=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status.code !== 200) {
      console.warn(
        `[GEOCODING] Autocomplete API error: ${
          data.status.message || "Unknown error"
        }`
      );
      return [];
    }

    if (!data.results || data.results.length === 0) {
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
