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
