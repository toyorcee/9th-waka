/**
 * Mapbox API Service
 * Handles geocoding and directions using Mapbox APIs
 * Token should be stored in server/.env as MAPBOX_ACCESS_TOKEN
 */

/**
 * Get address suggestions using Mapbox Geocoding API
 */
export const getMapboxSuggestions = async (query, limit = 5) => {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MAPBOX_ACCESS_TOKEN not configured in server/.env");
  }

  const encodedQuery = encodeURIComponent(query);
  const proximity = "3.3792,6.5244"; // Lagos center coordinates
  const country = "ng"; // Nigeria
  const types = "address,poi,neighborhood,locality";

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${accessToken}&limit=${limit}&country=${country}&proximity=${proximity}&types=${types}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return [];
    }

    return data.features.map((feature) => {
      const [lng, lat] = feature.center || feature.geometry.coordinates;
      const context = feature.context || [];

      // Extract address components
      const components = {};
      context.forEach((ctx) => {
        if (ctx.id.startsWith("place")) {
          components.city = ctx.text;
          components.town = ctx.text;
        } else if (ctx.id.startsWith("district")) {
          components.suburb = ctx.text;
          components.neighbourhood = ctx.text;
        } else if (ctx.id.startsWith("region")) {
          components.state = ctx.text;
        } else if (ctx.id.startsWith("country")) {
          components.country = ctx.text;
        } else if (ctx.id.startsWith("postcode")) {
          components.postcode = ctx.text;
        }
      });

      if (feature.properties.address) {
        components.road = feature.properties.address;
      }

      return {
        address: feature.place_name,
        displayAddress: feature.place_name,
        lat: Number(lat),
        lng: Number(lng),
        confidence: feature.relevance || 0.5,
        components,
      };
    });
  } catch (error) {
    console.error("[MAPBOX] Error fetching suggestions:", error);
    throw new Error(`Failed to fetch address suggestions: ${error.message}`);
  }
};

/**
 * Geocode a single address using Mapbox
 */
export const geocodeMapboxAddress = async (address) => {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MAPBOX_ACCESS_TOKEN not configured in server/.env");
  }

  const encodedAddress = encodeURIComponent(address);
  const proximity = "3.3792,6.5244"; // Lagos center
  const country = "ng";
  const limit = 1;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${accessToken}&limit=${limit}&country=${country}&proximity=${proximity}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];
    const [lng, lat] = feature.center || feature.geometry.coordinates;

    return {
      lat: Number(lat),
      lng: Number(lng),
      formatted: feature.place_name,
      confidence: feature.relevance || 0.5,
      components: feature.context || {},
    };
  } catch (error) {
    console.error("[MAPBOX] Error geocoding address:", error);
    throw new Error(`Failed to geocode address: ${error.message}`);
  }
};

/**
 * Get route/directions using Mapbox Directions API
 */
export const getMapboxRoute = async (coordinates, profile = "driving") => {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MAPBOX_ACCESS_TOKEN not configured in server/.env");
  }

  if (coordinates.length < 2) {
    throw new Error("At least 2 coordinates required for routing");
  }

  // Format coordinates as "lng,lat;lng,lat;..."
  const coordinatesStr = coordinates
    .map((coord) => `${coord[0]},${coord[1]}`)
    .join(";");

  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinatesStr}?access_token=${accessToken}&geometries=geojson&steps=false&overview=full`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== "Ok") {
      console.error("[MAPBOX DIRECTIONS] API error:", data.code, data.message);
      return null;
    }

    if (!data.routes || data.routes.length === 0) {
      console.warn("[MAPBOX DIRECTIONS] No routes found");
      return null;
    }

    const route = data.routes[0];
    return {
      distance: route.distance, // in meters
      duration: route.duration, // in seconds
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
      geometry: route.geometry,
    };
  } catch (error) {
    console.error("[MAPBOX DIRECTIONS] Error fetching route:", error);
    throw new Error(`Failed to fetch route: ${error.message}`);
  }
};

/**
 * Calculate distance and duration between two points
 */
export const calculateMapboxDistance = async (from, to) => {
  console.log("[MAPBOX] 🗺️ Calculating distance:", {
    from: `[${from[0]}, ${from[1]}]`,
    to: `[${to[0]}, ${to[1]}]`,
  });

  const route = await getMapboxRoute([from, to]);
  if (!route) {
    console.warn("[MAPBOX] ⚠️ No route found");
    return null;
  }

  console.log("[MAPBOX] ✅ Distance calculated:", {
    distance: `${route.distanceKm.toFixed(2)} km`,
    duration: `${route.durationMinutes.toFixed(1)} min`,
    distanceMeters: `${route.distance.toFixed(0)} m`,
    durationSeconds: `${route.duration.toFixed(0)} s`,
  });

  return {
    distance: route.distance,
    distanceKm: route.distanceKm,
    duration: route.duration,
    durationMinutes: route.durationMinutes,
  };
};
