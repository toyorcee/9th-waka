import { apiClient } from "@/services/apiClient";

export interface NotificationItem {
  _id?: string;
  id?: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
}

export interface NotificationListResponse {
  success: boolean;
  items: NotificationItem[];
  total: number;
}

export async function fetchNotifications(skip = 0, limit = 50) {
  const res = await apiClient.get<NotificationListResponse>(`/notifications`, {
    params: { skip, limit },
  });
  return res.data;
}

export async function markNotificationRead(id: string) {
  const res = await apiClient.patch<{ success: boolean }>(
    `/notifications/${id}/read`
  );
  return res.data;
}
