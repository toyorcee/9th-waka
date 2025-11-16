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
    paymentDueDate: string | Date;
    graceDeadline: string | Date;
    isPaymentDue: boolean;
    isOverdue: boolean;
    isInGracePeriod: boolean;
    daysUntilDue: number;
    daysUntilGraceDeadline: number;
  };
  allTime: {
    totals: {
      gross: number;
      commission: number;
      riderNet: number;
      count: number;
    };
  };
  paymentStatus: {
    isBlocked: boolean;
    blockedAt: string | Date | null;
    blockedReason: string | null;
    strikes: number;
    strikeHistory: Array<{
      strikeNumber: number;
      reason: string;
      weekStart: string | Date;
      weekEnd: string | Date;
      commissionAmount: number;
      issuedAt: string | Date;
    }>;
    accountDeactivated: boolean;
    accountDeactivatedAt: string | Date | null;
    accountDeactivatedReason: string | null;
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

/**
 * Mark payout as paid (with optional payment proof screenshot)
 */
export async function markPayoutPaid(
  payoutId: string,
  paymentProofUri?: string
): Promise<{ success: boolean; payout: any }> {
  const formData = new FormData();

  // Add payment proof screenshot if provided
  if (paymentProofUri) {
    const filename = paymentProofUri.split("/").pop() || "payment-proof.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("paymentProof", {
      uri: paymentProofUri,
      name: filename,
      type,
    } as any);
  }

  const response = await apiClient.patch(
    `/payouts/${payoutId}/mark-paid`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
}

/**
 * Get payment history (all payouts for the rider)
 */
export interface PayoutHistoryItem {
  _id: string;
  weekStart: string | Date;
  weekEnd: string | Date;
  totals: {
    gross: number;
    commission: number;
    riderNet: number;
    count: number;
  };
  status: "pending" | "paid";
  paidAt: string | Date | null;
  markedPaidBy: "rider" | "admin" | null;
  paymentProofScreenshot: string | null;
  createdAt: string | Date;
}

export async function getPaymentHistory(): Promise<{
  success: boolean;
  payouts: PayoutHistoryItem[];
}> {
  const response = await apiClient.get("/payouts");
  return response.data;
}
