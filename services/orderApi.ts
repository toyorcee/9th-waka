import { apiClient } from "./apiClient";

export interface Order {
  _id: string;
  id?: string;
  customerId: string;
  riderId?: string | null;
  pickup: { address: string; lat?: number; lng?: number };
  dropoff: { address: string; lat?: number; lng?: number };
  items: string;
  price: number; 
  originalPrice?: number; 
  riderRequestedPrice?: number | null; 
  priceNegotiation?: {
    status: "none" | "requested" | "accepted" | "rejected";
    requestedAt?: string | Date | null;
    reason?: string | null;
    respondedAt?: string | Date | null;
  };
  status: string;
  timeline: Array<{ status: string; note?: string; at: string | Date }>;
  delivery?: {
    photoUrl?: string;
    recipientName?: string;
    otpCode?: string;
    otpExpiresAt?: string | Date;
    otpVerifiedAt?: string | Date;
    deliveredAt?: string | Date;
  };
  financial?: {
    grossAmount: number;
    commissionRatePct: number;
    commissionAmount: number;
    riderNetAmount: number;
  };
  distanceKm?: number; // Added by backend for available orders
  createdAt: string | Date;
  updatedAt: string | Date;
}

export async function getAvailableOrders(): Promise<Order[]> {
  const response = await apiClient.get("/orders/available");
  return response.data?.orders || [];
}

export async function getMyOrders(): Promise<Order[]> {
  const response = await apiClient.get("/orders/mine");
  return response.data?.orders || [];
}

export async function getOrder(id: string): Promise<Order> {
  const response = await apiClient.get(`/orders/${id}`);
  return response.data?.order || response.data;
}

export async function acceptOrder(id: string): Promise<Order> {
  const response = await apiClient.patch(`/orders/${id}/accept`);
  return response.data?.order || response.data;
}

export async function updateOrderStatus(
  id: string,
  action: "pickup" | "start" | "deliver" | "cancel"
): Promise<Order> {
  const response = await apiClient.patch(`/orders/${id}/status`, { action });
  return response.data?.order || response.data;
}

export async function generateDeliveryOtp(id: string): Promise<{
  otp: string;
  expiresAt: string | Date;
}> {
  const response = await apiClient.post(`/orders/${id}/delivery/otp`);
  return response.data;
}

export async function verifyDeliveryOtp(
  id: string,
  code: string
): Promise<Order> {
  const response = await apiClient.post(`/orders/${id}/delivery/verify`, {
    code,
  });
  return response.data?.order || response.data;
}

export async function updateDeliveryProof(
  id: string,
  data: {
    photoUrl?: string;
    recipientName?: string;
    recipientPhone?: string;
    note?: string;
  }
): Promise<Order> {
  const response = await apiClient.patch(`/orders/${id}/delivery`, data);
  return response.data?.order || response.data;
}

export async function requestPriceChange(
  id: string,
  requestedPrice: number,
  reason?: string
): Promise<Order> {
  const response = await apiClient.post(`/orders/${id}/price/request`, {
    requestedPrice,
    reason,
  });
  return response.data?.order || response.data;
}

export async function respondToPriceRequest(
  id: string,
  accept: boolean
): Promise<Order> {
  const response = await apiClient.post(`/orders/${id}/price/respond`, {
    accept,
  });
  return response.data?.order || response.data;
}
