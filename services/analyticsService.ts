import { apiClient } from "./apiClient";

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

/**
 * Track an analytics event
 * @param event
 * @param properties
 */
export async function trackEvent(
  event: string,
  properties?: Record<string, any>
): Promise<void> {
  try {
    await apiClient.post("/analytics/track", {
      event,
      properties: properties || {},
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.warn(
      `[ANALYTICS] Failed to track event "${event}":`,
      error?.response?.data?.error || error?.message
    );
  }
}

/**
 * Track notification opened event
 */
export async function trackNotificationOpened(
  notificationId: string,
  notificationType: string,
  wasRead: boolean
): Promise<void> {
  await trackEvent("notification_opened", {
    notificationId,
    notificationType,
    wasRead,
  });
}

/**
 * Track mark all notifications as read event
 */
export async function trackMarkAllRead(unreadCount: number): Promise<void> {
  await trackEvent("notifications_mark_all_read", {
    unreadCount,
  });
}
