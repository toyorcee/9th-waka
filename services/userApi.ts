import { apiClient } from "./apiClient";

export interface NotificationPreferences {
  [key: string]: {
    inApp: boolean;
    push: boolean;
    email: boolean;
  };
}

/**
 * Check if email is available (not taken by another user)
 */
export async function checkEmailAvailability(email: string): Promise<{
  success: boolean;
  available: boolean;
  valid: boolean;
  message: string;
}> {
  const response = await apiClient.get("/user/check-email", {
    params: { email },
  });
  return response.data;
}

/**
 * Update user profile (name, phone, email, vehicleType for riders, KYC fields)
 */
export async function updateProfile(data: {
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  vehicleType?: "motorcycle" | "car" | null;
  // KYC fields
  nin?: string;
  bvn?: string;
  defaultAddress?: string;
  address?: string;
  driverLicenseNumber?: string;
}) {
  const response = await apiClient.put("/user/profile", data);
  return response.data;
}

/**
 * Upload driver license picture
 */
export async function uploadDriverLicense(uri: string) {
  const formData = new FormData();

  // Extract filename from URI
  const filename = uri.split("/").pop() || "license.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("driverLicense", {
    uri,
    name: filename,
    type,
  } as any);

  const response = await apiClient.post("/user/driver-license", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

/**
 * Upload vehicle picture
 */
export async function uploadVehiclePicture(uri: string) {
  const formData = new FormData();

  // Extract filename from URI
  const filename = uri.split("/").pop() || "vehicle.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("vehiclePicture", {
    uri,
    name: filename,
    type,
  } as any);

  const response = await apiClient.post("/user/vehicle-picture", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

/**
 * Upload profile picture
 */
export async function uploadProfilePicture(uri: string) {
  const formData = new FormData();

  // Extract filename from URI
  const filename = uri.split("/").pop() || "profile.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("profilePicture", {
    uri,
    name: filename,
    type,
  } as any);

  const response = await apiClient.post("/user/profile-picture", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(): Promise<{
  success: boolean;
  preferences: NotificationPreferences;
}> {
  const response = await apiClient.get("/user/notification-preferences");
  return response.data;
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<{
  success: boolean;
  message: string;
  preferences: NotificationPreferences;
}> {
  const response = await apiClient.put("/user/notification-preferences", {
    preferences,
  });
  return response.data;
}

/**
 * Update search radius for riders (1-20km)
 */
export async function updateSearchRadius(
  searchRadiusKm: number
): Promise<{
  success: boolean;
  searchRadiusKm: number;
  message: string;
}> {
  const response = await apiClient.patch("/user/search-radius", {
    searchRadiusKm,
  });
  return response.data;
}

/**
 * Accept terms and conditions
 */
export async function acceptTerms(): Promise<{
  success: boolean;
  message: string;
  user: any;
}> {
  const response = await apiClient.post("/user/accept-terms");
  return response.data;
}