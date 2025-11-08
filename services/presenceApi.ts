import { apiClient } from "./apiClient";

export interface UserPresence {
  userId: string;
  online: boolean;
  lastSeen: string | Date;
}

/**
 * Get user presence (online/offline and last seen)
 */
export async function getUserPresence(userId: string): Promise<UserPresence> {
  const response = await apiClient.get(`/presence/${userId}`);
  return response.data?.presence || response.data;
}
