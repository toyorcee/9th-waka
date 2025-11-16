import {
  geocodeAddress,
  getAddressSuggestions,
} from "../services/geocodingService.js";
import { calculateRoadDistance } from "../services/routingService.js";

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
      // Return 200 with success: false instead of 404
      // This allows frontend to handle gracefully
      return res.status(200).json({
        success: false,
        error: "Address not found",
        location: null,
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

    console.log("[GEOCODING] 📍 Distance calculation request:", {
      hasAddresses: !!(address1 || address2),
      hasCoords: !!(lat1 && lng1 && lat2 && lng2),
      coords1: lat1 && lng1 ? `(${lat1}, ${lng1})` : null,
      coords2: lat2 && lng2 ? `(${lat2}, ${lng2})` : null,
    });

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

    // Use routing service for accurate road distance (uses Mapbox if available)
    const distanceKm = await calculateRoadDistance(
      coord1.lat,
      coord1.lng,
      coord2.lat,
      coord2.lng
    );

    // Get duration from Mapbox if available
    let durationMinutes = null;
    try {
      const { calculateMapboxDistance } = await import(
        "../services/mapboxService.js"
      );
      const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
      if (mapboxToken) {
        const result = await calculateMapboxDistance(
          [coord1.lng, coord1.lat],
          [coord2.lng, coord2.lat]
        );
        if (result) {
          durationMinutes = result.durationMinutes;
        }
      }
    } catch (error) {
      // Ignore - duration is optional
    }

    const response = {
      success: true,
      distance: distanceKm * 1000, // in meters
      distanceKm: distanceKm,
      duration: durationMinutes ? durationMinutes * 60 : null, // in seconds
      durationMinutes: durationMinutes,
      coordinates: {
        from: coord1,
        to: coord2,
      },
    };

    console.log("[GEOCODING] ✅ Distance calculation result:", {
      distanceKm: distanceKm.toFixed(2),
      durationMinutes: durationMinutes ? durationMinutes.toFixed(1) : "N/A",
      from: `(${coord1.lat.toFixed(6)}, ${coord1.lng.toFixed(6)})`,
      to: `(${coord2.lat.toFixed(6)}, ${coord2.lng.toFixed(6)})`,
    });

    res.json(response);
  } catch (error) {
    console.error("[GEOCODING] Error calculating distance:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to calculate distance",
    });
  }
};
