/**
 * Geocoding service using OpenCage Data API
 * Docs: https://opencagedata.com/api
 */

const geocodeAddress = async (address) => {
  const apiKey = process.env.OPENCAGE_API_KEY;
  if (!apiKey) {
    throw new Error("OPENCAGE_API_KEY not configured");
  }

  // Restrict to Nigeria for better results
  const countrycode = process.env.OPENCAGE_COUNTRY_CODE || "ng";
  const limit = 1;

  const encodedAddress = encodeURIComponent(address);
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodedAddress}&key=${apiKey}&countrycode=${countrycode}&limit=${limit}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status.code !== 200) {
      throw new Error(
        `OpenCage API error: ${data.status.message || "Unknown error"}`
      );
    }

    if (!data.results || data.results.length === 0) {
      return null; // Address not found
    }

    const result = data.results[0];
    const { lat, lng } = result.geometry;

    return {
      lat: Number(lat),
      lng: Number(lng),
      formatted: result.formatted, // Full formatted address from OpenCage
      confidence: result.confidence || 0,
    };
  } catch (error) {
    console.error("[GEOCODING] Error geocoding address:", error.message);
    throw error;
  }
};

export { geocodeAddress };
