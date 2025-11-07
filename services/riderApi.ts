import { apiClient } from "./apiClient";

export interface TripEarning {
  orderId: string;
  deliveredAt: string | Date;
  pickup: string;
  dropoff: string;
  items: string;
  grossAmount: number;
  commissionAmount: number;
  riderNetAmount: number;
  price: number;
}

export interface EarningsData {
  currentWeek: {
    weekStart: string | Date;
    weekEnd: string | Date;
    totals: {
      gross: number;
      commission: number;
      riderNet: number;
      count: number;
    };
    trips: TripEarning[];
    payout: {
      id: string;
      status: "pending" | "paid";
      paidAt: string | Date | null;
    } | null;
  };
  allTime: {
    totals: {
      gross: number;
      commission: number;
      riderNet: number;
      count: number;
    };
  };
}

export async function updateRiderPresence(
  online: boolean,
  lat?: number,
  lng?: number
) {
  const body: any = { online };
  if (typeof lat === "number" && typeof lng === "number") {
    body.lat = lat;
    body.lng = lng;
  }
  const res = await apiClient.post("/riders/presence", body);
  return res.data;
}

export async function getRiderEarnings(): Promise<EarningsData> {
  const response = await apiClient.get("/riders/earnings");
  return response.data;
}

export interface RiderLocation {
  lat: number;
  lng: number;
  lastSeen: string | Date;
  online: boolean;
}

export async function getRiderLocationForOrder(
  orderId: string
): Promise<RiderLocation> {
  const response = await apiClient.get(`/riders/location/order/${orderId}`);
  return response.data?.location;
}

export interface ActiveRiderLocation {
  riderId: string;
  riderName: string;
  riderPhone: string | null;
  riderEmail: string | null;
  vehicleType: string | null;
  location: {
    lat: number;
    lng: number;
  };
  lastSeen: string | Date;
  online: boolean;
}

export async function getAllActiveRiderLocations(): Promise<
  ActiveRiderLocation[]
> {
  const response = await apiClient.get("/riders/locations/all");
  return response.data?.riders || [];
}

export interface ActiveOrdersCheck {
  hasActiveOrders: boolean;
  activeOrderCount: number;
  orders: Array<{ _id: string; status: string }>;
}

export async function checkActiveOrders(): Promise<ActiveOrdersCheck> {
  const response = await apiClient.get("/riders/active-orders");
  return response.data;
}

export interface LocationHistoryEntry {
  lat: number;
  lng: number;
  timestamp: string | Date;
  speed: number | null;
  heading: number | null;
}

export interface LocationHistory {
  orderId: string;
  history: LocationHistoryEntry[];
  count: number;
}

export async function getOrderLocationHistory(
  orderId: string
): Promise<LocationHistory> {
  const response = await apiClient.get(`/riders/location/history/${orderId}`);
  return response.data;
}
