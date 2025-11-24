import { apiClient } from "./apiClient";

export interface AdminStats {
  orders: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
    today: number;
  };
  riders: {
    total: number;
    online: number;
    blocked: number;
    verified: number;
  };
  customers: {
    total: number;
  };
  revenue: {
    today: number;
  };
  payouts: {
    pending: number;
    overdue: number;
  };
}

export interface AdminOrder {
  _id: string;
  customerId:
    | {
        _id: string;
        fullName: string;
        email: string;
        phoneNumber?: string;
      }
    | string;
  riderId?:
    | {
        _id: string;
        fullName: string;
        email: string;
        phoneNumber?: string;
        vehicleType?: string;
      }
    | string
    | null;
  pickup: { address: string; lat?: number; lng?: number };
  dropoff: { address: string; lat?: number; lng?: number };
  items: string;
  price: number;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AdminRider {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  vehicleType?: string;
  driverLicenseVerified: boolean;
  paymentBlocked: boolean;
  paymentBlockedAt?: string | Date;
  strikes: number;
  accountDeactivated: boolean;
  averageRating: number;
  totalRatings: number;
  searchRadiusKm: number;
  online: boolean;
  currentWeekEarnings?: {
    earnings: number;
    status: string;
  } | null;
  createdAt: string | Date;
}

export interface AdminCustomer {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  defaultAddress?: {
    address: string;
    lat?: number;
    lng?: number;
  };
  accountDeactivated: boolean;
  stats: {
    totalOrders: number;
    totalSpent: number;
    completedOrders: number;
  };
  createdAt: string | Date;
}

export interface PaginationResponse<T> {
  success: boolean;
  [key: string]: T[] | any;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  const response = await apiClient.get<{ success: true; stats: AdminStats }>(
    "/admin/stats"
  );
  return response.data.stats;
}

/**
 * Get all orders (admin only)
 */
export async function getAllOrders(
  page: number = 1,
  limit: number = 20,
  search?: string,
  status?: string
): Promise<PaginationResponse<AdminOrder>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.append("search", search);
  if (status) params.append("status", status);

  const response = await apiClient.get<PaginationResponse<AdminOrder>>(
    `/admin/orders?${params.toString()}`
  );
  return response.data;
}

/**
 * Get all riders (admin only)
 */
export async function getAllRiders(
  page: number = 1,
  limit: number = 20,
  search?: string,
  online?: boolean,
  blocked?: boolean,
  verified?: boolean
): Promise<PaginationResponse<AdminRider>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.append("search", search);
  if (online !== undefined) params.append("online", String(online));
  if (blocked !== undefined) params.append("blocked", String(blocked));
  if (verified !== undefined) params.append("verified", String(verified));

  const response = await apiClient.get<PaginationResponse<AdminRider>>(
    `/admin/riders?${params.toString()}`
  );
  return response.data;
}

/**
 * Get all customers (admin only)
 */
export async function getAllCustomers(
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<PaginationResponse<AdminCustomer>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.append("search", search);

  const response = await apiClient.get<PaginationResponse<AdminCustomer>>(
    `/admin/customers?${params.toString()}`
  );
  return response.data;
}

/**
 * Admin: Cancel any order
 */
export async function adminCancelOrder(orderId: string): Promise<AdminOrder> {
  const response = await apiClient.patch<{ success: true; order: AdminOrder }>(
    `/admin/orders/${orderId}/cancel`
  );
  return response.data.order;
}

export interface AdminPayout {
  _id: string;
  riderId:
    | {
        _id: string;
        fullName: string;
        email: string;
      }
    | string;
  weekStart: string | Date;
  weekEnd: string | Date;
  totals: {
    gross: number;
    commission: number;
    riderNet: number;
    count: number;
  };
  status: "pending" | "paid";
  paidAt?: string | Date | null;
  paymentProof?: string | null;
  createdAt: string | Date;
}

export interface BlockedRider {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  paymentBlocked: boolean;
  paymentBlockedAt?: string | Date;
  paymentBlockedReason?: string;
  strikes: number;
  currentWeekPayout?: {
    commission: number;
    status: string;
  } | null;
}

/**
 * Get all payouts (admin only - can see all, riders see only their own)
 */
export async function getAllPayouts(
  riderId?: string,
  status?: "pending" | "paid",
  weekStart?: string
): Promise<{ success: boolean; payouts: AdminPayout[] }> {
  const params = new URLSearchParams();
  if (riderId) params.append("riderId", riderId);
  if (status) params.append("status", status);
  if (weekStart) params.append("weekStart", weekStart);

  const response = await apiClient.get<{
    success: boolean;
    payouts: AdminPayout[];
  }>(`/payouts?${params.toString()}`);
  return response.data;
}

/**
 * Get all blocked riders (admin only)
 */
export async function getBlockedRiders(): Promise<{
  success: boolean;
  riders: BlockedRider[];
}> {
  const response = await apiClient.get<{
    success: boolean;
    riders: BlockedRider[];
  }>("/payouts/admin/riders/blocked");
  return response.data;
}

export interface SystemSettings {
  pricing: {
    minFare: number;
    perKmShort: number;
    perKmMedium: number;
    perKmLong: number;
    shortDistanceMax: number;
    mediumDistanceMax: number;
    vehicleMultipliers: {
      bicycle: number;
      motorbike: number;
      tricycle: number;
      car: number;
      van: number;
    };
  };
  commissionRate: number;
  system: {
    useDatabaseRates: boolean;
  };
}

/**
 * Get system settings (admin only)
 */
export async function getSettings(): Promise<{
  success: boolean;
  settings: SystemSettings;
}> {
  const response = await apiClient.get<{
    success: boolean;
    settings: SystemSettings;
  }>("/admin/settings");
  return response.data;
}

/**
 * Update system settings (admin only)
 */
export async function updateSettings(
  settings: Partial<SystemSettings>
): Promise<{
  success: boolean;
  settings: SystemSettings;
  message: string;
}> {
  const response = await apiClient.put<{
    success: boolean;
    settings: SystemSettings;
    message: string;
  }>("/admin/settings", settings);
  return response.data;
}
