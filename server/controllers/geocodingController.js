import {
  calculateDistance,
  geocodeAddress,
  getAddressSuggestions,
} from "../services/geocodingService.js";

/**
 * Get address suggestions/autocomplete
 * GET /geocoding/suggestions?q=address
 */
export const getSuggestions = async (req, res) => {
  try {
    const query = req.query.q?.toString().trim() || "";
    const limit = Math.min(10, Math.max(1, Number(req.query.limit || 5)));

    if (query.length < 3) {
      return res.json({
        success: true,
        suggestions: [],
      });
    }

    const suggestions = await getAddressSuggestions(query, limit);

    res.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error("[GEOCODING] Error getting suggestions:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get suggestions",
      suggestions: [],
    });
  }
};

/**
 * Geocode a single address
 * POST /geocoding/geocode
 */
export const geocodeSingleAddress = async (req, res) => {
  try {
    const { address } = req.body || {};

    if (!address || !address.trim()) {
      return res.status(400).json({
        success: false,
        error: "Address is required",
      });
    }

    const result = await geocodeAddress(address.trim());

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Address not found",
      });
    }

    res.json({
      success: true,
      location: result,
    });
  } catch (error) {
    console.error("[GEOCODING] Error geocoding address:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to geocode address",
    });
  }
};

/**
 * Calculate distance between two addresses
 * POST /geocoding/distance
 */
export const calculateAddressDistance = async (req, res) => {
  try {
    const { address1, address2, lat1, lng1, lat2, lng2 } = req.body || {};

    let coord1 = { lat: lat1, lng: lng1 };
    let coord2 = { lat: lat2, lng: lng2 };

    // Geocode addresses if coordinates not provided
    if ((!coord1.lat || !coord1.lng) && address1) {
      const geo1 = await geocodeAddress(address1);
      if (geo1) {
        coord1 = { lat: geo1.lat, lng: geo1.lng };
      } else {
        return res.status(404).json({
          success: false,
          error: "First address not found",
        });
      }
    }

    if ((!coord2.lat || !coord2.lng) && address2) {
      const geo2 = await geocodeAddress(address2);
      if (geo2) {
        coord2 = { lat: geo2.lat, lng: geo2.lng };
      } else {
        return res.status(404).json({
          success: false,
          error: "Second address not found",
        });
      }
    }

    if (!coord1.lat || !coord1.lng || !coord2.lat || !coord2.lng) {
      return res.status(400).json({
        success: false,
        error: "Valid coordinates or addresses required",
      });
    }

    const distance = calculateDistance(
      coord1.lat,
      coord1.lng,
      coord2.lat,
      coord2.lng
    );

    res.json({
      success: true,
      distance: distance,
      distanceKm: distance,
      coordinates: {
        from: coord1,
        to: coord2,
      },
    });
  } catch (error) {
    console.error("[GEOCODING] Error calculating distance:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to calculate distance",
    });
  }
};
