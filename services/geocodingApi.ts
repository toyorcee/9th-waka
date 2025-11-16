import { apiClient } from "./apiClient";

export interface AddressSuggestion {
  address: string;
  displayAddress: string;
  lat: number;
  lng: number;
  confidence: number;
  components: {
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formatted: string;
  confidence: number;
  components: Record<string, any>;
}

/**
 * Get address suggestions/autocomplete
 * Calls backend API which uses Mapbox (secure - token on server)
 */
export async function getAddressSuggestions(
  query: string,
  limit: number = 5
): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });
  const response = await apiClient.get(
    `/geocoding/suggestions?${params.toString()}`
  );
  return response.data?.suggestions || [];
}

/**
 * Geocode a single address
 * Calls backend API which uses Mapbox (secure - token on server)
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const response = await apiClient.post("/geocoding/geocode", { address });
  return response.data?.location;
}

/**
 * Calculate distance between two addresses or coordinates
 * Returns distance and duration (if available from Mapbox)
 */
export async function calculateAddressDistance(data: {
  address1?: string;
  address2?: string;
  lat1?: number;
  lng1?: number;
  lat2?: number;
  lng2?: number;
}): Promise<{
  distance: number;
  distanceKm: number;
  duration?: number | null; // in seconds
  durationMinutes?: number | null;
  coordinates: any;
}> {
  const response = await apiClient.post("/geocoding/distance", data);
  return response.data;
}
