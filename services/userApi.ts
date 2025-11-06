import { apiClient } from "./apiClient";

export interface NotificationPreferences {
  [key: string]: {
    inApp: boolean;
    push: boolean;
    email: boolean;
  };
}

/**
 * Update user profile (name, phone, vehicleType for riders, KYC fields)
 */
export async function updateProfile(data: {
  fullName?: string;
  phoneNumber?: string;
  vehicleType?: "motorcycle" | "car" | null;
  // KYC fields
  nin?: string;
  bvn?: string;
  defaultAddress?: string;
  address?: string;
}) {
  const response = await apiClient.put("/user/profile", data);
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
